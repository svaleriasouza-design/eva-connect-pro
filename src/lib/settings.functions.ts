import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

const saveSchema = z.object({
  phone_number_id: z.string().trim().max(64).optional().nullable(),
  access_token: z.string().trim().max(4096).optional().nullable(),
  app_secret: z.string().trim().max(512).optional().nullable(),
  verify_token: z.string().trim().max(256).optional().nullable(),
  graph_version: z.string().trim().max(16).optional().nullable(),
  default_template_name: z.string().trim().max(128).optional().nullable(),
  default_template_lang: z.string().trim().max(16).optional().nullable(),
});

const testSendSchema = z.object({
  to: z.string().min(6),
  body: z.string().min(1).max(1000),
});

export const getMetaSettingsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { wsDb } = await import("./workspace-scope.server");
    const db = await wsDb(await wid(context));
    const { data } = await db
      .from("meta_wa_settings")
      .select(
        "phone_number_id, access_token, app_secret, verify_token, graph_version, default_template_name, default_template_lang, updated_at",
      )
      .maybeSingle();
    const row = (data ?? {}) as any;
    return {
      phone_number_id: row.phone_number_id ?? "",
      // Credenciais nunca saem do backend — só indicadores de preenchimento.
      has_access_token: Boolean(row.access_token),
      has_app_secret: Boolean(row.app_secret),
      has_verify_token: Boolean(row.verify_token),
      graph_version: row.graph_version ?? "v21.0",
      default_template_name: row.default_template_name ?? "hello_world",
      default_template_lang: row.default_template_lang ?? "en_US",
      updated_at: row.updated_at ?? null,
    };
  });

export const saveMetaSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin"], workspaceId);
    const payload = {
      id: true,
      phone_number_id: data.phone_number_id || null,
      access_token: data.access_token || null,
      app_secret: data.app_secret || null,
      verify_token: data.verify_token || null,
      graph_version: data.graph_version || "v21.0",
      default_template_name: data.default_template_name || "hello_world",
      default_template_lang: data.default_template_lang || "en_US",
    };
    const { wsDb } = await import("./workspace-scope.server");
    const db = await wsDb(workspaceId);
    const { error } = await db.from("meta_wa_settings").upsert(payload, { onConflict: "workspace_id" });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const testMetaConnectionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadMetaConfig } = await import("./whatsapp.server");
    const cfg = await loadMetaConfig(await wid(context));
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

export const sendTestMessageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => {
    const parsed = testSendSchema.safeParse(data);
    if (!parsed.success) {
      return { __invalid: true as const, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }
    return parsed.data;
  })
  .handler(async ({ data, context }) => {
    try {
      const workspaceId = await wid(context);
      if ((data as any)?.__invalid) {
        return { ok: false as const, error: (data as any).error as string };
      }
      const payload = data as { to: string; body: string };
      const { sendAndLog, findContactByPhone } = await import("./messaging.server");
      const contact = await findContactByPhone(workspaceId, payload?.to ?? "");
      const res = await sendAndLog({
        workspaceId,
        to: payload?.to ?? "",
        body: payload?.body ?? "",
        contactId: contact?.id ?? null,
        title: "Teste de conexão",
        tag: "test",
      });
      if (res?.ok) {
        return { ok: true as const, messageId: res?.messageId, to: res.to };
      }
      return { ok: false as const, error: res?.error ?? "Falha no envio.", to: res.to, raw: res?.raw ?? null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false as const, error: `Exceção no servidor: ${msg}` };
    }
  });