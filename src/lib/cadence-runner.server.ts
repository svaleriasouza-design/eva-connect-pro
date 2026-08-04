// Núcleo da automação de cadência: seleção de contatos, envio via Meta Cloud API,
// resposta automática usando as instruções cadastradas por dia.
// Server-only.

import { sendAndLog } from "./messaging.server";

async function loadAdmin(workspaceId: string) {
  const { wsDb } = await import("./workspace-scope.server");
  return (await wsDb(workspaceId)) as any;
}

/** Teto de segurança por execução para a progressão automática (Dia 2+). */
const FOLLOWUP_CAP = 2000;

function firstName(name: string) {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

function renderScript(tpl: string, ctx: { nome: string }) {
  return (tpl ?? "").replaceAll("{{nome}}", ctx.nome);
}

/** Template aprovado da Meta correspondente ao dia da cadência. */
function templateForDay(day: number) {
  return `cadencia_dia_${day}`;
}

/** Encerra a cadência e agenda a reativação em 60 dias. */
async function endCadence(admin: any, contactId: string, reason: string) {
  const in60 = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString();
  await admin
    .from("contacts")
    .update({
      cadence_active: false,
      funnel_stage: "reativar_60",
      next_action: "Reativar em 60 dias",
      next_action_at: in60,
      updated_at: new Date().toISOString(),
    })
    .eq("id", contactId);
  await admin.from("activities").insert({
    contact_id: contactId,
    kind: "cadence_stop",
    title: "Cadência encerrada — Reativar em 60 dias",
    content: reason,
    status: "OK",
    status_updated_at: new Date().toISOString(),
  });
}

/** Verifica se o contato respondeu (mensagem recebida) desde o último envio. */
async function hasReplied(admin: any, contactId: string): Promise<boolean> {
  const { data } = await admin
    .from("activities")
    .select("id")
    .eq("contact_id", contactId)
    .eq("kind", "whatsapp_in")
    .limit(1);
  return Boolean(data && data.length > 0);
}

export type BatchResult = {
  slot: "morning" | "afternoon";
  workspaceId: string;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  newLeads: number;
  followUps: number;
  finished: number;
  errors: string[];
};

/**
 * Executa uma passagem da operação comercial contínua de um workspace.
 *
 * Dois fluxos rodam em paralelo, cada lead com sua própria linha do tempo:
 *   1. PROSPECÇÃO — Dia 1 para novos leads ("novo_lead"), limitado pela
 *      quantidade configurada pelo usuário (batchSize).
 *   2. PROGRESSÃO — Dia 2..N para TODOS os contatos que ainda não responderam,
 *      sem limite fixo (apenas um teto técnico de segurança).
 *
 * Quem responde sai da cadência na hora (webhook/roteador) e passa a ser
 * conduzido pela IA — sem interferir na evolução dos demais leads.
 * Quem completa o último dia sem responder é encerrado e marcado para
 * reativação em 60 dias.
 */
export async function runCadenceBatch(
  workspaceId: string,
  slot: "morning" | "afternoon",
  batchSize: number,
): Promise<BatchResult> {
  const admin = await loadAdmin(workspaceId);
  const result: BatchResult = {
    slot,
    workspaceId,
    attempted: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    newLeads: 0,
    followUps: 0,
    finished: 0,
    errors: [],
  };

  const { data: steps } = await admin
    .from("cadence_steps")
    .select("day, script, active")
    .eq("active", true)
    .order("day", { ascending: true });
  const stepList = (steps ?? []) as Array<{ day: number; script: string; active: boolean }>;
  if (stepList.length === 0) return result;
  const maxDay = stepList[stepList.length - 1].day;
  const scriptByDay = new Map<number, string>(stepList.map((s) => [s.day, s.script]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const select = "id, name, whatsapp, phone, cadence_day, last_contact_at, funnel_stage";
  const eligible = (q: any) =>
    q
      .eq("cadence_active", true)
      .eq("do_not_contact", false)
      .eq("is_bot", false)
      .eq("ai_paused", false)
      .lt("cadence_day", maxDay)
      .or(`last_contact_at.is.null,last_contact_at.lt.${todayIso}`);

  // FLUXO 1 — progressão automática (Dia 2..N): todos que não responderam.
  const { data: followUpsRaw } = await eligible(
    admin.from("contacts").select(select).gte("cadence_day", 1),
  )
    .order("cadence_day", { ascending: false })
    .order("last_contact_at", { ascending: true, nullsFirst: true })
    .limit(FOLLOWUP_CAP);
  const followUps = (followUpsRaw ?? []) as any[];

  // FLUXO 2 — prospecção (Dia 1), limitada pela configuração do usuário.
  const { data: newRaw } = await eligible(
    admin.from("contacts").select(select).eq("cadence_day", 0).eq("funnel_stage", "novo_lead"),
  )
    .order("last_contact_at", { ascending: true, nullsFirst: true })
    .limit(Math.max(0, batchSize));
  const newLeads = (newRaw ?? []) as any[];

  const list = [...followUps, ...newLeads];
  result.attempted = list.length;
  const nowIso = new Date().toISOString();

  for (const c of list) {
    const to = (c.whatsapp ?? c.phone ?? "").toString();
    if (!to.replace(/\D/g, "")) {
      result.skipped++;
      continue;
    }

    // Revalidação antes de cada disparo: respondeu? robô? ainda em cadência?
    const { data: fresh } = await admin
      .from("contacts")
      .select("cadence_active, cadence_day, do_not_contact, is_bot, ai_paused")
      .eq("id", c.id)
      .maybeSingle();
    const f = (fresh ?? {}) as any;
    if (!f.cadence_active || f.do_not_contact || f.is_bot || f.ai_paused) {
      result.skipped++;
      continue;
    }
    if (await hasReplied(admin, c.id)) {
      await admin.from("contacts").update({ cadence_active: false }).eq("id", c.id);
      result.skipped++;
      continue;
    }

    const nextDay = (f.cadence_day ?? c.cadence_day ?? 0) + 1;
    const tpl = scriptByDay.get(nextDay);
    if (!tpl) {
      result.skipped++;
      continue;
    }
    const body = renderScript(tpl, { nome: firstName(c.name ?? "") });

    const send = await sendAndLog({
      workspaceId,
      to,
      body,
      contactId: c.id,
      title: `Cadência Dia ${nextDay} (${slot === "morning" ? "manhã" : "tarde"})`,
      tag: `cadence-day-${nextDay}-${slot}`,
      templateName: templateForDay(nextDay),
    });
    if (send.ok) {
      result.sent++;
      if (nextDay === 1) result.newLeads++;
      else result.followUps++;
      await admin
        .from("contacts")
        .update({ cadence_day: nextDay, last_contact_at: nowIso, cadence_active: true })
        .eq("id", c.id);
      if (nextDay >= maxDay) {
        result.finished++;
        await endCadence(admin, c.id, `Dia ${nextDay} enviado e sem resposta — reativar em 60 dias.`);
      }
    } else {
      result.failed++;
      if (send.error) result.errors.push(`${c.name}: ${send.error}`);
    }
  }

  const stampField = slot === "morning" ? "last_morning_run_at" : "last_afternoon_run_at";
  await admin.from("cadence_settings").update({ [stampField]: nowIso });

  return result;
}

/**
 * Gera e envia uma resposta automática usando a instrução do dia atual + Lovable AI.
 * Chamado pelo webhook quando um contato ativo responde.
 */
export async function autoReplyToInbound(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  to: string;
  incomingText: string;
  currentDay: number;
}): Promise<string> {
  const admin = await loadAdmin(params.workspaceId);

  const { data: settingsRow } = await (admin as any)
    .from("cadence_settings")
    .select("auto_reply_enabled")
    .maybeSingle();
  const settings = (settingsRow ?? {}) as { auto_reply_enabled?: boolean };
  if (!settings.auto_reply_enabled) {
    console.log("[eva auto-reply] desativado nas configurações");
    return "skipped:auto_reply_disabled";
  }

  // Lead precisa estar ativo e permitir contato.
  const { data: contactRow } = await (admin as any)
    .from("contacts")
    .select("do_not_contact, status, is_bot, ai_paused")
    .eq("id", params.contactId)
    .maybeSingle();
  const contact = (contactRow ?? {}) as { do_not_contact?: boolean; status?: string | null; is_bot?: boolean; ai_paused?: boolean };
  if (contact.is_bot) return "skipped:bot";
  if (contact.ai_paused) return "skipped:manual_mode";
  if (contact.do_not_contact || (contact.status ?? "ativo") === "perdido") {
    console.log(`[eva auto-reply] lead inativo contact=${params.contactId}`);
    return "skipped:lead_inativo";
  }

  const day = Math.max(1, params.currentDay || 1);
  const { data: stepRow } = await (admin as any)
    .from("cadence_steps")
    .select("script, ai_instructions")
    .eq("day", day)
    .maybeSingle();
  const step = (stepRow ?? {}) as { script?: string; ai_instructions?: string };

  // Fallback: se o dia atual não tiver instrução, usa a primeira instrução cadastrada.
  let instructions = (step.ai_instructions ?? "").trim();
  if (!instructions) {
    const { data: anyStep } = await (admin as any)
      .from("cadence_steps")
      .select("ai_instructions")
      .neq("ai_instructions", "")
      .order("day", { ascending: true })
      .limit(1)
      .maybeSingle();
    instructions = ((anyStep as any)?.ai_instructions ?? "").trim();
  }
  if (!instructions) {
    instructions =
      "Se o cliente demonstrar interesse, ofereça agendar uma reunião de 15 minutos. Se pedir para não receber mais, encerre educadamente.";
  }

  const key = process.env.LOVABLE_API_KEY;
  if (!key) {
    console.error("[eva auto-reply] LOVABLE_API_KEY ausente");
    return "error:missing_api_key";
  }
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-2.5-flash");

  const { loadWorkspace } = await import("./workspace.server");
  const ws = await loadWorkspace(params.workspaceId);
  const system = `Você é a EVA, SDR (Sales Development Representative) sênior${ws.owner_name ? ` de ${ws.owner_name}` : ""} — ${ws.name}. Fala por WhatsApp, em português do Brasil.

COMO UM SDR EXPERIENTE SE COMPORTA:
- Conduz a conversa: toda mensagem termina com UMA pergunta ou um convite claro (nunca deixa a conversa morrer).
- Escuta antes de vender: qualifica com perguntas sobre contexto, dor, prioridade e decisão — sem parecer interrogatório.
- Mensagens curtas (1 a 3 linhas), linguagem humana, sem jargão corporativo, sem textão, no máximo 1 emoji e só quando cair bem.
- Personaliza usando o que o cliente já disse; nunca repete o script literalmente se ele já respondeu.
- Trata objeção com empatia + reenquadre + próxima pergunta ("faz sentido", "entendo", e segue). Nunca insiste duas vezes na mesma objeção.
- Objetivo primário: agendar uma conversa de 15 a 30 minutos. Ao perceber interesse, propõe dia e horário concretos.

REGRA CRÍTICA DE ENCERRAMENTO (nunca violar):
- Só se despeça / diga que "não vai mais incomodar" / encerre a conversa QUANDO o cliente pedir EXPLICITAMENTE para parar de receber mensagens (ex.: "não quero receber mais mensagens", "me remova", "pare de me enviar", "não tenho interesse nenhum, não me chame mais").
- "Não tenho tempo agora", "depois falamos", "estou em reunião", silêncio, dúvida, pedido de informação, pedido para marcar ou remarcar reunião NÃO são pedidos para parar. Nesses casos continue conduzindo a conversa com UMA pergunta.
- Se o cliente quiser marcar ou remarcar reunião, trate como interesse: confirme dia e horário concretos. Nunca responda com despedida.
- Nunca inventa preço, prazo, resultado ou informação que não esteja nas instruções.
- Se a mensagem estiver ambígua, faz UMA pergunta objetiva de esclarecimento.
- Se a mensagem parecer resposta automática/robô, não continua a venda: responde de forma neutra pedindo falar com a pessoa responsável.
- O cliente pode ter enviado várias mensagens seguidas: elas vêm agrupadas abaixo e devem ser respondidas de uma vez só, numa única mensagem coerente.

Dia atual da cadência: ${day}
Roteiro enviado neste dia: """${step.script ?? ""}"""
Instruções de resposta cadastradas (têm prioridade sobre o estilo acima): """${instructions}"""

Responda APENAS com o texto da mensagem que deve ser enviada ao cliente ${params.contactName}. Nada de "aqui está a resposta:" ou aspas.`;

  let reply = "";
  try {
    const { text } = await generateText({
      model,
      system,
      messages: [{ role: "user", content: params.incomingText || "(cliente respondeu)" }],
    });
    reply = (text ?? "").trim();
  } catch (err) {
    console.error("[eva auto-reply] AI error", err);
    return `error:ai:${err instanceof Error ? err.message : String(err)}`;
  }
  if (!reply) {
    console.warn("[eva auto-reply] IA retornou vazio");
    return "error:ai_empty";
  }

  // Trava de segurança: a EVA só pode se despedir/encerrar quando o cliente
  // pediu explicitamente para não receber mais mensagens.
  const { isExplicitOptOut, looksLikeFarewell } = await import("./optout");
  if (looksLikeFarewell(reply) && !isExplicitOptOut(params.incomingText)) {
    console.warn("[eva auto-reply] despedida indevida bloqueada — regenerando");
    try {
      const { text } = await generateText({
        model,
        system:
          system +
          "\n\nATENÇÃO: o cliente NÃO pediu para parar de receber mensagens. É PROIBIDO se despedir, agradecer o retorno encerrando ou dizer que não vai mais incomodar. Responda avançando a conversa e, se houver interesse em reunião, confirme dia e horário.",
        messages: [{ role: "user", content: params.incomingText || "(cliente respondeu)" }],
      });
      const retry = (text ?? "").trim();
      if (retry && !looksLikeFarewell(retry)) reply = retry;
      else reply = "Perfeito! Me confirma o melhor dia e horário para você que eu já reservo na agenda.";
    } catch {
      reply = "Perfeito! Me confirma o melhor dia e horário para você que eu já reservo na agenda.";
    }
  }

  const res = await sendAndLog({
    workspaceId: params.workspaceId,
    to: params.to,
    body: reply,
    contactId: params.contactId,
    title: "EVA respondeu automaticamente",
    tag: "eva-auto-reply",
  });
  console.log(`[eva auto-reply] enviado ok=${res.ok} contact=${params.contactId} err=${res.error ?? "-"}`);
  return res.ok ? `sent:${res.messageId ?? ""}` : `send_failed:${res.error ?? ""}`;
}
