// Núcleo da automação de cadência: seleção de contatos, envio via Meta Cloud API,
// resposta automática usando as instruções cadastradas por dia.
// Server-only.

import { sendWhatsappText } from "./whatsapp.server";

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

  const { data: steps } = await admin
    .from("cadence_steps" as any)
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

  const { data: candidates } = await admin
    .from("contacts")
    .select("id, name, whatsapp, phone, cadence_day, last_contact_at")
    .eq("cadence_active", true)
    .eq("do_not_contact", false)
    .lt("cadence_day", maxDay)
    .or(`last_contact_at.is.null,last_contact_at.lt.${todayIso}`)
    .order("last_contact_at", { ascending: true, nullsFirst: true })
    .limit(batchSize);

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

    const send = await sendWhatsappText(to, body);
    await admin.from("activities").insert({
      contact_id: c.id,
      kind: "whatsapp_out",
      title: `Cadência Dia ${nextDay} (${slot === "morning" ? "manhã" : "tarde"})`,
      content: body,
      external_id: send.messageId ?? null,
      status: send.ok ? "SENT" : "FAILED",
      status_updated_at: nowIso,
    });
    if (send.ok) {
      result.sent++;
      await admin
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
  await admin.from("cadence_settings" as any).update({ [stampField]: nowIso }).eq("id", true);

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
}): Promise<void> {
  const admin = await loadAdmin();

  const { data: settingsRow } = await admin
    .from("cadence_settings" as any)
    .select("auto_reply_enabled")
    .eq("id", true)
    .maybeSingle();
  const settings = (settingsRow ?? {}) as { auto_reply_enabled?: boolean };
  if (!settings.auto_reply_enabled) return;

  const day = Math.max(1, params.currentDay || 1);
  const { data: stepRow } = await admin
    .from("cadence_steps" as any)
    .select("script, ai_instructions")
    .eq("day", day)
    .maybeSingle();
  const step = (stepRow ?? {}) as { script?: string; ai_instructions?: string };

  const key = process.env.LOVABLE_API_KEY;
  if (!key) return;
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const gateway = createLovableAiGatewayProvider(key);
  const model = gateway("google/gemini-2.5-flash");

  const system = `Você é a EVA, assistente da Valéria (Bio Impact). Responde WhatsApp em português do Brasil, tom profissional e caloroso, mensagens curtas (até 3 linhas).
Regras: siga estritamente as instruções abaixo. Se a mensagem do cliente for ambígua, faça UMA pergunta objetiva. Nunca invente preços, datas ou informações que não estão nas instruções. Não use emojis em excesso.

Dia atual da cadência: ${day}
Roteiro enviado neste dia: """${step.script ?? ""}"""
Instruções de resposta cadastradas: """${step.ai_instructions ?? "Se o cliente demonstrar interesse, ofereça agendar uma reunião de 15 minutos. Se pedir para não receber mais, encerre educadamente."}"""

Responda APENAS com o texto da mensagem que deve ser enviada ao cliente ${params.contactName}. Nada de "aqui está a resposta:" ou aspas.`;

  let reply = "";
  try {
    const { text } = await generateText({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: params.incomingText || "(cliente respondeu)" },
      ],
    });
    reply = (text ?? "").trim();
  } catch (err) {
    console.error("[eva auto-reply] AI error", err);
    return;
  }
  if (!reply) return;

  const send = await sendWhatsappText(params.to, reply);
  const now = new Date().toISOString();
  await admin.from("activities").insert({
    contact_id: params.contactId,
    kind: "whatsapp_out",
    title: "EVA respondeu automaticamente",
    content: reply,
    external_id: send.messageId ?? null,
    status: send.ok ? "SENT" : "FAILED",
    status_updated_at: now,
  });
  if (send.ok) {
    await admin
      .from("contacts")
      .update({ last_contact_at: now })
      .eq("id", params.contactId);
  }
}

export async function _adminForTests(): Promise<AdminClient> {
  return loadAdmin();
}