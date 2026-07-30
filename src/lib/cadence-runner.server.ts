// Núcleo da automação de cadência: seleção de contatos, envio via Meta Cloud API,
// resposta automática usando as instruções cadastradas por dia.
// Server-only.

import { sendAndLog } from "./messaging.server";

type AdminClient = Awaited<ReturnType<typeof loadAdmin>>;

async function loadAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function firstName(name: string) {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

function renderScript(tpl: string, ctx: { nome: string }) {
  return (tpl ?? "").replaceAll("{{nome}}", ctx.nome);
}

export type BatchResult = {
  slot: "morning" | "afternoon";
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

/**
 * Seleciona até `batchSize` contatos elegíveis e dispara a próxima mensagem
 * da cadência para cada um. Um contato é elegível quando:
 *   - cadence_active = true
 *   - do_not_contact = false
 *   - cadence_day < maior dia cadastrado
 *   - último contato anterior às 00:00 de hoje (ou nulo)
 */
export async function runCadenceBatch(
  slot: "morning" | "afternoon",
  batchSize: number,
): Promise<BatchResult> {
  const admin = await loadAdmin();
  const result: BatchResult = { slot, attempted: 0, sent: 0, failed: 0, skipped: 0, errors: [] };

  const { data: steps } = await (admin as any)
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

  // Dia 1 (cadence_day = 0) só dispara para leads no estágio "novo_lead".
  // A partir do Dia 2, mantém a cadência para quem já foi iniciado.
  const baseQuery = (admin as any)
    .from("contacts")
    .select("id, name, whatsapp, phone, cadence_day, last_contact_at, funnel_stage")
    .eq("cadence_active", true)
    .eq("do_not_contact", false)
    .lt("cadence_day", maxDay)
    .or(`last_contact_at.is.null,last_contact_at.lt.${todayIso}`)
    .order("last_contact_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);
  const { data: candidatesRaw } = await baseQuery;
  const candidates = (candidatesRaw ?? []).filter((c: any) => {
    const day = (c.cadence_day ?? 0) + 1;
    if (day === 1) return c.funnel_stage === "novo_lead";
    return true;
  });

  const list = candidates ?? [];
  result.attempted = list.length;
  const nowIso = new Date().toISOString();

  for (const c of list) {
    const to = (c.whatsapp ?? c.phone ?? "").toString();
    if (!to.replace(/\D/g, "")) {
      result.skipped++;
      continue;
    }
    const nextDay = (c.cadence_day ?? 0) + 1;
    const tpl = scriptByDay.get(nextDay);
    if (!tpl) {
      result.skipped++;
      continue;
    }
    const body = renderScript(tpl, { nome: firstName(c.name ?? "") });

    const send = await sendAndLog({
      to,
      body,
      contactId: c.id,
      title: `Cadência Dia ${nextDay} (${slot === "morning" ? "manhã" : "tarde"})`,
      tag: `cadence-day-${nextDay}-${slot}`,
    });
    if (send.ok) {
      result.sent++;
      await (admin as any)
        .from("contacts")
        .update({
          cadence_day: nextDay,
          last_contact_at: nowIso,
          cadence_active: nextDay < maxDay,
        })
        .eq("id", c.id);
    } else {
      result.failed++;
      if (send.error) result.errors.push(`${c.name}: ${send.error}`);
    }
  }

  const stampField = slot === "morning" ? "last_morning_run_at" : "last_afternoon_run_at";
  await (admin as any).from("cadence_settings").update({ [stampField]: nowIso }).eq("id", true);

  return result;
}

/**
 * Gera e envia uma resposta automática usando a instrução do dia atual + Lovable AI.
 * Chamado pelo webhook quando um contato ativo responde.
 */
export async function autoReplyToInbound(params: {
  contactId: string;
  contactName: string;
  to: string;
  incomingText: string;
  currentDay: number;
}): Promise<string> {
  const admin = await loadAdmin();

  const { data: settingsRow } = await (admin as any)
    .from("cadence_settings")
    .select("auto_reply_enabled")
    .eq("id", true)
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

  const system = `Você é a EVA, SDR (Sales Development Representative) sênior da Valéria — programa Bio Impact. Fala por WhatsApp, em português do Brasil.

COMO UM SDR EXPERIENTE SE COMPORTA:
- Conduz a conversa: toda mensagem termina com UMA pergunta ou um convite claro (nunca deixa a conversa morrer).
- Escuta antes de vender: qualifica com perguntas sobre contexto, dor, prioridade e decisão — sem parecer interrogatório.
- Mensagens curtas (1 a 3 linhas), linguagem humana, sem jargão corporativo, sem textão, no máximo 1 emoji e só quando cair bem.
- Personaliza usando o que o cliente já disse; nunca repete o script literalmente se ele já respondeu.
- Trata objeção com empatia + reenquadre + próxima pergunta ("faz sentido", "entendo", e segue). Nunca insiste duas vezes na mesma objeção.
- Objetivo primário: agendar uma conversa de 15 a 30 minutos. Ao perceber interesse, propõe dia e horário concretos.
- Se o cliente pedir para parar, agradece, encerra com elegância e não insiste.
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

  const res = await sendAndLog({
    to: params.to,
    body: reply,
    contactId: params.contactId,
    title: "EVA respondeu automaticamente",
    tag: "eva-auto-reply",
  });
  console.log(`[eva auto-reply] enviado ok=${res.ok} contact=${params.contactId} err=${res.error ?? "-"}`);
  return res.ok ? `sent:${res.messageId ?? ""}` : `send_failed:${res.error ?? ""}`;
}

export async function _adminForTests(): Promise<AdminClient> {
  return loadAdmin();
}