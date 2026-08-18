import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

const filterSchema = z.object({
  q: z.string().trim().max(120).optional().nullable(),
  stage: z.string().trim().max(40).optional().nullable(),
  batch: z.string().uuid().optional().nullable(),
});

const previewSchema = z.object({
  numberIds: z.array(z.string().uuid()).max(50).default([]),
  filter: filterSchema.default({}),
});

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(4000),
  numberIds: z.array(z.string().uuid()).min(1).max(50),
  filter: filterSchema.default({}),
  strategy: z.enum(["balanced"]).default("balanced"),
  batchSize: z.number().int().min(1).max(500).default(50),
});

/** Prévia da distribuição: quantos contatos e quanto vai para cada número. */
export const previewCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => previewSchema.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { countEligibleContacts, splitEvenly } = await import("./campaigns.server");
    const { listActiveWaNumbers } = await import("./wa-numbers.server");
    const total = await countEligibleContacts(workspaceId, data.filter);
    const actives = await listActiveWaNumbers(workspaceId);
    const chosen = actives.filter((n) => data.numberIds.includes(n.id));
    const split = splitEvenly(total, chosen.length);
    return {
      total,
      distribution: chosen.map((n, i) => ({ id: n.id, label: n.label, count: split[i] ?? 0 })),
    };
  });

export const createCampaignFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const name = await displayNameFor(
      context.userId,
      ((context.claims as any)?.email as string | undefined) ?? "atendente",
    );
    const { createCampaign } = await import("./campaigns.server");
    return createCampaign({
      workspaceId,
      name: data.name,
      body: data.body,
      numberIds: data.numberIds,
      filter: data.filter,
      strategy: data.strategy,
      batchSize: data.batchSize,
      createdBy: context.userId,
      createdByName: name,
    });
  });

export const runCampaignBatchFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const { runCampaignBatch } = await import("./campaigns.server");
    return runCampaignBatch(workspaceId, data.campaignId);
  });

export const setCampaignStatusFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ campaignId: z.string().uuid(), status: z.enum(["paused", "ready"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("campaigns")
      .update({ status: data.status })
      .eq("id", data.campaignId)
      .eq("workspace_id", workspaceId);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

/** Lista os disparos com o desempenho por número. */
export const listCampaignsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await wid(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { data: campaigns } = await db
      .from("campaigns")
      .select("id, name, body, status, strategy, number_ids, total_targets, sent_count, failed_count, created_at, created_by_name")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(30);
    const { listWaNumbers } = await import("./wa-numbers.server");
    const numbers = await listWaNumbers(workspaceId);
    const nameOf = (id: string) => numbers.find((n) => n.id === id)?.label ?? "Número removido";
    return ((campaigns ?? []) as any[]).map((c) => ({
      ...c,
      numbers: (c.number_ids as string[]).map((id) => ({ id, label: nameOf(id) })),
    }));
  });

/** Detalhe de um disparo: quanto cada número enviou/falhou. */
export const campaignBreakdownFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ campaignId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as any;
    const { listWaNumbers } = await import("./wa-numbers.server");
    const numbers = await listWaNumbers(workspaceId);
    const out: { id: string; label: string; pending: number; sent: number; failed: number }[] = [];
    for (const n of numbers) {
      const counts = await Promise.all(
        ["pending", "sent", "failed"].map(async (status) => {
          const { count } = await db
            .from("campaign_targets")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", data.campaignId)
            .eq("whatsapp_number_id", n.id)
            .eq("status", status);
          return count ?? 0;
        }),
      );
      if (counts.some((c) => c > 0)) {
        out.push({ id: n.id, label: n.label, pending: counts[0]!, sent: counts[1]!, failed: counts[2]! });
      }
    }
    return out;
  });