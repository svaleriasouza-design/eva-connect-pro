import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

async function adminGuard(context: any) {
  const workspaceId = await wid(context);
  const { requireRole } = await import("./users.server");
  await requireRole(context.userId, ["admin"], workspaceId);
  return workspaceId;
}

const upsertSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  label: z.string().trim().min(1).max(80),
  display_phone: z.string().trim().max(40).optional().nullable(),
  phone_number_id: z.string().trim().min(3).max(64),
  waba_id: z.string().trim().max(64).optional().nullable(),
  access_token: z.string().trim().max(4096).optional().nullable(),
  app_secret: z.string().trim().max(512).optional().nullable(),
  verify_token: z.string().trim().max(256).optional().nullable(),
  graph_version: z.string().trim().max(16).optional().nullable(),
  default_template_name: z.string().trim().max(128).optional().nullable(),
  default_template_lang: z.string().trim().max(16).optional().nullable(),
  is_primary: z.boolean().optional(),
  active: z.boolean().optional(),
});

const idSchema = z.object({ id: z.string().uuid() });

/** Lista os números SEM expor credenciais (apenas indicadores de preenchimento). */
export const listWhatsappNumbersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await wid(context);
    const { listWaNumbers } = await import("./wa-numbers.server");
    const rows = await listWaNumbers(workspaceId);
    return rows.map((n) => ({
      id: n.id,
      label: n.label,
      display_phone: n.display_phone ?? "",
      phone_number_id: n.phone_number_id,
      waba_id: n.waba_id ?? "",
      graph_version: n.graph_version ?? "v21.0",
      default_template_name: n.default_template_name ?? "hello_world",
      default_template_lang: n.default_template_lang ?? "en_US",
      active: n.active,
      is_primary: n.is_primary,
      connection_status: n.connection_status ?? "unknown",
      connection_error: n.connection_error ?? "",
      last_checked_at: n.last_checked_at,
      connected_at: n.connected_at,
      has_access_token: Boolean(n.access_token),
      has_app_secret: Boolean(n.app_secret),
      has_verify_token: Boolean(n.verify_token),
    }));
  });

export const saveWhatsappNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await adminGuard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Nunca sobrescreve credencial existente com valor vazio (campos mascarados na UI).
    const patch: Record<string, unknown> = {
      label: data.label,
      display_phone: data.display_phone || null,
      phone_number_id: data.phone_number_id,
      waba_id: data.waba_id || null,
      graph_version: data.graph_version || "v21.0",
      default_template_name: data.default_template_name || "hello_world",
      default_template_lang: data.default_template_lang || "en_US",
    };
    if (data.access_token) patch['access_token'] = data.access_token;
    if (data.app_secret) patch['app_secret'] = data.app_secret;
    if (data.verify_token) patch['verify_token'] = data.verify_token;
    if (typeof data.active === "boolean") patch['active'] = data.active;

    let id = data.id ?? null;
    if (id) {
      const { error } = await db.from("whatsapp_numbers").update(patch).eq("id", id).eq("workspace_id", workspaceId);
      if (error) return { ok: false as const, error: error.message };
    } else {
      const { count } = await db
        .from("whatsapp_numbers")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId);
      const { data: created, error } = await db
        .from("whatsapp_numbers")
        .insert({ ...patch, workspace_id: workspaceId, is_primary: (count ?? 0) === 0 })
        .select("id")
        .maybeSingle();
      if (error) return { ok: false as const, error: error.message };
      id = (created as any)?.id ?? null;
    }

    if (data.is_primary && id) await makePrimary(db, workspaceId, id);
    return { ok: true as const, id };
  });

async function makePrimary(db: any, workspaceId: string, id: string) {
  await db.from("whatsapp_numbers").update({ is_primary: false }).eq("workspace_id", workspaceId).neq("id", id);
  await db.from("whatsapp_numbers").update({ is_primary: true, active: true }).eq("id", id).eq("workspace_id", workspaceId);
}

export const setPrimaryWhatsappNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await adminGuard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await makePrimary(supabaseAdmin as any, workspaceId, data.id);
    return { ok: true as const };
  });

export const toggleWhatsappNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.extend({ active: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await adminGuard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const patch: Record<string, unknown> = { active: data.active };
    // Um número inativo não pode continuar principal.
    if (!data.active) patch['is_primary'] = false;
    const { error } = await db.from("whatsapp_numbers").update(patch).eq("id", data.id).eq("workspace_id", workspaceId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/**
 * Remoção do número.
 * - Padrão (force=false): se houver histórico vinculado, apenas DESATIVA.
 * - force=true: desvincula todo o rastro (histórico, contatos, disparos) e
 *   apaga o número definitivamente. O histórico das conversas é preservado,
 *   apenas deixa de apontar para o número excluído.
 */
export const deleteWhatsappNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.extend({ force: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await adminGuard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;

    // Garante que o número pertence ao workspace de quem pediu.
    const { data: target } = await db
      .from("whatsapp_numbers")
      .select("id, is_primary")
      .eq("id", data.id)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!target) return { ok: false as const, error: "Número não encontrado neste workspace." };

    const linked = ["activities", "contacts", "campaign_targets"];
    const counts = await Promise.all(
      linked.map(async (t) => {
        const { count } = await db
          .from(t)
          .select("id", { count: "exact", head: true })
          .eq("whatsapp_number_id", data.id)
          .eq("workspace_id", workspaceId);
        return count ?? 0;
      }),
    );
    const used = counts.reduce((a, b) => a + b, 0);

    if (used > 0 && !data.force) {
      await db
        .from("whatsapp_numbers")
        .update({ active: false, is_primary: false })
        .eq("id", data.id)
        .eq("workspace_id", workspaceId);
      return { ok: true as const, deactivated: true, used };
    }

    if (data.force) {
      // Desvincula (não apaga conversas) apenas no workspace de quem pediu.
      for (const t of linked) {
        const { error } = await db
          .from(t)
          .update({ whatsapp_number_id: null })
          .eq("whatsapp_number_id", data.id)
          .eq("workspace_id", workspaceId);
        if (error) return { ok: false as const, error: error.message };
      }
    }

    const { error } = await db.from("whatsapp_numbers").delete().eq("id", data.id).eq("workspace_id", workspaceId);
    if (error) return { ok: false as const, error: error.message };

    // Se o excluído era o principal, promove outro número ativo do workspace.
    if (target.is_primary) {
      const { data: next } = await db
        .from("whatsapp_numbers")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1);
      const nextId = (next ?? [])[0]?.id;
      if (nextId) await makePrimary(db, workspaceId, nextId);
    }

    return { ok: true as const, deactivated: false, used, unlinked: data.force ? used : 0 };
  });


/** Testa as credenciais daquele número específico contra a Graph API. */
export const testWhatsappNumberFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { getWaNumber } = await import("./wa-numbers.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const n = await getWaNumber(workspaceId, data.id);
    if (!n) return { ok: false as const, error: "Número não encontrado neste workspace." };

    const fail = async (error: string) => {
      await db
        .from("whatsapp_numbers")
        .update({ connection_status: "error", connection_error: error, last_checked_at: new Date().toISOString() })
        .eq("id", n.id);
      return { ok: false as const, error };
    };

    if (!n.phone_number_id) return fail("Falta o ID do número (phone_number_id).");
    if (!n.access_token) return fail("Falta o token de acesso deste número.");
    try {
      const url = `https://graph.facebook.com/${n.graph_version || "v21.0"}/${n.phone_number_id}?fields=display_phone_number,verified_name,quality_rating`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${n.access_token}` } });
      const json = (await res.json()) as any;
      if (!res.ok || json?.error) {
        return fail(json?.error?.message || `A Meta recusou a consulta do número (HTTP ${res.status}).`);
      }
      const now = new Date().toISOString();
      await db
        .from("whatsapp_numbers")
        .update({
          connection_status: "connected",
          connection_error: null,
          last_checked_at: now,
          connected_at: n.connected_at ?? now,
          display_phone: json.display_phone_number ?? n.display_phone,
        })
        .eq("id", n.id);
      return {
        ok: true as const,
        phone: json.display_phone_number as string | undefined,
        name: json.verified_name as string | undefined,
        quality: json.quality_rating as string | undefined,
      };
    } catch (err) {
      return fail(`Não foi possível falar com a Meta: ${err instanceof Error ? err.message : String(err)}`);
    }
  });