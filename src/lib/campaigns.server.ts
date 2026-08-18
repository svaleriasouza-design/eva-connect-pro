// Motor de disparos (campanhas) multi-número.
// Regras: os contatos são DISTRIBUÍDOS entre os números selecionados
// (cada contato recebe por um único número) e cada envio registra
// qual número foi responsável.

import { normalizePhoneNumber } from "./phone";

export type ContactFilter = {
  q?: string | null;
  stage?: string | null;
  batch?: string | null;
};

export type DistributionStrategy = "balanced";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

function applyFilter(query: any, filter: ContactFilter) {
  let q = query.is("deleted_at", null).eq("do_not_contact", false).not("whatsapp", "is", null);
  if (filter.stage) q = q.eq("funnel_stage", filter.stage);
  if (filter.batch) q = q.eq("import_batch_id", filter.batch);
  if (filter.q) q = q.or(`name.ilike.%${filter.q}%,company_name.ilike.%${filter.q}%,whatsapp.ilike.%${filter.q}%`);
  return q;
}

/** Quantos contatos o filtro alcança (contagem exata, sem limite de 1000). */
export async function countEligibleContacts(workspaceId: string, filter: ContactFilter): Promise<number> {
  const db = await admin();
  const { count } = await applyFilter(
    db.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    filter,
  );
  return count ?? 0;
}

/** Divisão equilibrada de N contatos entre K números (resto distribuído). */
export function splitEvenly(total: number, buckets: number): number[] {
  if (buckets <= 0) return [];
  const base = Math.floor(total / buckets);
  const rest = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < rest ? 1 : 0));
}

async function fetchEligible(workspaceId: string, filter: ContactFilter, cap = 50000) {
  const db = await admin();
  const page = 1000;
  const out: { id: string; whatsapp: string | null; phone: string | null }[] = [];
  for (let from = 0; from < cap; from += page) {
    const { data } = await applyFilter(
      db.from("contacts").select("id, whatsapp, phone").eq("workspace_id", workspaceId),
      filter,
    )
      .order("created_at", { ascending: true })
      .range(from, from + page - 1);
    const rows = (data ?? []) as any[];
    out.push(...rows);
    if (rows.length < page) break;
  }
  return out;
}

export type CreateCampaignInput = {
  workspaceId: string;
  name: string;
  body: string;
  numberIds: string[];
  filter: ContactFilter;
  strategy?: DistributionStrategy;
  batchSize?: number;
  createdBy?: string | null;
  createdByName?: string | null;
};

/** Cria a campanha e distribui os contatos entre os números escolhidos. */
export async function createCampaign(input: CreateCampaignInput) {
  const db = await admin();
  const { listActiveWaNumbers } = await import("./wa-numbers.server");
  const actives = await listActiveWaNumbers(input.workspaceId);
  const chosen = actives.filter((n) => input.numberIds.includes(n.id));
  if (chosen.length === 0) {
    return { ok: false as const, error: "Selecione pelo menos um número ativo e configurado." };
  }

  const contacts = await fetchEligible(input.workspaceId, input.filter);
  if (contacts.length === 0) return { ok: false as const, error: "Nenhum contato elegível para este filtro." };

  const { data: campaign, error } = await db
    .from("campaigns")
    .insert({
      workspace_id: input.workspaceId,
      name: input.name,
      body: input.body,
      strategy: input.strategy ?? "balanced",
      status: "ready",
      number_ids: chosen.map((n) => n.id),
      total_targets: contacts.length,
      batch_size: input.batchSize ?? 50,
      created_by: input.createdBy ?? null,
      created_by_name: input.createdByName ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error || !campaign) return { ok: false as const, error: error?.message ?? "Falha ao criar o disparo." };

  // Distribuição equilibrada (round-robin) — 1 contato = 1 número.
  const rows = contacts.map((c, i) => {
    const n = chosen[i % chosen.length]!;
    return {
      workspace_id: input.workspaceId,
      campaign_id: (campaign as any).id as string,
      contact_id: c.id,
      whatsapp_number_id: n.id,
      phone_number_id: n.phone_number_id,
      to_phone: normalizePhoneNumber(c.whatsapp || c.phone || ""),
      status: "pending",
    };
  });
  for (let i = 0; i < rows.length; i += 500) {
    await db.from("campaign_targets").insert(rows.slice(i, i + 500));
  }

  const per = chosen.map((n) => ({
    id: n.id,
    label: n.label,
    count: rows.filter((r) => r.whatsapp_number_id === n.id).length,
  }));
  return { ok: true as const, campaignId: (campaign as any).id as string, total: rows.length, per };
}

/**
 * Processa um lote da campanha. Cada número trabalha em paralelo com o seu
 * próprio subconjunto de contatos; falha em um número não interrompe os outros.
 */
export async function runCampaignBatch(workspaceId: string, campaignId: string, limit?: number) {
  const db = await admin();
  const { data: campaign } = await db
    .from("campaigns")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign) return { ok: false as const, error: "Disparo não encontrado." };
  if ((campaign as any).status === "paused") return { ok: false as const, error: "Disparo pausado." };

  const { listActiveWaNumbers } = await import("./wa-numbers.server");
  const actives = await listActiveWaNumbers(workspaceId);
  const numberIds = ((campaign as any).number_ids as string[]).filter((id) => actives.some((n) => n.id === id));
  if (numberIds.length === 0) return { ok: false as const, error: "Nenhum dos números do disparo está ativo." };

  const perNumber = Math.max(1, Math.ceil((limit ?? (campaign as any).batch_size ?? 50) / numberIds.length));
  await db
    .from("campaigns")
    .update({ status: "running", started_at: (campaign as any).started_at ?? new Date().toISOString() })
    .eq("id", campaignId);

  const { sendAndLog } = await import("./messaging.server");

  const results = await Promise.all(
    numberIds.map(async (numberId) => {
      const { data: targets } = await db
        .from("campaign_targets")
        .select("id, contact_id, to_phone")
        .eq("campaign_id", campaignId)
        .eq("whatsapp_number_id", numberId)
        .eq("status", "pending")
        .limit(perNumber);
      let sent = 0;
      let failed = 0;
      for (const t of (targets ?? []) as any[]) {
        try {
          const res = await sendAndLog({
            workspaceId,
            to: t.to_phone,
            body: (campaign as any).body,
            contactId: t.contact_id,
            whatsappNumberId: numberId,
            title: `Disparo: ${(campaign as any).name}`,
            tag: `campaign-${campaignId}`,
            sendMode: "campanha",
          });
          await db
            .from("campaign_targets")
            .update({
              status: res.ok ? "sent" : "failed",
              external_id: res.messageId ?? null,
              error_message: res.ok ? null : (res.error ?? "Falha no envio."),
              sent_at: new Date().toISOString(),
            })
            .eq("id", t.id);
          if (res.ok) sent++;
          else failed++;
        } catch (err) {
          failed++;
          await db
            .from("campaign_targets")
            .update({ status: "failed", error_message: err instanceof Error ? err.message : String(err) })
            .eq("id", t.id);
        }
      }
      return { numberId, sent, failed };
    }),
  );

  const sent = results.reduce((a, r) => a + r.sent, 0);
  const failed = results.reduce((a, r) => a + r.failed, 0);
  const { count: pending } = await db
    .from("campaign_targets")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  await db
    .from("campaigns")
    .update({
      sent_count: ((campaign as any).sent_count ?? 0) + sent,
      failed_count: ((campaign as any).failed_count ?? 0) + failed,
      status: (pending ?? 0) === 0 ? "done" : "running",
      finished_at: (pending ?? 0) === 0 ? new Date().toISOString() : null,
    })
    .eq("id", campaignId);

  return { ok: true as const, sent, failed, pending: pending ?? 0, perNumber: results };
}

/** Campanhas com envios pendentes (usado pelo cron). */
export async function listRunnableCampaigns(): Promise<{ id: string; workspace_id: string }[]> {
  const db = await admin();
  const { data } = await db.from("campaigns").select("id, workspace_id").in("status", ["ready", "running"]);
  return (data ?? []) as any[];
}