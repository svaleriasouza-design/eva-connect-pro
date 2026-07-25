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
    const { data: settings } = await sb
      .from("cadence_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();
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
    const { error } = await sb
      .from("cadence_steps")
      .upsert(
        { day: data.day, script: data.script, ai_instructions: data.ai_instructions, active: data.active },
        { onConflict: "day" },
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
    const { error } = await sb
      .from("cadence_settings")
      .update({ ...data })
      .eq("id", true);
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
    const { data: rows, error: selErr } = await sb
      .from("contacts")
      .select("id, whatsapp, phone")
      .eq("funnel_stage", "novo_lead")
      .eq("do_not_contact", false)
      .eq("cadence_active", false);
    if (selErr) throw new Error(selErr.message);
    const ids = (rows ?? [])
      .filter((c: any) => {
        const digits = (c.whatsapp ?? c.phone ?? "").replace(/\D/g, "");
        return digits.length >= 10;
      })
      .map((c: any) => c.id);
    if (ids.length === 0) return { ok: true as const, activated: 0 };
    // Update em blocos para não estourar limite de payload.
    let activated = 0;
    const chunk = 1000;
    for (let i = 0; i < ids.length; i += chunk) {
      const slice = ids.slice(i, i + chunk);
      const { error } = await sb
        .from("contacts")
        .update({ cadence_active: true, cadence_day: 0 })
        .in("id", slice);
      if (error) throw new Error(error.message);
      activated += slice.length;
    }
    return { ok: true as const, activated };
  });

export const getCadenceStatsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const q = (b: any) => b.select("id", { count: "exact", head: true });
    const [active, novo, blocked] = await Promise.all([
      q(sb.from("contacts")).eq("cadence_active", true),
      q(sb.from("contacts")).eq("funnel_stage", "novo_lead").eq("cadence_active", false).eq("do_not_contact", false),
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
      const { data: settings } = await sb
        .from("cadence_settings")
        .select("batch_size")
        .eq("id", true)
        .maybeSingle();
      size = (settings as any)?.batch_size ?? 10;
    }
    const { runCadenceBatch } = await import("./cadence-runner.server");
    const result = await runCadenceBatch(data.slot, size!);
    return result;
  });