// Camada unificada de mensageria WhatsApp.
// Todo envio (CRM, Cadência, EVA, Teste) e todo recebimento (webhook) passa aqui.
// Grava em `activities` — fonte única para WhatsApp, CRM, Histórico e Cadências.

import { normalizePhoneNumber } from "./phone";
import { sendWhatsappText, sendWhatsappTemplate, loadMetaConfig } from "./whatsapp.server";

import { wsDb } from "./workspace-scope.server";

/** Todo acesso ao banco aqui é escopado ao workspace (isolamento multi-tenant). */
async function admin(workspaceId: string) {
  return wsDb(workspaceId);
}

export type SendAndLogInput = {
  /** Empresa/ambiente dono do envio. Obrigatório. */
  workspaceId: string;
  to: string;
  body: string;
  contactId?: string | null;
  /** Número da EVA que deve enviar. Se ausente, usa o número da conversa ou o principal. */
  whatsappNumberId?: string | null;
  title?: string;
  tag?: string; // ex.: "cadence-day-1", "crm-manual", "eva-auto", "test"
  /** Força o uso de template aprovado, mesmo com janela aberta. */
  forceTemplate?: boolean;
  /** Template aprovado a usar quando a janela de 24h estiver fechada. */
  templateName?: string;
  templateLang?: string;
  /** Autor do envio (usuário logado) quando for envio manual. */
  sentBy?: string | null;
  sentByName?: string | null;
  /** "manual" | "eva" | "cadencia" | "teste" */
  sendMode?: string;
};

export type SendAndLogResult = {
  ok: boolean;
  to: string;
  messageId?: string;
  error?: string;
  activityId?: string;
  raw?: unknown;
  usedTemplate?: boolean;
  whatsappNumberId?: string | null;
};

/**
 * Janela de atendimento de 24h: existe se houve mensagem RECEBIDA do contato
 * nas últimas 24 horas. Sem contato conhecido, procura por telefone no histórico.
 */
export async function hasOpenWindow(workspaceId: string, contactId?: string | null, phone?: string): Promise<boolean> {
  const db = await admin(workspaceId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (contactId) {
    const { data } = await db
      .from("activities")
      .select("id")
      .eq("contact_id", contactId)
      .eq("kind", "whatsapp_in")
      .gte("created_at", since)
      .limit(1);
    if (data && data.length > 0) return true;
    return false;
  }
  if (phone) {
    const contact = await findContactByPhone(workspaceId, phone);
    if (contact?.id) return hasOpenWindow(workspaceId, contact.id);
  }
  return false;
}

/**
 * Envia via Meta Cloud API e grava no histórico unificado (`activities`).
 * Deve ser a única porta de saída do sistema.
 */
export async function sendAndLog(input: SendAndLogInput): Promise<SendAndLogResult> {
  const wid = input.workspaceId;
  const db = await admin(wid);
  const to = normalizePhoneNumber(input.to ?? "");
  const tag = input.tag ?? "manual";

  if (!to || to.length < 12) {
    console.warn(`[msg:out] telefone inválido tag=${tag} raw=${input.to}`);
    return { ok: false, to, error: "Número inválido (use DDD + número)." };
  }

  // Qual número da EVA envia: pedido explícito > número já usado na conversa > principal.
  const { resolveSendNumber } = await import("./wa-numbers.server");
  let preferred = input.whatsappNumberId ?? null;
  if (!preferred && input.contactId) {
    const { data: c } = await db.from("contacts").select("whatsapp_number_id").eq("id", input.contactId).maybeSingle();
    preferred = ((c as any)?.whatsapp_number_id as string | null) ?? null;
  }
  const number = await resolveSendNumber(wid, preferred);
  const numberId = number?.id ?? null;
  if (!number) {
    console.warn(`[msg:out] nenhum número de WhatsApp ativo no workspace ${wid}`);
  }
  console.log(
    `[msg:out] tag=${tag} contact=${input.contactId ?? "-"} to=${to} numero=${number?.label ?? "legado"} len=${(input.body ?? "").length}`,
  );

  // Decide entre mensagem livre (janela 24h aberta) e template aprovado.
  const windowOpen = input.forceTemplate ? false : await hasOpenWindow(wid, input.contactId ?? null, to);
  let usedTemplate = false;
  let send = windowOpen
    ? await sendWhatsappText(wid, to, input.body ?? "", numberId)
    : await (async () => {
        usedTemplate = true;
        const cfg = await loadMetaConfig(wid, numberId);
        const name = input.templateName || cfg.defaultTemplateName;
        const lang = input.templateLang || cfg.defaultTemplateLang;
        const contactName = input.contactId ? await contactFirstName(wid, input.contactId) : "";
        const attempt = async (tplName: string) => {
          // Primeiro sem parâmetros; se a Meta exigir variáveis, tenta com o nome.
          const first = await sendWhatsappTemplate(wid, to, tplName, lang, [], numberId);
          if (first.ok) return first;
          const needsParams = /param|variable|132000|132012|132001/i.test(first.error ?? "");
          if (needsParams) return sendWhatsappTemplate(wid, to, tplName, lang, [contactName || "cliente"], numberId);
          return first;
        };
        const primary = await attempt(name);
        if (primary.ok) return primary;
        // Template do dia inexistente/não aprovado -> cai para o template padrão.
        const missing = /132001|does not exist|not found|não existe/i.test(primary.error ?? "");
        if (missing && name !== cfg.defaultTemplateName) {
          console.warn(`[msg:out] template "${name}" indisponível — usando "${cfg.defaultTemplateName}"`);
          return attempt(cfg.defaultTemplateName);
        }
        return primary;
      })();

  if (!windowOpen && !send.ok) {
    console.warn(`[msg:out] template padrão falhou: ${send.error}`);
  }
  const now = new Date().toISOString();

  // Grava mensagem no histórico unificado
  let activityId: string | undefined;
  try {
    const { data } = await db
      .from("activities")
      .insert({
        contact_id: input.contactId ?? null,
        kind: "whatsapp_out",
        title: (input.title ?? "Mensagem enviada") + (usedTemplate ? " (template)" : ""),
        content: usedTemplate
          ? `[Template Meta] Janela de 24h fechada — enviado template aprovado.\n\nConteúdo pretendido:\n${input.body ?? ""}`
          : input.body ?? "",
        external_id: send.messageId ?? null,
        status: send.ok ? "SENT" : "FAILED",
        status_updated_at: now,
        error_message: send.ok ? null : (send.error ?? "Falha no envio (Meta Cloud API)"),
        sent_by: input.sentBy ?? null,
        sent_by_name: input.sentByName ?? null,
        send_mode: input.sendMode ?? (input.sentBy ? "manual" : "eva"),
        whatsapp_number_id: numberId,
      })
      .select("id")
      .maybeSingle();
    activityId = (data as any)?.id;
    console.log(`[msg:out] gravado activity=${activityId ?? "-"} ok=${send.ok} externalId=${send.messageId ?? "-"}`);
  } catch (err) {
    console.error("[msg:out] falha ao gravar activity", err);
  }

  // Atualiza last_contact_at
  if (send.ok && input.contactId) {
    try {
      await db
        .from("contacts")
        .update({ last_contact_at: now, ...(numberId ? { whatsapp_number_id: numberId } : {}) })
        .eq("id", input.contactId);
    } catch (err) {
      console.error("[msg:out] falha ao atualizar contact", err);
    }
  }

  if (!send.ok) {
    console.warn(`[msg:out] Meta erro: ${send.error}`);
  }

  return {
    ok: send.ok,
    to,
    messageId: send.messageId,
    error: send.error,
    activityId,
    raw: send.raw,
    usedTemplate,
    whatsappNumberId: numberId,
  };
}

async function contactFirstName(workspaceId: string, contactId: string): Promise<string> {
  try {
    const db = await admin(workspaceId);
    const { data } = await db.from("contacts").select("name").eq("id", contactId).maybeSingle();
    return ((data as any)?.name ?? "").trim().split(/\s+/)[0] ?? "";
  } catch {
    return "";
  }
}

/**
 * Localiza contato por telefone tentando várias variações do número.
 * Retorna null se não encontrar.
 */
export async function findContactByPhone(workspaceId: string, phoneDigits: string) {
  if (!phoneDigits) return null;
  const db = await admin(workspaceId);
  const digits = phoneDigits.replace(/\D/g, "");
  const normalized = normalizePhoneNumber(digits);
  const withoutDdi = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  const last10 = digits.slice(-10);
  const last8 = digits.slice(-8);

  const candidates = Array.from(new Set([normalized, withoutDdi, digits, last10, last8].filter(Boolean)));
  for (const c of candidates) {
    const { data } = await db
      .from("contacts")
      .select("id, name, whatsapp, phone, cadence_active, cadence_day, funnel_stage")
      .or(`whatsapp.ilike.%${c},phone.ilike.%${c}`)
      .limit(1);
    if (data && data.length > 0) {
      console.log(`[msg:lookup] match via "${c}" -> contact=${data[0].id}`);
      return data[0] as any;
    }
  }
  console.log(`[msg:lookup] nenhum contato para ${normalized}`);
  return null;
}

/**
 * Grava uma mensagem recebida no histórico e retorna a activity criada.
 */
export async function logInbound(params: {
  workspaceId: string;
  contactId: string | null;
  from: string;
  text: string;
  externalId?: string | null;
  title?: string;
  /** Número da EVA que RECEBEU a mensagem (identificado pelo payload da Meta). */
  whatsappNumberId?: string | null;
  /** "RECEIVED" (padrão) ou "UNSUPPORTED" para mídias/códigos que não são resposta real. */
  status?: string;
}) {
  const db = await admin(params.workspaceId);
  const now = new Date().toISOString();
  console.log(`[msg:in] contact=${params.contactId ?? "-"} from=${params.from} len=${params.text.length}`);
  const { data } = await db
    .from("activities")
    .insert({
      contact_id: params.contactId,
      kind: "whatsapp_in",
      title: params.title ?? (params.contactId ? "Resposta recebida" : `Mensagem de ${params.from}`),
      content: params.text,
      external_id: params.externalId ?? null,
      status: params.status ?? "RECEIVED",
      status_updated_at: now,
      whatsapp_number_id: params.whatsappNumberId ?? null,
    })
    .select("id")
    .maybeSingle();
  if (params.contactId) {
    await db
      .from("contacts")
      .update({
        last_contact_at: now,
        ...(params.whatsappNumberId ? { whatsapp_number_id: params.whatsappNumberId } : {}),
      })
      .eq("id", params.contactId);
  }
  return (data as any)?.id as string | undefined;
}