// Regra GLOBAL: quando um humano assume a conversa, toda automação para.
// Estado: contacts.human_takeover (+ ai_paused como espelho para a interface).
// Este módulo é a fonte única de verdade da trava, validada IMEDIATAMENTE
// antes de cada envio automático (dentro de sendAndLog).

async function db(workspaceId: string) {
  const { wsDb } = await import("./workspace-scope.server");
  return (await wsDb(workspaceId)) as any;
}

export const TAKEOVER_BLOCK_REASON = "Envio automático bloqueado: atendimento assumido por humano.";

/** Estado atual (leitura fresca no banco, nunca cacheado). */
export async function isHumanTakeover(workspaceId: string, contactId?: string | null): Promise<boolean> {
  if (!contactId) return false;
  try {
    const client = await db(workspaceId);
    const { data } = await client
      .from("contacts")
      .select("human_takeover, ai_paused")
      .eq("id", contactId)
      .maybeSingle();
    const row = (data ?? {}) as { human_takeover?: boolean; ai_paused?: boolean };
    return Boolean(row.human_takeover || row.ai_paused);
  } catch (err) {
    console.error("[takeover] falha ao verificar estado", err);
    // Em dúvida, bloqueia: automação nunca deve atropelar o humano.
    return true;
  }
}

/**
 * Marca o atendimento como assumido por humano:
 *  - human_takeover = true (+ ai_paused = true)
 *  - cadência do lead interrompida
 *  - alvos de campanha pendentes deste lead cancelados
 */
export async function markHumanTakeover(params: {
  workspaceId: string;
  contactId: string;
  userId?: string | null;
  userName?: string | null;
  reason?: string;
}): Promise<void> {
  const client = await db(params.workspaceId);
  const now = new Date().toISOString();
  try {
    const { data: before } = await client
      .from("contacts")
      .select("human_takeover")
      .eq("id", params.contactId)
      .maybeSingle();
    const already = Boolean((before as any)?.human_takeover);

    await client
      .from("contacts")
      .update({
        human_takeover: true,
        human_takeover_at: now,
        human_takeover_by: params.userId ?? null,
        human_takeover_by_name: params.userName ?? null,
        ai_paused: true,
        cadence_active: false,
        updated_at: now,
      })
      .eq("id", params.contactId);

    // Cancela mensagens automáticas já programadas (campanhas/disparos).
    const { data: cancelled } = await client
      .from("campaign_targets")
      .update({ status: "cancelled", error_message: TAKEOVER_BLOCK_REASON })
      .eq("contact_id", params.contactId)
      .eq("status", "pending")
      .select("id");
    const cancelledCount = (cancelled ?? []).length;

    if (!already) {
      await client.from("activities").insert({
        contact_id: params.contactId,
        kind: "nota",
        title: "Atendimento assumido por humano — automações bloqueadas",
        content:
          `${params.reason ?? "Mensagem manual enviada por um usuário."}\n` +
          `Cadência interrompida e ${cancelledCount} mensagem(ns) automática(s) programada(s) cancelada(s).\n` +
          `Nenhuma automação da EVA será enviada para este lead até a retomada manual.`,
        status: "OK",
        status_updated_at: now,
        sent_by: params.userId ?? null,
        sent_by_name: params.userName ?? null,
      });
    }
    console.log(
      `[takeover] ON contact=${params.contactId} workspace=${params.workspaceId} por=${params.userName ?? params.userId ?? "-"} alvos_cancelados=${cancelledCount}`,
    );
  } catch (err) {
    console.error("[takeover] falha ao marcar assunção humana", err);
  }
}

/** Devolve o atendimento para a EVA (retomada manual pelo usuário). */
export async function releaseHumanTakeover(params: {
  workspaceId: string;
  contactId: string;
  userId?: string | null;
  userName?: string | null;
}): Promise<void> {
  const client = await db(params.workspaceId);
  const now = new Date().toISOString();
  await client
    .from("contacts")
    .update({
      human_takeover: false,
      human_takeover_at: null,
      human_takeover_by: null,
      human_takeover_by_name: null,
      ai_paused: false,
      updated_at: now,
    })
    .eq("id", params.contactId);
  await client.from("activities").insert({
    contact_id: params.contactId,
    kind: "nota",
    title: "Automação retomada pela equipe",
    content: "O atendimento voltou para a EVA. Cadências e automações estão liberadas novamente para este lead.",
    status: "OK",
    status_updated_at: now,
    sent_by: params.userId ?? null,
    sent_by_name: params.userName ?? null,
  });
  console.log(`[takeover] OFF contact=${params.contactId} workspace=${params.workspaceId}`);
}

/** Modos de envio considerados manuais (feitos por uma pessoa). */
export function isManualSendMode(sendMode?: string | null, sentBy?: string | null): boolean {
  const mode = (sendMode ?? "").toLowerCase();
  if (mode === "manual" || mode === "teste") return true;
  return Boolean(sentBy) && mode !== "cadencia" && mode !== "campanha" && mode !== "eva";
}
