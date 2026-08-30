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
        // O verify token identifica o workspace dono do número na Meta.
        const { workspaceIdForVerifyToken } = await import("@/lib/workspace-scope.server");
        const { waNumberByVerifyToken } = await import("@/lib/wa-numbers.server");
        const envToken = process.env.META_WA_VERIFY_TOKEN || "";
        const wsMatch = token
          ? (await waNumberByVerifyToken(token))?.workspace_id ?? (await workspaceIdForVerifyToken(token))
          : null;
        const valid = Boolean(token) && (Boolean(wsMatch) || (envToken && token === envToken));
        if (mode === "subscribe" && valid && challenge) {
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

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("invalid json", { status: 400 });
        }

        // Isolamento: o número que recebeu a mensagem define o workspace.
        const { workspaceIdForPhoneNumberId, legacyWorkspaceId, wsDb } = await import(
          "@/lib/workspace-scope.server"
        );
        const { waNumberByPhoneNumberId } = await import("@/lib/wa-numbers.server");
        const phoneNumberId =
          payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? "";
        // O phone_number_id do metadata identifica EXATAMENTE qual número da EVA
        // recebeu a mensagem — nunca assumimos o número principal.
        const inboundNumber = await waNumberByPhoneNumberId(String(phoneNumberId));
        const inboundNumberId = inboundNumber?.id ?? null;
        const workspaceId =
          inboundNumber?.workspace_id ??
          (await workspaceIdForPhoneNumberId(String(phoneNumberId))) ??
          (await legacyWorkspaceId());
        if (!workspaceId) {
          console.warn("[webhook] nenhum workspace para phone_number_id", phoneNumberId);
          return new Response("ok", { status: 200 });
        }
        console.log(
          `[webhook] phone_number_id=${phoneNumberId} numero="${inboundNumber?.label ?? "legado"}" ws=${workspaceId}`,
        );

        const { verifyMetaSignature } = await import("@/lib/whatsapp.server");
        const okSig = await verifyMetaSignature(workspaceId, rawBody, signature, inboundNumberId);
        if (signature && !okSig) return new Response("invalid signature", { status: 401 });

        const supabaseAdmin = (await wsDb(workspaceId)) as any;
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
                // A Meta manda o motivo real em statuses[].errors — guardamos
                // para não ficar com FAILED sem código no banco.
                const errs = Array.isArray(s?.errors) ? s.errors : [];
                const errText = errs.length
                  ? errs
                      .map((e: any) =>
                        [
                          e?.title ?? e?.message ?? "erro Meta",
                          e?.code != null ? `code ${e.code}` : null,
                          e?.error_data?.details ? String(e.error_data.details) : null,
                        ]
                          .filter(Boolean)
                          .join(" · "),
                      )
                      .join(" | ")
                  : null;
                console.log(
                  `[webhook:status] ${externalId} -> ${status}${errText ? ` :: ${errText}` : ""}${errs.length ? ` raw=${JSON.stringify(errs).slice(0, 800)}` : ""}`,
                );
                await supabaseAdmin
                  .from("activities")
                  .update({
                    status,
                    status_updated_at: now,
                    ...(errText ? { error_message: errText } : {}),
                  })
                  .eq("external_id", externalId);
                await supabaseAdmin
                  .from("campaign_targets")
                  .update({ status })
                  .eq("external_id", externalId);

                // Falha confirmada depois do aceite: o dia da cadência NÃO foi
                // concluído — desfaz o avanço e devolve o contato à fila.
                if (status === "FAILED") {
                  const { revertCadenceDayForFailedStatus } = await import("@/lib/cadence-runner.server");
                  await revertCadenceDayForFailedStatus(supabaseAdmin, externalId);
                }

              }

              // 2) Mensagens recebidas => registra e retira da cadência
              const messages = value?.messages ?? [];
              for (const m of messages) {
                const fromRaw = String(m?.from ?? "");
                const from = normalizePhoneNumber(fromRaw);
                const humanText: string | undefined =
                  m?.text?.body ??
                  m?.button?.text ??
                  m?.interactive?.button_reply?.title ??
                  m?.interactive?.list_reply?.title;
                // Mensagens sem texto legível (unsupported, reações, stickers, sistema)
                // NÃO são resposta real: são registradas mas não movem o lead nem acionam a EVA.
                let text: string = humanText ?? `[${m?.type ?? "mensagem"}]`;
                let meaningful = Boolean(humanText && humanText.trim());
                const externalId = m?.id as string | undefined;

                // Mensagem de áudio/voz => transcreve antes de processar.
                let transcribed = false;
                const mediaId: string | undefined =
                  m?.audio?.id ?? m?.voice?.id ?? (m?.type === "audio" ? m?.audio?.id : undefined);
                if ((m?.type === "audio" || m?.type === "voice") && mediaId) {
                  try {
                    const { transcribeMetaAudio } = await import("@/lib/transcribe.server");
                    const tr = await transcribeMetaAudio(workspaceId, String(mediaId));
                    if (tr.ok && tr.text) {
                      text = tr.text;
                      transcribed = true;
                      meaningful = true;
                      debug.push(`audio_transcrito=${tr.text.length}`);
                    } else {
                      text = "[áudio recebido — não foi possível transcrever]";
                      debug.push(`audio_erro=${tr.error ?? "desconhecido"}`);
                      console.error("[webhook:audio] transcrição falhou", tr.error);
                    }
                  } catch (err) {
                    text = "[áudio recebido — não foi possível transcrever]";
                    debug.push(`audio_exception=${err instanceof Error ? err.message : String(err)}`);
                  }
                }
                console.log(`[webhook:in] from=${from} externalId=${externalId ?? "-"}`);

                let contact = (await findContactByPhone(workspaceId, from)) as
                  | { id: string; name: string; whatsapp: string | null; phone: string | null; cadence_active: boolean | null; cadence_day: number | null; funnel_stage?: string | null }
                  | null;

                // Se número desconhecido, cria contato automaticamente para aparecer no CRM/WhatsApp.
                if (!contact && from) {
                  const displayName = value?.contacts?.[0]?.profile?.name || `Contato novo · ${from}`;
                  const { data: created } = await supabaseAdmin
                    .from("contacts")
                    .insert({
                      name: displayName,
                      whatsapp: from,
                      phone: from,
                      funnel_stage: "novo_lead",
                      status: "ativo",
                      origin: "WhatsApp (entrada)",
                      last_contact_at: now,
                      whatsapp_number_id: inboundNumberId,
                    })
                    .select("id, name, whatsapp, phone, cadence_active, cadence_day")
                    .maybeSingle();
                  contact = (created as any) ?? undefined;
                  console.log(`[webhook:in] contato criado automaticamente id=${contact?.id ?? "-"}`);
                }

                await logInbound({
                  workspaceId,
                  contactId: contact?.id ?? null,
                  from,
                  text: transcribed ? `🎤 Áudio transcrito: ${text}` : text,
                  externalId,
                  whatsappNumberId: inboundNumberId,
                  ...(transcribed ? { title: "Áudio recebido (transcrito)" } : {}),
                  ...(meaningful ? {} : { status: "UNSUPPORTED", title: "Mensagem não suportada (ignorada)" }),
                });

                if (meaningful && contact?.id && contact.cadence_active) {
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

                // Roteador único: aguarda 8s, agrupa mensagens seguidas,
                // identifica robôs/URA, e então responde uma única vez.
                if (meaningful && contact?.id) {
                  try {
                    const { routeInbound } = await import("@/lib/inbound-router.server");
                    const status = await routeInbound({
                      workspaceId,
                      contactId: contact.id,
                      contactName: contact.name ?? "",
                      phone: from,
                      incomingText: text,
                      cadenceDay: contact.cadence_day ?? 1,
                      inboundActivityId: externalId,
                    });
                    debug.push(`route=${status}`);
                  } catch (err) {
                    console.error("[eva inbound] failed", err);
                    debug.push(`route_exception=${err instanceof Error ? err.message : String(err)}`);
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