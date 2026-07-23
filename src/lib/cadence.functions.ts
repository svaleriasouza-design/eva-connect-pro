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