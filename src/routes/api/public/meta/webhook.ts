import { createFileRoute } from "@tanstack/react-router";

// Webhook público para Meta Cloud API (WhatsApp).
// URL a colar no painel Meta:
//   https://<seu-dominio>/api/public/meta/webhook
// Verify token: valor de META_WA_VERIFY_TOKEN.

export const Route = createFileRoute("/api/public/meta/webhook")({
  server: {
    handlers: {
      // Handshake de verificação (Meta chama uma vez ao configurar).
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const { loadMetaConfig } = await import("@/lib/whatsapp.server");
        const cfg = await loadMetaConfig();
        const expected = cfg.verifyToken;
        if (mode === "subscribe" && expected && token === expected && challenge) {
          return new Response(challenge, {
            status: 200,
            headers: { "content-type": "text/plain" },
          });
        }
        return new Response("forbidden", { status: 403 });
      },

      // Eventos de status (sent/delivered/read/failed) e mensagens recebidas.
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        const { verifyMetaSignature, loadMetaConfig } = await import("@/lib/whatsapp.server");
        const cfg = await loadMetaConfig();
        if (cfg.appSecret) {
          const ok = await verifyMetaSignature(rawBody, signature);
          if (!ok) return new Response("invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { findContactByPhone, logInbound } = await import("@/lib/messaging.server");
        const { normalizePhoneNumber } = await import("@/lib/phone");
        const now = new Date().toISOString();
        console.log("[webhook] payload recebido");
        const debug: string[] = [];

        try {
          const entries = payload?.entry ?? [];
          for (const entry of entries) {
            const changes = entry?.changes ?? [];
            for (const change of changes) {
              const value = change?.value ?? {};

              // 1) Atualizações de status
              const statuses = value?.statuses ?? [];
              for (const s of statuses) {
                const externalId = s?.id as string | undefined;
                const status = String(s?.status ?? "").toUpperCase();
                if (!externalId || !status) continue;
                console.log(`[webhook:status] ${externalId} -> ${status}`);
                await supabaseAdmin
                  .from("activities")
                  .update({ status, status_updated_at: now })
                  .eq("external_id", externalId);
              }

              // 2) Mensagens recebidas => registra e retira da cadência
              const messages = value?.messages ?? [];
              for (const m of messages) {
                const fromRaw = String(m?.from ?? "");
                const from = normalizePhoneNumber(fromRaw);
                const text: string =
                  m?.text?.body ??
                  m?.button?.text ??
                  m?.interactive?.button_reply?.title ??
                  m?.interactive?.list_reply?.title ??
                  `[${m?.type ?? "mensagem"}]`;
                const externalId = m?.id as string | undefined;
                console.log(`[webhook:in] from=${from} externalId=${externalId ?? "-"}`);

                let contact = (await findContactByPhone(from)) as
                  | { id: string; name: string; whatsapp: string | null; phone: string | null; cadence_active: boolean | null; cadence_day: number | null; funnel_stage?: string | null }
                  | null;

                // Se número desconhecido, cria contato automaticamente para aparecer no CRM/WhatsApp.
                if (!contact && from) {
                  const displayName = value?.contacts?.[0]?.profile?.name || `WhatsApp ${from}`;
                  const { data: created } = await supabaseAdmin
                    .from("contacts")
                    .insert({
                      name: displayName,
                      whatsapp: from,
                      phone: from,
                      funnel_stage: "novo_lead",
                      status: "ativo",
                      last_contact_at: now,
                    })
                    .select("id, name, whatsapp, phone, cadence_active, cadence_day")
                    .maybeSingle();
                  contact = (created as any) ?? undefined;
                  console.log(`[webhook:in] contato criado automaticamente id=${contact?.id ?? "-"}`);
                }

                await logInbound({
                  contactId: contact?.id ?? null,
                  from,
                  text,
                  externalId,
                });

                if (contact?.id && contact.cadence_active) {
                  await supabaseAdmin
                    .from("contacts")
                    .update({ cadence_active: false })
                    .eq("id", contact.id);
                  await supabaseAdmin.from("activities").insert({
                    contact_id: contact.id,
                    kind: "cadence_stop",
                    title: "Saiu da cadência (respondeu)",
                    content: "Contato respondeu — cadência interrompida automaticamente.",
                  });
                  console.log(`[webhook:in] cadência interrompida contact=${contact.id}`);
                }

                // Resposta automática pela EVA — sempre que houver contato,
                // independentemente de a cadência estar ativa.
                if (contact?.id) {
                  try {
                    const { autoReplyToInbound } = await import("@/lib/cadence-runner.server");
                    const status = await autoReplyToInbound({
                      contactId: contact.id,
                      contactName: contact.name ?? "",
                      to: from,
                      incomingText: text,
                      currentDay: contact.cadence_day ?? 1,
                    });
                    debug.push(`autoreply=${status}`);
                  } catch (err) {
                    console.error("[eva auto-reply] failed", err);
                    debug.push(`autoreply_exception=${err instanceof Error ? err.message : String(err)}`);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error("[meta webhook] processing error", err);
          debug.push(`processing_error=${err instanceof Error ? err.message : String(err)}`);
          // Sempre retornamos 200 para a Meta não reenfileirar em loop.
        }

        if (request.headers.get("x-eva-debug") === "1") {
          return new Response(JSON.stringify({ ok: true, debug }), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
        }
        return new Response("ok", { status: 200 });
      },
    },
  },
});