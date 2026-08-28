import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CadenceStep = { day: number; script: string; ai_instructions: string; active: boolean };
export type CadenceSettings = {
  morning_time: string;
  afternoon_time: string;
  batch_size: number;
  timezone: string;
  weekdays_only: boolean;
  auto_reply_enabled: boolean;
  automation_enabled: boolean;
  last_morning_run_at: string | null;
  last_afternoon_run_at: string | null;
};

export const getCadenceConfigFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: steps } = await sb
      .from("cadence_steps")
      .select("day, script, ai_instructions, active")
      .order("day", { ascending: true });
    const { data: settings } = await sb.from("cadence_settings").select("*").maybeSingle();
    return {
      steps: (steps ?? []) as CadenceStep[],
      settings: (settings ?? null) as CadenceSettings | null,
    };
  });

const stepSchema = z.object({
  day: z.number().int().min(1).max(30),
  script: z.string().default(""),
  ai_instructions: z.string().default(""),
  active: z.boolean().default(true),
});

export const saveCadenceStepFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => stepSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspace_id = await currentWorkspaceId(context.supabase);
    const { error } = await sb
      .from("cadence_steps")
      .upsert(
        { workspace_id, day: data.day, script: data.script, ai_instructions: data.ai_instructions, active: data.active },
        { onConflict: "workspace_id,day" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteCadenceStepFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ day: z.number().int().min(1).max(30) }).parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error } = await sb.from("cadence_steps").delete().eq("day", data.day);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const settingsSchema = z.object({
  morning_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  afternoon_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  batch_size: z.number().int().min(1).max(500),
  timezone: z.string().default("America/Sao_Paulo"),
  weekdays_only: z.boolean(),
  auto_reply_enabled: z.boolean(),
  automation_enabled: z.boolean(),
});

export const saveCadenceSettingsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => settingsSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { error } = await sb
      .from("cadence_settings")
      .update({ ...data })
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const activateCadenceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      contactIds: z.array(z.string().uuid()).min(1).max(5000),
      resetToDayZero: z.boolean().default(true),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: Record<string, unknown> = { cadence_active: true, do_not_contact: false };
    if (data.resetToDayZero) patch.cadence_day = 0;
    const { error, count } = await sb
      .from("contacts")
      .update(patch, { count: "exact" })
      .in("id", data.contactIds);
    if (error) throw new Error(error.message);
    return { ok: true as const, activated: count ?? data.contactIds.length };
  });

export const startCadenceForAllEligibleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    // Elegíveis: novo_lead, não bloqueados, com WhatsApp/telefone, fora da cadência.
    // IMPORTANTE: fazemos o update direto no banco (sem pré-buscar), evitando o
    // teto default de 1000 linhas do PostgREST que estava retornando 1000 registros
    // sem telefone (pós-deduplicação) e derrubando a ativação para 0.
    const { data: updated, error } = await sb
      .from("contacts")
      .update({ cadence_active: true, cadence_day: 0 })
      .eq("funnel_stage", "novo_lead")
      .eq("do_not_contact", false)
      .eq("cadence_active", false)
      .or("whatsapp.neq.,phone.neq.")
      .select("id");
    if (error) throw new Error(error.message);
    return { ok: true as const, activated: updated?.length ?? 0 };
  });

export const getCadenceStatsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const q = (b: any) => b.select("id", { count: "exact", head: true });
    const [active, novo, blocked] = await Promise.all([
      q(sb.from("contacts")).eq("cadence_active", true),
      q(sb.from("contacts"))
        .eq("funnel_stage", "novo_lead")
        .eq("cadence_active", false)
        .eq("do_not_contact", false)
        .or("whatsapp.neq.,phone.neq."),
      q(sb.from("contacts")).eq("do_not_contact", true),
    ]);
    return {
      active: active.count ?? 0,
      eligible: novo.count ?? 0,
      blocked: blocked.count ?? 0,
    };
  });

export const runCadenceNowFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({
      slot: z.enum(["morning", "afternoon"]),
      batchSize: z.number().int().min(1).max(500).optional(),
    }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let size = data.batchSize;
    if (!size) {
      const { data: settings } = await sb.from("cadence_settings").select("batch_size").maybeSingle();
      size = (settings as any)?.batch_size ?? 10;
    }
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { runCadenceBatch } = await import("./cadence-runner.server");
    const result = await runCadenceBatch(workspaceId, data.slot, size!);
    return result;
  });
export type FailedCadenceSend = {
  id: string;
  contact_id: string | null;
  contact_name: string;
  phone: string;
  day: number | null;
  error_message: string | null;
  created_at: string;
};

/** Lista os envios de cadência que falharam (log já existente em activities). */
export const listFailedCadenceSendsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("activities")
      .select("id, contact_id, title, error_message, created_at, contacts(name, whatsapp, phone)")
      .eq("kind", "whatsapp_out")
      .eq("status", "FAILED")
      .ilike("title", "Cad%ncia Dia%")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    const items: FailedCadenceSend[] = ((data ?? []) as any[]).map((a) => {
      const m = /Dia\s+(\d+)/i.exec(a.title ?? "");
      return {
        id: a.id,
        contact_id: a.contact_id,
        contact_name: a.contacts?.name ?? "Contato removido",
        phone: a.contacts?.whatsapp ?? a.contacts?.phone ?? "",
        day: m ? Number(m[1]) : null,
        error_message: a.error_message ?? null,
        created_at: a.created_at,
      };
    });
    return { items };
  });

/** Recoloca na fila da cadência (mesmo dia que falhou) os envios selecionados. */
export const retryFailedCadenceSendsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ activityIds: z.array(z.string().uuid()).min(1).max(500) }).parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { retryFailedCadenceSends } = await import("./cadence-runner.server");
    return retryFailedCadenceSends(workspaceId, data.activityIds);
  });
