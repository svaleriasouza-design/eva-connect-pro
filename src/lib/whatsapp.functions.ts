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

    const mime = data.mime.split(";")[0].toLowerCase();
    const allowed = ["audio/ogg", "audio/opus", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/aac", "audio/amr", "audio/webm"];
    if (!allowed.includes(mime)) {
      return { ok: false as const, error: `Formato de áudio não suportado pelo WhatsApp: ${mime}. Use OGG/Opus, MP3, M4A ou AAC.` };
    }

    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (!bin.length) return { ok: false as const, error: "Áudio vazio." };

    const ext = mime.includes("mpeg") || mime.includes("mp3") ? "mp3" : mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("webm") ? "webm" : "ogg";
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
