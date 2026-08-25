// Roteador de mensagens recebidas da EVA.
// Responsabilidades:
//  1. Debounce de 8s: agrupa mensagens seguidas do mesmo contato e gera UMA resposta.
//  2. Detecção de robô/atendimento automático (não conversa com bot).
//  3. Respeita o modo manual (ai_paused) quando a Valéria assume a conversa.

const DEBOUNCE_MS = 8000;

async function admin(wid: string) {
  const { wsDb } = await import("./workspace-scope.server");
  return (await wsDb(wid)) as any;
}

const BOT_PATTERNS: { re: RegExp; reason: string }[] = [
  { re: /mensagem autom[áa]tica|resposta autom[áa]tica|este n[úu]mero n[ãa]o recebe|n[ãa]o responda (a )?esta mensagem/i, reason: "Mensagem automática declarada" },
  { re: /digite\s*[1-9]|tecle\s*[1-9]|responda com o n[úu]mero|escolha uma (das )?op[çc][õo]es|menu de atendimento/i, reason: "Menu de URA / opções numéricas" },
  { re: /sou (o|a) (assistente|atendente) virtual|assistente virtual|chatbot|bot de atendimento|atendimento autom[áa]tico/i, reason: "Assistente virtual identificado" },
  { re: /hor[áa]rio de atendimento.*(segunda|seg\.).*(sexta|sex)/i, reason: "Resposta padrão de horário de atendimento" },
  { re: /protocolo (de atendimento )?n?[ºo°]?\s*\d{4,}/i, reason: "Protocolo automático" },
  { re: /aguarde.*(um|alguns) (momento|instante)s?.*atendente/i, reason: "Fila de atendimento automatizada" },
];

export function detectBotHeuristic(text: string): string | null {
  const t = (text ?? "").trim();
  if (!t) return null;
  for (const p of BOT_PATTERNS) if (p.re.test(t)) return p.reason;
  return null;
}

/** Marca o contato como robô, encerra cadência e registra no histórico. */
async function markAsBot(wid: string, contactId: string, reason: string) {
  const db = await admin(wid);
  await db
    .from("contacts")
    .update({ is_bot: true, bot_reason: reason, cadence_active: false, do_not_contact: true, status: "perdido" })
    .eq("id", contactId);
  await db.from("activities").insert({
    contact_id: contactId,
    kind: "bot_detected",
    title: "Atendimento automático detectado",
    content: `A EVA identificou que este número responde por robô/URA (${reason}). Cadência interrompida e resposta automática desativada para não conversar com máquina.`,
  });
}

/**
 * Classifica por IA se as mensagens vieram de um robô, quando a heurística não bateu.
 * Falha em silêncio (assume humano) para nunca travar o fluxo.
 */
async function detectBotAI(text: string): Promise<string | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  try {
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const { generateText } = await import("ai");
    const gateway = createLovableAiGatewayProvider(key);
    const { text: out } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      system:
        "Classifique a mensagem de WhatsApp abaixo. Responda APENAS com BOT: <motivo curto> quando for claramente uma resposta automática, URA, menu numérico, assistente virtual, autoresponder ou mensagem de sistema. Caso contrário responda apenas HUMANO. Na dúvida, responda HUMANO.",
      messages: [{ role: "user", content: text.slice(0, 1500) }],
    });
    const clean = (out ?? "").trim();
    if (/^bot\b/i.test(clean)) return clean.replace(/^bot:?\s*/i, "").slice(0, 200) || "Detectado por IA";
    return null;
  } catch {
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type InboundRouteResult = string;

/**
 * Aguarda 8s, agrupa tudo que chegou nesse intervalo e responde uma única vez.
 * Se outra mensagem chegar durante a espera, esta execução se cancela — a
 * execução mais recente é quem responde (debounce por contato).
 */
export async function routeInbound(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  phone: string;
  incomingText: string;
  cadenceDay: number;
  inboundActivityId?: string;
}): Promise<InboundRouteResult> {
  const wid = params.workspaceId;
  const db = await admin(wid);
  const startedAt = new Date().toISOString();

  await sleep(DEBOUNCE_MS);

  // Chegou mensagem nova durante a janela? Então a execução mais nova responde.
  const { data: newer } = await db
    .from("activities")
    .select("id")
    .eq("contact_id", params.contactId)
    .eq("kind", "whatsapp_in")
    .gt("created_at", startedAt)
    .limit(1);
  if (newer && newer.length > 0) return "debounced:superseded";

  // Agrupa mensagens recebidas desde a última resposta enviada (janela máx. 5 min).
  const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: lastOut } = await db
    .from("activities")
    .select("created_at")
    .eq("contact_id", params.contactId)
    .eq("kind", "whatsapp_out")
    .order("created_at", { ascending: false })
    .limit(1);
  const floor = (lastOut?.[0]?.created_at ?? since) > since ? lastOut![0].created_at : since;

  const { data: inbound } = await db
    .from("activities")
    .select("content, created_at")
    .eq("contact_id", params.contactId)
    .eq("kind", "whatsapp_in")
    .gt("created_at", floor)
    .order("created_at", { ascending: true })
    .limit(20);

  const grouped =
    (inbound ?? []).map((a: any) => (a.content ?? "").trim()).filter(Boolean).join("\n") ||
    params.incomingText;

  // Estado atual do contato (pode ter mudado durante a espera).
  const { data: contactRow } = await db
    .from("contacts")
    .select("is_bot, ai_paused, do_not_contact, human_takeover")
    .eq("id", params.contactId)
    .maybeSingle();
  const contact = (contactRow ?? {}) as { is_bot?: boolean; ai_paused?: boolean; do_not_contact?: boolean; human_takeover?: boolean };

  if (contact.human_takeover) {
    console.log("[inbound-router] Envio automático bloqueado: atendimento assumido por humano.");
    return "skipped:human_takeover";
  }
  if (contact.is_bot) return "skipped:bot";
  if (contact.ai_paused) return "skipped:manual_mode";

  // Pedido explícito para não receber mais mensagens: encerra com elegância.
  const { classifyLeadIntent } = await import("./intent.server");
  const classified = await classifyLeadIntent(grouped);
  if (classified.intent === "opt_out") {
    const { sendAndLog } = await import("./messaging.server");
    await db
      .from("contacts")
      .update({
        do_not_contact: true,
        cadence_active: false,
        status: "perdido",
        funnel_stage: "perdido",
        next_action: null,
        next_action_at: null,
      })
      .eq("id", params.contactId);
    await db.from("activities").insert({
      contact_id: params.contactId,
      kind: "nota",
      title: "Recusa / pedido de remoção detectado",
      content: `Detecção: ${classified.source === "ai" ? "IA" : "padrão de texto"} — ${classified.reason ?? "recusa"}.\nCadência encerrada, lead marcado como "não entrar em contato" e movido para Perdido.\n\nMensagem: ${grouped.slice(0, 500)}`,
    });
    await sendAndLog({
      workspaceId: wid,
      to: params.phone,
      body: "Entendido, agradeço a sinceridade! Já removi seu contato da nossa lista e não vou mais te enviar mensagens. Desejo sucesso — qualquer coisa, estou por aqui.",
      contactId: params.contactId,
      title: "EVA — encerramento por solicitação",
      tag: "eva-optout",
    });
    return "opt_out";
  }

  // Detecção de robô
  const reason = detectBotHeuristic(grouped) ?? (await detectBotAI(grouped));
  if (reason) {
    await markAsBot(wid, params.contactId, reason);
    return `bot_detected:${reason}`;
  }

  // Agendamento tem prioridade sobre a resposta genérica — exceto quando o lead
  // sinalizou encaminhamento interno (aí insistir em horário soa fora de contexto).
  if (classified.intent !== "handoff_interno") try {
    const { handleSchedulingMessage } = await import("./scheduling.server");
    const { sendAndLog } = await import("./messaging.server");
    const outcome = await handleSchedulingMessage({
      workspaceId: wid,
      contactId: params.contactId,
      contactName: params.contactName,
      phone: params.phone,
      text: grouped,
    });
    if (outcome.handled && outcome.reply) {
      const sent = await sendAndLog({
        workspaceId: wid,
        to: params.phone,
        body: outcome.reply,
        contactId: params.contactId,
        title: "EVA — agendamento",
        tag: `eva-scheduling-${outcome.status}`,
      });
      return `scheduling:${outcome.status}:${sent.ok ? "sent" : sent.error}`;
    }
    // Agenda indisponível, mas o cliente quer marcar/remarcar: nunca cai na
    // resposta genérica (que já se despediu por engano no passado).
    if (outcome.status === "calendar_not_connected") {
      const sent = await sendAndLog({
        workspaceId: wid,
        to: params.phone,
        body: "Combinado! Me confirma o dia e o horário que preferir que eu já reservo na agenda e te envio o convite com o link da reunião.",
        contactId: params.contactId,
        title: "EVA — agendamento (agenda indisponível)",
        tag: "eva-scheduling-fallback",
      });
      return `scheduling:fallback:${sent.ok ? "sent" : sent.error}`;
    }
  } catch (err) {
    console.error("[inbound-router] scheduling failed", err);
  }

  const { autoReplyToInbound } = await import("./cadence-runner.server");
  const status = await autoReplyToInbound({
    workspaceId: wid,
    contactId: params.contactId,
    contactName: params.contactName,
    to: params.phone,
    incomingText: grouped,
    currentDay: params.cadenceDay || 1,
    signal: classified.intent === "handoff_interno" ? "handoff_interno" : undefined,
  });
  return `autoreply:${status}`;
}
