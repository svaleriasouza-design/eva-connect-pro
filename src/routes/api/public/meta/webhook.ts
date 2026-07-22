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
        const now = new Date().toISOString();

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
                await supabaseAdmin
                  .from("activities")
                  .update({ status, status_updated_at: now })
                  .eq("external_id", externalId);
              }

              // 2) Mensagens recebidas => registra e retira da cadência
              const messages = value?.messages ?? [];
              for (const m of messages) {
                const fromRaw = String(m?.from ?? "");
                const from = fromRaw.replace(/\D/g, "");
                const text: string =
                  m?.text?.body ??
                  m?.button?.text ??
                  m?.interactive?.button_reply?.title ??
                  m?.interactive?.list_reply?.title ??
                  `[${m?.type ?? "mensagem"}]`;
                const externalId = m?.id as string | undefined;

                // Localiza o contato pelo telefone (últimos 10-13 dígitos).
                const last10 = from.slice(-10);
                const { data: contacts } = await supabaseAdmin
                  .from("contacts")
                  .select("id, whatsapp, phone, cadence_active")
                  .or(`whatsapp.ilike.%${last10},phone.ilike.%${last10}`)
                  .limit(1);
                const contact = contacts?.[0];

                await supabaseAdmin.from("activities").insert({
                  contact_id: contact?.id ?? null,
                  kind: "whatsapp_in",
                  title: contact ? "Resposta recebida" : `Mensagem de ${from}`,
                  content: text,
                  external_id: externalId ?? null,
                  status: "RECEIVED",
                  status_updated_at: now,
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
                }
              }
            }
          }
        } catch (err) {
          console.error("[meta webhook] processing error", err);
          // Sempre retornamos 200 para a Meta não reenfileirar em loop.
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});