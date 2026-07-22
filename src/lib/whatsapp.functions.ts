import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const sendSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(6),
  body: z.string().min(1),
  cadenceDay: z.number().int().min(1).max(5).optional(),
});

export const sendWhatsappMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { sendWhatsappText, metaConfigured } = await import("./whatsapp.server");
    if (!metaConfigured()) {
      return {
        ok: false as const,
        error:
          "Meta Cloud API não configurada. Adicione META_WA_PHONE_NUMBER_ID e META_WA_ACCESS_TOKEN nas variáveis do backend.",
      };
    }
    const result = await sendWhatsappText(data.to, data.body);

    const now = new Date().toISOString();
    const { supabase } = context;

    await supabase.from("activities").insert({
      contact_id: data.contactId,
      kind: "whatsapp_out",
      title: data.cadenceDay ? `Mensagem Dia ${data.cadenceDay} enviada` : "Mensagem enviada",
      content: data.body,
      external_id: result.messageId ?? null,
      status: result.ok ? "SENT" : "FAILED",
      status_updated_at: now,
    });

    if (result.ok && data.cadenceDay) {
      await supabase
        .from("contacts")
        .update({
          cadence_day: data.cadenceDay,
          last_contact_at: now,
          cadence_active: data.cadenceDay < 5,
        })
        .eq("id", data.contactId);
    }

    return result.ok
      ? { ok: true as const, messageId: result.messageId }
      : { ok: false as const, error: result.error ?? "Falha no envio." };
  });

export const testMetaConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { loadMetaConfig } = await import("./whatsapp.server");
    const cfg = await loadMetaConfig();
    return {
      configured: Boolean(cfg.phoneNumberId && cfg.accessToken),
      hasPhoneNumberId: Boolean(cfg.phoneNumberId),
      hasAccessToken: Boolean(cfg.accessToken),
      hasVerifyToken: Boolean(cfg.verifyToken),
      hasAppSecret: Boolean(cfg.appSecret),
      graphVersion: cfg.graphVersion,
    };
  });