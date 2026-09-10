// REGRA CENTRAL ÚNICA: quando uma conversa precisa de atendimento humano.
//
// Usada pelo Dashboard (Central de Operações), pelo módulo de WhatsApp e por
// qualquer outra tela que mostre "conversas para atender". Nunca altera dados:
// apenas classifica e filtra.
//
// Um contato NÃO é elegível quando:
//  - foi excluído (deleted_at);
//  - respondeu "não"/pediu remoção → do_not_contact = true (o roteador de
//    entrada marca isso automaticamente ao detectar opt-out);
//  - a resposta foi identificada como automação/URA → is_bot = true;
//  - o contato está encerrado/sem interesse (status ou etapa de perdido);
//  - a conversa já foi assumida manualmente por uma pessoa (human_takeover):
//    continua na tela do WhatsApp, mas não é fila de atendimento pendente.

/** Colunas mínimas necessárias para avaliar a elegibilidade. */
export const ELIGIBILITY_COLUMNS =
  "id, name, is_bot, do_not_contact, status, funnel_stage, presale_stage, sales_stage, human_takeover, last_inbound_at, last_outbound_at, conversation_origin, origin_campaign_id";

/** Origem de conversa criada pelos Disparos (campanhas) — fica na aba WhatsApp. */
export const CAMPAIGN_ORIGIN = "disparo";

/** Status de contato que indicam conversa encerrada / sem interesse. */
export const CLOSED_CONTACT_STATUSES = ["perdido", "encerrado", "descartado", "automacao"] as const;

/** Etapas (funil / pré-venda / venda) que indicam conversa encerrada. */
export const CLOSED_STAGES = [
  "perdido",
  "perdido_cadencia",
  "perdido_desqualificado",
  "perdido_desinteresse",
  "perdido_apresentado",
  "perdido_fim_cadencia",
  "cancelados",
] as const;

export type EligibilityContact = {
  is_bot?: boolean | null;
  do_not_contact?: boolean | null;
  status?: string | null;
  funnel_stage?: string | null;
  presale_stage?: string | null;
  sales_stage?: string | null;
  human_takeover?: boolean | null;
  last_inbound_at?: string | null;
  conversation_origin?: string | null;
};

function isClosedStage(v?: string | null) {
  return Boolean(v) && (CLOSED_STAGES as readonly string[]).includes(String(v));
}

/** Regra central: este contato precisa de atendimento humano? */
export function isEligibleForAttendance(
  c: EligibilityContact,
  opts: { requireInbound?: boolean; ignoreTakeover?: boolean } = {},
): boolean {
  if (c.is_bot) return false;
  if (c.do_not_contact) return false;
  if ((CLOSED_CONTACT_STATUSES as readonly string[]).includes(String(c.status ?? ""))) return false;
  if (isClosedStage(c.funnel_stage) || isClosedStage(c.presale_stage) || isClosedStage(c.sales_stage)) return false;
  if (!opts.ignoreTakeover && c.human_takeover) return false;
  if (opts.requireInbound && !c.last_inbound_at) return false;
  return true;
}

/**
 * Aplica a mesma regra diretamente numa consulta ao banco (PostgREST),
 * para que a filtragem aconteça na origem dos dados e não só na tela.
 */
export function applyEligibilityFilters(q: any, opts: { ignoreTakeover?: boolean } = {}) {
  const statuses = CLOSED_CONTACT_STATUSES.join(",");
  const stages = CLOSED_STAGES.join(",");
  // Cada .or() é somado com AND; a variante ".is.null" preserva contatos sem
  // status/etapa preenchidos (NOT IN sozinho descartaria linhas nulas).
  let out = q
    .is("deleted_at", null)
    .or("is_bot.is.null,is_bot.eq.false")
    .or("do_not_contact.is.null,do_not_contact.eq.false")
    .or(`status.is.null,status.not.in.(${statuses})`)
    .or(`funnel_stage.is.null,funnel_stage.not.in.(${stages})`)
    .or(`presale_stage.is.null,presale_stage.not.in.(${stages})`)
    .or(`sales_stage.is.null,sales_stage.not.in.(${stages})`);
  if (!opts.ignoreTakeover) out = out.or("human_takeover.is.null,human_takeover.eq.false");
  return out;
}
