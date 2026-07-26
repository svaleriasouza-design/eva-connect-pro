// Camada unificada de mensageria WhatsApp.
// Todo envio (CRM, Cadência, EVA, Teste) e todo recebimento (webhook) passa aqui.
// Grava em `activities` — fonte única para WhatsApp, CRM, Histórico e Cadências.

import { normalizePhoneNumber } from "./phone";
import { sendWhatsappText } from "./whatsapp.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type SendAndLogInput = {
  to: string;
  body: string;
  contactId?: string | null;
  title?: string;
  tag?: string; // ex.: "cadence-day-1", "crm-manual", "eva-auto", "test"
};

export type SendAndLogResult = {
  ok: boolean;
  to: string;
  messageId?: string;
  error?: string;
  activityId?: string;
  raw?: unknown;
};

/**
 * Envia via Meta Cloud API e grava no histórico unificado (`activities`).
 * Deve ser a única porta de saída do sistema.
 */
export async function sendAndLog(input: SendAndLogInput): Promise<SendAndLogResult> {
  const db = await admin();
  const to = normalizePhoneNumber(input.to ?? "");
  const tag = input.tag ?? "manual";
  console.log(`[msg:out] tag=${tag} contact=${input.contactId ?? "-"} to=${to} len=${(input.body ?? "").length}`);

  if (!to || to.length < 12) {
    console.warn(`[msg:out] telefone inválido tag=${tag} raw=${input.to}`);
    return { ok: false, to, error: "Número inválido (use DDD + número)." };
  }

  const send = await sendWhatsappText(to, input.body ?? "");
  const now = new Date().toISOString();

  // Grava mensagem no histórico unificado
  let activityId: string | undefined;
  try {
    const { data } = await db
      .from("activities")
      .insert({
        contact_id: input.contactId ?? null,
        kind: "whatsapp_out",
        title: input.title ?? "Mensagem enviada",
        content: input.body ?? "",
        external_id: send.messageId ?? null,
        status: send.ok ? "SENT" : "FAILED",
        status_updated_at: now,
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
      await db.from("contacts").update({ last_contact_at: now }).eq("id", input.contactId);
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
  };
}

/**
 * Localiza contato por telefone tentando várias variações do número.
 * Retorna null se não encontrar.
 */
export async function findContactByPhone(phoneDigits: string) {
  if (!phoneDigits) return null;
  const db = await admin();
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
  contactId: string | null;
  from: string;
  text: string;
  externalId?: string | null;
  title?: string;
}) {
  const db = await admin();
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
      status: "RECEIVED",
      status_updated_at: now,
    })
    .select("id")
    .maybeSingle();
  if (params.contactId) {
    await db.from("contacts").update({ last_contact_at: now }).eq("id", params.contactId);
  }
  return (data as any)?.id as string | undefined;
}