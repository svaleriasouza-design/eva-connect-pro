import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(6),
  body: z.string().min(1),
  cadenceDay: z.number().int().min(1).max(5).optional(),
  tag: z.string().max(64).optional(),
  manual: z.boolean().optional(),
});

export const sendWhatsappMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { sendAndLog } = await import("./messaging.server");
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const sender =
      await displayNameFor(
        context.userId,
        ((context.claims as any)?.email as string | undefined) ?? "atendente",
      );
    const manualTitle = `Mensagem enviada por ${sender}`;
    const result = await sendAndLog({
      workspaceId,
      to: data.to,
      body: data.body,
      contactId: data.contactId,
      title: data.cadenceDay
        ? `Mensagem Dia ${data.cadenceDay} enviada`
        : data.manual
          ? manualTitle
          : "Mensagem enviada",
      tag: data.tag ?? (data.cadenceDay ? `cadence-day-${data.cadenceDay}` : data.manual ? "humano-manual" : "crm-manual"),
      sentBy: context.userId,
      sentByName: sender,
      sendMode: data.cadenceDay ? "cadencia" : "manual",
    });

    if (result.ok && data.cadenceDay) {
      const now = new Date().toISOString();
      await context.supabase
        .from("contacts")
        .update({
          cadence_day: data.cadenceDay,
          last_contact_at: now,
          cadence_active: data.cadenceDay < 5,
        })
        .eq("id", data.contactId);
    }

    // Envio manual = humano assumiu a conversa: automações param imediatamente.
    if (result.ok && !data.cadenceDay) {
      const { markHumanTakeover } = await import("./takeover.server");
      await markHumanTakeover({
        workspaceId,
        contactId: data.contactId,
        userId: context.userId,
        userName: sender,
        reason: `Mensagem manual enviada por ${sender}.`,
      });
    }

    return result.ok
      ? { ok: true as const, messageId: result.messageId }
      : { ok: false as const, error: result.error ?? "Falha no envio." };
  });

const takeoverSchema = z.object({
  contactId: z.string().uuid(),
  active: z.boolean(),
});

/** Liga/desliga a trava de atendimento humano para um contato. */
export const setHumanTakeoverFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => takeoverSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const sender = await displayNameFor(
      context.userId,
      ((context.claims as any)?.email as string | undefined) ?? "atendente",
    );
    const { markHumanTakeover, releaseHumanTakeover } = await import("./takeover.server");
    if (data.active) {
      await markHumanTakeover({
        workspaceId,
        contactId: data.contactId,
        userId: context.userId,
        userName: sender,
        reason: `${sender} assumiu o atendimento manualmente.`,
      });
    } else {
      await releaseHumanTakeover({
        workspaceId,
        contactId: data.contactId,
        userId: context.userId,
        userName: sender,
      });
    }
    return { ok: true as const, humanTakeover: data.active };
  });


export const testMetaConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadMetaConfig } = await import("./whatsapp.server");
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const cfg = await loadMetaConfig(await currentWorkspaceId(context.supabase));
    return {
      configured: Boolean(cfg.phoneNumberId && cfg.accessToken),
      hasPhoneNumberId: Boolean(cfg.phoneNumberId),
      hasAccessToken: Boolean(cfg.accessToken),
      hasVerifyToken: Boolean(cfg.verifyToken),
      hasAppSecret: Boolean(cfg.appSecret),
      graphVersion: cfg.graphVersion,
    };
  });
const audioSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(6),
  /** Áudio em base64 (sem prefixo data:). Máx ~10MB. */
  base64: z.string().min(32).max(20_000_000),
  mime: z.string().min(3).max(64),
  seconds: z.number().min(0).max(600).optional(),
});

/** Envia um áudio (gravado ou anexado) pelo atendimento humano. */
export const sendWhatsappAudioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => audioSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const sender = await displayNameFor(
      context.userId,
      ((context.claims as any)?.email as string | undefined) ?? "atendente",
    );

    const raw = data.mime.split(";")[0].toLowerCase();
    // WebM não é aceito pela Meta — o painel converte para Ogg/Opus antes de enviar.
    const mime =
      raw === "audio/opus" ? "audio/ogg" : raw === "audio/mp3" ? "audio/mpeg" : raw === "audio/x-m4a" ? "audio/mp4" : raw;
    const allowed = ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr"];
    if (!allowed.includes(mime)) {
      return {
        ok: false as const,
        error: `Formato de áudio não suportado pelo WhatsApp: ${raw}. Use OGG/Opus, MP3, M4A (AAC) ou AMR.`,
      };
    }

    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (!bin.length) return { ok: false as const, error: "Áudio vazio." };

    const ext = mime === "audio/mpeg" ? "mp3" : mime === "audio/mp4" || mime === "audio/aac" ? "m4a" : mime === "audio/amr" ? "amr" : "ogg";
    const path = `${workspaceId}/${data.contactId}/${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage
      .from("whatsapp-audio")
      .upload(path, bin, { contentType: mime, upsert: false });
    if (up.error) {
      return { ok: false as const, error: `Falha ao guardar o áudio: ${up.error.message}` };
    }

    // WhatsApp exige OGG/Opus, MP3, AAC, M4A ou AMR. WebM (gravação do Chrome)
    // é convertido no navegador antes de chegar aqui.
    const { sendAudioAndLog } = await import("./messaging.server");
    const result = await sendAudioAndLog({
      workspaceId,
      to: data.to,
      contactId: data.contactId,
      bytes: bin,
      mime,
      storagePath: path,
      seconds: data.seconds ?? null,
      title: `Áudio enviado por ${sender}`,
      tag: "humano-audio",
      sentBy: context.userId,
      sentByName: sender,
      sendMode: "manual",
    });

    if (result.ok) {
      const { markHumanTakeover } = await import("./takeover.server");
      await markHumanTakeover({
        workspaceId,
        contactId: data.contactId,
        userId: context.userId,
        userName: sender,
        reason: `Áudio enviado por ${sender}.`,
      });
    }

    return result.ok
      ? { ok: true as const, messageId: result.messageId, path }
      : { ok: false as const, error: result.error ?? "Falha no envio do áudio." };
  });

const mediaSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(6),
  base64: z.string().min(32).max(30_000_000),
  mime: z.string().min(3).max(64),
  name: z.string().max(200).optional(),
});

/** Envia uma imagem ou vídeo pelo atendimento humano. */
export const sendWhatsappMediaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => mediaSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const sender = await displayNameFor(
      context.userId,
      ((context.claims as any)?.email as string | undefined) ?? "atendente",
    );
    const mime = data.mime.split(";")[0].toLowerCase();
    const types: Record<string, { kind: "image" | "video"; ext: string }> = {
      "image/jpeg": { kind: "image", ext: "jpg" },
      "image/jpg": { kind: "image", ext: "jpg" },
      "image/png": { kind: "image", ext: "png" },
      "video/mp4": { kind: "video", ext: "mp4" },
      "video/3gpp": { kind: "video", ext: "3gp" },
    };
    const t = types[mime];
    if (!t) return { ok: false as const, error: "Formato não aceito. Use JPG, PNG, MP4 ou 3GP." };
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    const max = t.kind === "image" ? 10 : 20;
    if (bin.length > max * 1024 * 1024) return { ok: false as const, error: `Arquivo acima de ${max} MB.` };

    const path = `atendimento/${workspaceId}/${data.contactId}/${Date.now()}.${t.ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage.from("whatsapp-audio").upload(path, bin, { contentType: mime });
    if (up.error) return { ok: false as const, error: `Falha ao guardar o arquivo: ${up.error.message}` };
    const { data: signed } = await supabaseAdmin.storage.from("whatsapp-audio").createSignedUrl(path, 86400);
    if (!signed?.signedUrl) return { ok: false as const, error: "Falha ao preparar o arquivo." };

    const db = supabaseAdmin as any;
    const { data: c } = await db
      .from("contacts").select("whatsapp_number_id").eq("id", data.contactId).eq("workspace_id", workspaceId).maybeSingle();
    if (!c) return { ok: false as const, error: "Contato não encontrado." };
    const { resolveSendNumber } = await import("./wa-numbers.server");
    const numberId = (await resolveSendNumber(workspaceId, c.whatsapp_number_id ?? null))?.id ?? null;
    const { normalizePhoneNumber } = await import("./phone");
    const { sendWhatsappMediaLink } = await import("./whatsapp.server");
    const send = await sendWhatsappMediaLink(workspaceId, normalizePhoneNumber(data.to), t.kind, signed.signedUrl, numberId);

    const now = new Date().toISOString();
    const label = t.kind === "image" ? "imagem" : "vídeo";
    await db.from("activities").insert({
      workspace_id: workspaceId,
      contact_id: data.contactId,
      kind: "whatsapp_out",
      title: `Mensagem enviada por ${sender} (${label})`,
      content: `[${t.kind === "image" ? "imagem" : "video"}] ${data.name ?? path.split("/").pop()}`,
      external_id: send.messageId ?? null,
      status: send.ok ? "SENT" : "FAILED",
      status_updated_at: now,
      error_message: send.ok ? null : send.error ?? "Falha no envio",
      sent_by: context.userId,
      sent_by_name: sender,
      send_mode: "manual",
      whatsapp_number_id: numberId,
    });
    if (send.ok) {
      await db.from("contacts").update({ last_contact_at: now }).eq("id", data.contactId).eq("workspace_id", workspaceId);
      const { markHumanTakeover } = await import("./takeover.server");
      await markHumanTakeover({ workspaceId, contactId: data.contactId, userId: context.userId, userName: sender, reason: `${label} enviada por ${sender}.` });
    }
    return send.ok
      ? { ok: true as const }
      : { ok: false as const, error: send.error ?? "Falha no envio." };
  });
