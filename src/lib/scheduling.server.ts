// Central Inteligente de Agendamento da EVA (server-only).
// Detecta intenção de agendar / remarcar / cancelar em mensagens de WhatsApp,
// consulta o Google Calendar, cria o evento (com Google Meet) e sincroniza
// Agenda, CRM, Histórico e activities.

import {
  calendarConfigured,
  createEvent,
  deleteEvent,
  formatBr,
  isSlotFree,
  suggestSlots,
  updateEvent,
  DEFAULT_TZ,
} from "./google-calendar.server";

import { wsDb } from "./workspace-scope.server";

/** Banco sempre escopado ao workspace do contato (isolamento multi-tenant). */
async function admin(wid: string) {
  return (await wsDb(wid)) as any;
}

export type SchedulingOutcome = { handled: boolean; reply?: string; status: string };

type Intent = {
  intent: "agendar" | "remarcar" | "cancelar" | "confirmar_horario" | "nenhum";
  datetime: string | null;
  online: boolean;
  email: string | null;
  duration_minutes: number | null;
};

function nowLocalIso() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: DEFAULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date())
    .replace(" ", "T");
}

/** -03:00 fixo de Brasília: converte "local sem fuso" -> ISO UTC. */
function localToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(local ?? "");
  if (!m) {
    const d = new Date(local);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  const [, y, mo, d, h, mi] = m;
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:00-03:00`).toISOString();
}

async function detectIntent(text: string, history: string, hasEmail: boolean, pending: string | null): Promise<Intent | null> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return null;
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const model = createLovableAiGatewayProvider(key)("google/gemini-2.5-flash");
  const system = `Você classifica mensagens de WhatsApp de leads B2B para uma assistente de agendamento.
Agora (horário de Brasília): ${nowLocalIso()}.
${pending ? `Há um horário pendente de confirmação: ${pending}.` : ""}
${hasEmail ? "O contato já tem e-mail cadastrado." : "O contato ainda NÃO tem e-mail cadastrado."}
Histórico recente da conversa:
${history || "(vazio)"}

Responda SOMENTE com JSON válido, sem markdown, no formato:
{"intent":"agendar|remarcar|cancelar|confirmar_horario|nenhum","datetime":"YYYY-MM-DDTHH:mm ou null","online":true,"email":"email ou null","duration_minutes":30}
Regras:
- "agendar": pediu reunião mas sem horário específico.
- "confirmar_horario": informou/aceitou um horário concreto (interprete "amanhã 10h", "quinta às 14", "pode ser o de 16h").
- "remarcar": quer mudar um horário já marcado.
- "cancelar": quer cancelar.
- "nenhum": assunto que não é agendamento.
- datetime sempre no futuro, horário de Brasília, formato local sem fuso.
- email: extraia se a mensagem contiver um endereço de e-mail.`;
  try {
    const { text: out } = await generateText({ model, system, messages: [{ role: "user", content: text }] });
    const raw = (out ?? "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(raw) as Intent;
    return parsed;
  } catch (err) {
    console.error("[eva agenda] falha ao classificar intenção", err);
    return null;
  }
}

async function recentHistory(wid: string, contactId: string) {
  const db = await admin(wid);
  const { data } = await db
    .from("activities")
    .select("kind, content, created_at")
    .eq("contact_id", contactId)
    .in("kind", ["whatsapp_in", "whatsapp_out"])
    .order("created_at", { ascending: false })
    .limit(10);
  return ((data ?? []) as any[])
    .reverse()
    .map((a) => `${a.kind === "whatsapp_in" ? "Cliente" : "EVA"}: ${(a.content ?? "").slice(0, 300)}`)
    .join("\n");
}

async function logActivity(wid: string, contactId: string, title: string, content: string, kind = "reuniao") {
  const db = await admin(wid);
  await db.from("activities").insert({ contact_id: contactId, kind, title, content, status: "OK", status_updated_at: new Date().toISOString() });
}

async function setStage(wid: string, contactId: string, stage: string, motivo: string) {
  const db = await admin(wid);
  const { data: before } = await db.from("contacts").select("funnel_stage").eq("id", contactId).maybeSingle();
  if ((before as any)?.funnel_stage === stage) return;
  await db.from("contacts").update({ funnel_stage: stage, updated_at: new Date().toISOString() }).eq("id", contactId);
  await logActivity(wid, contactId, `Funil: ${(before as any)?.funnel_stage ?? "—"} → ${stage}`, motivo, "nota");
}

async function getState(wid: string, contactId: string) {
  const db = await admin(wid);
  const { data } = await db.from("eva_scheduling_state").select("*").eq("contact_id", contactId).maybeSingle();
  return (data ?? null) as any;
}

async function setState(wid: string, contactId: string, patch: Record<string, unknown>) {
  const db = await admin(wid);
  await db
    .from("eva_scheduling_state")
    .upsert({ contact_id: contactId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "contact_id" });
}

async function clearState(wid: string, contactId: string) {
  const db = await admin(wid);
  await db.from("eva_scheduling_state").delete().eq("contact_id", contactId);
}

async function upcomingEvent(wid: string, contactId: string) {
  const db = await admin(wid);
  const { data } = await db
    .from("events")
    .select("*")
    .eq("contact_id", contactId)
    .eq("status", "agendado")
    .gte("starts_at", new Date(Date.now() - 2 * 3600 * 1000).toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as any;
}

function slotsPhrase(slots: string[]) {
  return slots.map((s) => formatBr(s).completo).join(", ");
}

/** Cria de fato o evento (Google + Agenda + CRM + Histórico). */
export async function scheduleMeeting(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  phone: string;
  startIso: string;
  durationMinutes?: number;
  online?: boolean;
  email?: string | null;
  title?: string;
}): Promise<{ ok: boolean; error?: string; meetLink?: string; eventId?: string }> {
  const wid = params.workspaceId;
  const db = await admin(wid);
  const duration = params.durationMinutes ?? 30;
  const free = await isSlotFree(params.startIso, duration);
  if (!free.ok) return { ok: false, error: free.error };
  if (!free.data) return { ok: false, error: "busy" };

  const summary = params.title ?? `Reunião / Sessão - ${params.contactName}`;
  const created = await createEvent({
    summary,
    description: `Agendado automaticamente pela EVA.\nWhatsApp do lead: ${params.phone}\nContato: ${params.contactName}`,
    startIso: params.startIso,
    durationMinutes: duration,
    attendeeEmail: params.email ?? null,
    withMeet: params.online !== false,
  });
  if (!created.ok) return { ok: false, error: created.error };

  const { data: contact } = await db.from("contacts").select("company_id").eq("id", params.contactId).maybeSingle();
  const { data: ev } = await db
    .from("events")
    .insert({
      title: summary,
      kind: "reuniao",
      contact_id: params.contactId,
      company_id: (contact as any)?.company_id ?? null,
      starts_at: params.startIso,
      ends_at: new Date(new Date(params.startIso).getTime() + duration * 60000).toISOString(),
      duration_minutes: duration,
      meet_link: created.data.meetLink ?? null,
      google_event_id: created.data.id,
      attendee_email: params.email ?? null,
      status: "agendado",
      source: "eva",
      location: params.online === false ? "Presencial" : "Google Meet",
    })
    .select("id")
    .maybeSingle();

  const f = formatBr(params.startIso);
  await logActivity(
    wid,
    params.contactId,
    "Reunião agendada pela EVA",
    `${f.completo} · ${duration} min${created.data.meetLink ? `\nMeet: ${created.data.meetLink}` : ""}${params.email ? `\nConvite enviado para ${params.email}` : ""}`,
  );
  await db
    .from("contacts")
    .update({ next_action: "Reunião agendada", next_action_at: params.startIso })
    .eq("id", params.contactId);
  await setStage(wid, params.contactId, "reuniao_agendada", "Reunião confirmada no Google Calendar.");
  await clearState(wid, params.contactId);

  return { ok: true, meetLink: created.data.meetLink, eventId: (ev as any)?.id };
}

export async function cancelMeeting(wid: string, contactId: string, motivo = "Cancelado pelo cliente via WhatsApp") {
  const db = await admin(wid);
  const ev = await upcomingEvent(wid, contactId);
  if (!ev) return { ok: false, error: "no_event" };
  if (ev.google_event_id) await deleteEvent(ev.google_event_id);
  await db.from("events").update({ status: "cancelado" }).eq("id", ev.id);
  await logActivity(wid, contactId, "Reunião cancelada", `${formatBr(ev.starts_at).completo}\n${motivo}`);
  await db.from("contacts").update({ next_action: null, next_action_at: null }).eq("id", contactId);
  await setStage(wid, contactId, "qualificado", "Reunião cancelada — lead volta para acompanhamento.");
  return { ok: true, event: ev };
}

export async function rescheduleMeeting(wid: string, contactId: string, startIso: string) {
  const db = await admin(wid);
  const ev = await upcomingEvent(wid, contactId);
  if (!ev) return { ok: false, error: "no_event" };
  const duration = ev.duration_minutes ?? 30;
  const free = await isSlotFree(startIso, duration);
  if (!free.ok) return { ok: false, error: free.error };
  if (!free.data) return { ok: false, error: "busy" };
  if (ev.google_event_id) {
    const upd = await updateEvent(ev.google_event_id, startIso, duration);
    if (!upd.ok) return { ok: false, error: upd.error };
  }
  await db
    .from("events")
    .update({
      starts_at: startIso,
      ends_at: new Date(new Date(startIso).getTime() + duration * 60000).toISOString(),
      status: "agendado",
      reminder_24h_sent_at: null,
      reminder_1h_sent_at: null,
    })
    .eq("id", ev.id);
  await logActivity(wid, contactId, "Reunião remarcada", `De ${formatBr(ev.starts_at).completo}\nPara ${formatBr(startIso).completo}`);
  await db.from("contacts").update({ next_action: "Reunião agendada", next_action_at: startIso }).eq("id", contactId);
  await setStage(wid, contactId, "reuniao_agendada", "Reunião remarcada.");
  return { ok: true, event: { ...ev, starts_at: startIso } };
}

/**
 * Ponto de entrada chamado pelo webhook. Retorna handled=true quando a EVA
 * tratou a mensagem como agendamento (nesse caso a resposta já está pronta).
 */
export async function handleSchedulingMessage(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  phone: string;
  text: string;
}): Promise<SchedulingOutcome> {
  const wid = params.workspaceId;
  const db = await admin(wid);
  const { data: contactRow } = await db.from("contacts").select("email, name").eq("id", params.contactId).maybeSingle();
  const contact = (contactRow ?? {}) as { email?: string | null; name?: string | null };
  const state = await getState(wid, params.contactId);

  const history = await recentHistory(wid, params.contactId);
  const intent = await detectIntent(
    params.text,
    history,
    Boolean(contact.email),
    state?.pending_start ? formatBr(state.pending_start).completo : null,
  );
  if (!intent) return { handled: false, status: "intent_error" };

  // Se estava esperando e-mail e o cliente mandou um, fecha o agendamento.
  if (state?.awaiting_email && intent.email) {
    await db.from("contacts").update({ email: intent.email }).eq("id", params.contactId);
    await logActivity(wid, params.contactId, "E-mail capturado pela EVA", intent.email, "nota");
    const startIso = state.pending_start as string;
    const res = await scheduleMeeting({
      workspaceId: wid,
      contactId: params.contactId,
      contactName: contact.name ?? params.contactName,
      phone: params.phone,
      startIso,
      durationMinutes: state.duration_minutes ?? 30,
      online: state.online ?? true,
      email: intent.email,
    });
    if (!res.ok) return { handled: true, reply: await busyReply(startIso, state.duration_minutes ?? 30, res.error), status: `schedule_failed:${res.error}` };
    return { handled: true, reply: confirmText(startIso, state.duration_minutes ?? 30, res.meetLink, intent.email), status: "scheduled" };
  }

  if (intent.intent === "nenhum") return { handled: false, status: "no_intent" };

  if (!(await calendarConfigured(wid))) {
    return { handled: false, status: "calendar_not_connected" };
  }

  if (intent.email && !contact.email) {
    await db.from("contacts").update({ email: intent.email }).eq("id", params.contactId);
    contact.email = intent.email;
    await logActivity(wid, params.contactId, "E-mail capturado pela EVA", intent.email, "nota");
  }

  if (intent.intent === "cancelar") {
    const res = await cancelMeeting(wid, params.contactId);
    if (!res.ok) return { handled: true, reply: "Não localizei nenhuma reunião ativa no seu nome. Quer que eu agende uma?", status: "cancel_no_event" };
    return { handled: true, reply: "Prontinho, sua reunião foi cancelada e removida da agenda. Se quiser remarcar, é só me dizer o melhor dia e horário.", status: "cancelled" };
  }

  const duration = intent.duration_minutes ?? 30;

  if (intent.intent === "agendar" && !intent.datetime) {
    const slots = await suggestSlots({ durationMinutes: duration, limit: 3 });
    if (!slots.ok || slots.data.length === 0) {
      return { handled: true, reply: "Que ótimo! Me diga o melhor dia e horário para você que eu confirmo na agenda.", status: "ask_time" };
    }
    await setState(wid, params.contactId, { suggested: slots.data, duration_minutes: duration, online: intent.online !== false, awaiting_email: false, pending_start: null });
    await setStage(wid, params.contactId, "qualificado", "Lead demonstrou interesse em agendar reunião.");
    return { handled: true, reply: `Perfeito! Tenho estes horários livres: ${slotsPhrase(slots.data)}. Qual fica melhor para você?`, status: "suggested" };
  }

  const startIso = intent.datetime ? localToIso(intent.datetime) : null;

  if (intent.intent === "remarcar") {
    if (!startIso) {
      const slots = await suggestSlots({ durationMinutes: duration, limit: 3 });
      const phrase = slots.ok && slots.data.length ? ` Tenho livre: ${slotsPhrase(slots.data)}.` : "";
      return { handled: true, reply: `Claro, podemos remarcar.${phrase} Qual horário prefere?`, status: "reschedule_ask" };
    }
    const res = await rescheduleMeeting(wid, params.contactId, startIso);
    if (!res.ok && res.error === "no_event") {
      return await scheduleFlow({ ...params, workspaceId: wid, contact, startIso, duration, online: intent.online !== false });
    }
    if (!res.ok) return { handled: true, reply: await busyReply(startIso, duration, res.error), status: `reschedule_failed:${res.error}` };
    const f = formatBr(startIso);
    return {
      handled: true,
      reply: `Reunião remarcada com sucesso!\nData: ${f.data}\nHorário: ${f.hora}\nO convite atualizado já foi enviado. Até breve!`,
      status: "rescheduled",
    };
  }

  if (!startIso) return { handled: false, status: "no_datetime" };
  return await scheduleFlow({ ...params, workspaceId: wid, contact, startIso, duration, online: intent.online !== false });
}

async function scheduleFlow(args: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  phone: string;
  contact: { email?: string | null; name?: string | null };
  startIso: string;
  duration: number;
  online: boolean;
}): Promise<SchedulingOutcome> {
  const free = await isSlotFree(args.startIso, args.duration);
  if (!free.ok) return { handled: true, reply: "Tive um problema para consultar a agenda agora. Pode confirmar o horário novamente em instantes?", status: `calendar_error:${free.error}` };
  if (!free.data) {
    const slots = await suggestSlots({ fromIso: args.startIso, durationMinutes: args.duration, limit: 3 });
    const phrase = slots.ok && slots.data.length ? `Tenho disponibilidade em ${slotsPhrase(slots.data)}. Qual prefere?` : "Pode me sugerir outro horário?";
    await setState(args.workspaceId, args.contactId, { suggested: slots.ok ? slots.data : null, duration_minutes: args.duration, online: args.online, awaiting_email: false, pending_start: null });
    return { handled: true, reply: `Neste horário já existe um compromisso. ${phrase}`, status: "busy" };
  }

  if (!args.contact.email) {
    await setState(args.workspaceId, args.contactId, { pending_start: args.startIso, duration_minutes: args.duration, online: args.online, awaiting_email: true });
    const f = formatBr(args.startIso);
    await setStage(args.workspaceId, args.contactId, "qualificado", "Horário combinado — aguardando e-mail para enviar o convite.");
    return { handled: true, reply: `Consegui reservar ${f.data} às ${f.hora}. Qual é o seu melhor e-mail para eu enviar o convite com o link da reunião?`, status: "awaiting_email" };
  }

  const res = await scheduleMeeting({
    workspaceId: args.workspaceId,
    contactId: args.contactId,
    contactName: args.contact.name ?? args.contactName,
    phone: args.phone,
    startIso: args.startIso,
    durationMinutes: args.duration,
    online: args.online,
    email: args.contact.email,
  });
  if (!res.ok) return { handled: true, reply: await busyReply(args.startIso, args.duration, res.error), status: `schedule_failed:${res.error}` };
  return { handled: true, reply: confirmText(args.startIso, args.duration, res.meetLink, args.contact.email), status: "scheduled" };
}

async function busyReply(startIso: string, duration: number, error?: string) {
  if (error === "busy") {
    const slots = await suggestSlots({ fromIso: startIso, durationMinutes: duration, limit: 3 });
    const phrase = slots.ok && slots.data.length ? `Tenho disponibilidade em ${slotsPhrase(slots.data)}. Qual prefere?` : "Pode me sugerir outro horário?";
    return `Neste horário já existe um compromisso. ${phrase}`;
  }
  return "Não consegui concluir o agendamento agora. Pode confirmar o horário novamente em instantes?";
}

function confirmText(startIso: string, duration: number, meetLink?: string, email?: string | null) {
  const f = formatBr(startIso);
  return [
    "Perfeito! Sua reunião foi agendada.",
    `Data: ${f.data}`,
    `Horário: ${f.hora}`,
    `Duração: ${duration} minutos`,
    meetLink ? `Link do Google Meet: ${meetLink}` : null,
    email ? "O convite já foi enviado para seu e-mail." : null,
    "Até breve!",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Lembretes automáticos: 24h antes e 1h antes. Chamado pelo cron. */
export async function runMeetingReminders(wid: string): Promise<{ sent24: number; sent1: number }> {
  const db = await admin(wid);
  const { sendAndLog } = await import("./messaging.server");
  const now = Date.now();
  const { data: events } = await db
    .from("events")
    .select("id, title, starts_at, meet_link, contact_id, reminder_24h_sent_at, reminder_1h_sent_at, status")
    .eq("status", "agendado")
    .gte("starts_at", new Date(now).toISOString())
    .lte("starts_at", new Date(now + 25 * 3600 * 1000).toISOString());

  let sent24 = 0;
  let sent1 = 0;
  for (const ev of (events ?? []) as any[]) {
    if (!ev.contact_id) continue;
    const diffMin = (new Date(ev.starts_at).getTime() - now) / 60000;
    const { data: c } = await db.from("contacts").select("name, whatsapp, phone, do_not_contact").eq("id", ev.contact_id).maybeSingle();
    const contact = c as any;
    if (!contact || contact.do_not_contact) continue;
    const to = contact.whatsapp || contact.phone || "";
    if (!to) continue;
    const f = formatBr(ev.starts_at);

    if (diffMin <= 24 * 60 && diffMin > 23 * 60 && !ev.reminder_24h_sent_at) {
      await sendAndLog({
        workspaceId: wid,
        to,
        contactId: ev.contact_id,
        title: "Lembrete 24h da reunião",
        tag: "reminder-24h",
        body: `Olá! Passando para lembrar da nossa reunião amanhã, ${f.data} às ${f.hora}.${ev.meet_link ? `\nLink: ${ev.meet_link}` : ""}\nPosso confirmar sua presença?`,
      });
      await db.from("events").update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", ev.id);
      sent24++;
    } else if (diffMin <= 60 && diffMin > 0 && !ev.reminder_1h_sent_at) {
      await sendAndLog({
        workspaceId: wid,
        to,
        contactId: ev.contact_id,
        title: "Lembrete 1h da reunião",
        tag: "reminder-1h",
        body: `Nossa reunião começa em 1 hora, às ${f.hora}.${ev.meet_link ? `\nLink do Meet: ${ev.meet_link}` : ""}\nAté já!`,
      });
      await db.from("events").update({ reminder_1h_sent_at: new Date().toISOString() }).eq("id", ev.id);
      sent1++;
    }
  }
  return { sent24, sent1 };
}
