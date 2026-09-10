import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Tipo de resposta enviada na etapa: texto, áudio ou os dois. */
export type CadenceReplyType = "texto" | "audio" | "texto_audio";
export type CadenceStep = {
  day: number;
  script: string;
  ai_instructions: string;
  active: boolean;
  reply_type: CadenceReplyType;
  audio_path: string | null;
  audio_name: string | null;
};
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
      .select("day, script, ai_instructions, active, reply_type, audio_path, audio_name")
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
  reply_type: z.enum(["texto", "audio", "texto_audio"]).default("texto"),
  audio_path: z.string().nullable().default(null),
  audio_name: z.string().nullable().default(null),
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
        {
          workspace_id,
          day: data.day,
          script: data.script,
          ai_instructions: data.ai_instructions,
          active: data.active,
          reply_type: data.reply_type,
          audio_path: data.audio_path,
          audio_name: data.audio_name,
        },
        { onConflict: "workspace_id,day" },
      );
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const AUDIO_MIME_MAP: Record<string, string> = {
  "audio/opus": "audio/ogg",
  "audio/mp3": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
};
const AUDIO_ALLOWED = ["audio/ogg", "audio/mpeg", "audio/mp4", "audio/aac", "audio/amr"];

/**
 * Sobe UMA vez o áudio da etapa para o bucket `whatsapp-audio` (o mesmo já usado
 * pelo atendimento). O caminho fica salvo na etapa e é reutilizado em todos os
 * contatos — nunca há novo upload a cada disparo.
 */
export const uploadCadenceAudioFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        day: z.number().int().min(1).max(30),
        fileName: z.string().min(1).max(200),
        mime: z.string().min(3).max(64),
        base64: z.string().min(32).max(20_000_000),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);

    const raw = data.mime.split(";")[0].toLowerCase();
    const mime = AUDIO_MIME_MAP[raw] ?? raw;
    if (!AUDIO_ALLOWED.includes(mime)) {
      return {
        ok: false as const,
        error: `Formato de áudio não suportado pelo WhatsApp: ${raw}. Use OGG/Opus, MP3, M4A (AAC) ou AMR.`,
      };
    }
    const bin = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (!bin.length) return { ok: false as const, error: "Áudio vazio." };

    const ext =
      mime === "audio/mpeg" ? "mp3" : mime === "audio/mp4" || mime === "audio/aac" ? "m4a" : mime === "audio/amr" ? "amr" : "ogg";
    const path = `cadencia/${workspaceId}/dia-${data.day}-${Date.now()}.${ext}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage
      .from("whatsapp-audio")
      .upload(path, bin, { contentType: mime, upsert: false });
    if (up.error) return { ok: false as const, error: `Falha ao guardar o áudio: ${up.error.message}` };
    return { ok: true as const, path, name: data.fileName };
  });

/** URL temporária para ouvir o áudio configurado na etapa. */
export const getCadenceAudioUrlFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ path: z.string().min(3).max(400) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const workspaceId = await currentWorkspaceId(context.supabase);
    if (!data.path.startsWith(`cadencia/${workspaceId}/`)) {
      return { ok: false as const, error: "Áudio não pertence a este workspace." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("whatsapp-audio")
      .createSignedUrl(data.path, 3600);
    if (error || !signed?.signedUrl) return { ok: false as const, error: error?.message ?? "Falha ao gerar link." };
    return { ok: true as const, url: signed.signedUrl };
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
