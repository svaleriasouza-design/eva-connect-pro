import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saveSchema = z.object({
  phone_number_id: z.string().trim().max(64).optional().nullable(),
  access_token: z.string().trim().max(4096).optional().nullable(),
  app_secret: z.string().trim().max(512).optional().nullable(),
  verify_token: z.string().trim().max(256).optional().nullable(),
  graph_version: z.string().trim().max(16).optional().nullable(),
});

export const getMetaSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("meta_wa_settings" as any)
      .select("phone_number_id, access_token, app_secret, verify_token, graph_version, updated_at")
      .eq("id", true)
      .maybeSingle();
    const row = (data ?? {}) as any;
    return {
      phone_number_id: row.phone_number_id ?? "",
      access_token: row.access_token ?? "",
      app_secret: row.app_secret ?? "",
      verify_token: row.verify_token ?? "",
      graph_version: row.graph_version ?? "v21.0",
      updated_at: row.updated_at ?? null,
    };
  });

export const saveMetaSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data }) => {
    const payload = {
      id: true,
      phone_number_id: data.phone_number_id || null,
      access_token: data.access_token || null,
      app_secret: data.app_secret || null,
      verify_token: data.verify_token || null,
      graph_version: data.graph_version || "v21.0",
    };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("meta_wa_settings" as any)
      .upsert(payload, { onConflict: "id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const testMetaConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { loadMetaConfig } = await import("./whatsapp.server");
    const cfg = await loadMetaConfig();
    if (!cfg.phoneNumberId || !cfg.accessToken) {
      return { ok: false as const, error: "Preencha o ID do Número e o Token de Acesso antes de testar." };
    }
    try {
      const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
      const json = (await res.json()) as any;
      if (!res.ok || json.error) {
        return { ok: false as const, error: json?.error?.message || `HTTP ${res.status}` };
      }
      return {
        ok: true as const,
        phone: json.display_phone_number as string | undefined,
        name: json.verified_name as string | undefined,
        quality: json.quality_rating as string | undefined,
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });