import { n as wsDb } from "./workspace-scope.server-BnuHkW86.mjs";
import { DEFAULT_TZ, calendarConfigured, createEvent, deleteEvent, formatBr, isBusinessSlot, isSlotFree, suggestSlots, updateEvent } from "./google-calendar.server-CSmWKIP6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/scheduling.server-D_Wsh8N5.js
/** Banco sempre escopado ao workspace do contato (isolamento multi-tenant). */
async function admin(wid) {
	return await wsDb(wid);
}
function nowLocalIso() {
	return new Intl.DateTimeFormat("sv-SE", {
		timeZone: DEFAULT_TZ,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false
	}).format(/* @__PURE__ */ new Date()).replace(" ", "T");
}
/** -03:00 fixo de Brasília: converte "local sem fuso" -> ISO UTC. */
function localToIso(local) {
	const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(local ?? "");
	if (!m) {
		const d = new Date(local);
		return isNaN(d.getTime()) ? null : d.toISOString();
	}
	const [, y, mo, d, h, mi] = m;
	return (/* @__PURE__ */ new Date(`${y}-${mo}-${d}T${h}:${mi}:00-03:00`)).toISOString();
}
async function detectIntent(text, history, hasEmail, pending) {
	const key = process.env.LOVABLE_API_KEY;
	if (!key) return null;
	const { createLovableAiGatewayProvider } = await import("./ai-gateway.server-DeOvIXyQ.mjs");
	const { generateText } = await import("../_libs/ai.mjs").then((n) => n.t);
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
		const { text: out } = await generateText({
			model,
			system,
			messages: [{
				role: "user",
				content: text
			}]
		});
		const raw = (out ?? "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
		return JSON.parse(raw);
	} catch (err) {
		console.error("[eva agenda] falha ao classificar intenção", err);
		return null;
	}
}
async function recentHistory(wid, contactId) {
	const { data } = await (await admin(wid)).from("activities").select("kind, content, created_at").eq("contact_id", contactId).in("kind", ["whatsapp_in", "whatsapp_out"]).order("created_at", { ascending: false }).limit(10);
	return (data ?? []).reverse().map((a) => `${a.kind === "whatsapp_in" ? "Cliente" : "EVA"}: ${(a.content ?? "").slice(0, 300)}`).join("\n");
}
async function logActivity(wid, contactId, title, content, kind = "reuniao") {
	await (await admin(wid)).from("activities").insert({
		contact_id: contactId,
		kind,
		title,
		content,
		status: "OK",
		status_updated_at: (/* @__PURE__ */ new Date()).toISOString()
	});
}
async function setStage(wid, contactId, stage, motivo) {
	const db = await admin(wid);
	const { data: before } = await db.from("contacts").select("funnel_stage").eq("id", contactId).maybeSingle();
	if (before?.funnel_stage === stage) return;
	await db.from("contacts").update({
		funnel_stage: stage,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("id", contactId);
	await logActivity(wid, contactId, `Funil: ${before?.funnel_stage ?? "—"} → ${stage}`, motivo, "nota");
}
async function getState(wid, contactId) {
	const { data } = await (await admin(wid)).from("eva_scheduling_state").select("*").eq("contact_id", contactId).maybeSingle();
	return data ?? null;
}
async function setState(wid, contactId, patch) {
	await (await admin(wid)).from("eva_scheduling_state").upsert({
		contact_id: contactId,
		...patch,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "contact_id" });
}
async function clearState(wid, contactId) {
	await (await admin(wid)).from("eva_scheduling_state").delete().eq("contact_id", contactId);
}
async function upcomingEvent(wid, contactId) {
	const { data } = await (await admin(wid)).from("events").select("*").eq("contact_id", contactId).eq("status", "agendado").gte("starts_at", (/* @__PURE__ */ new Date(Date.now() - 72e5)).toISOString()).order("starts_at", { ascending: true }).limit(1).maybeSingle();
	return data ?? null;
}
function slotsPhrase(slots) {
	return slots.map((s) => formatBr(s).completo).join(", ");
}
/** Cria de fato o evento (Google + Agenda + CRM + Histórico). */
async function scheduleMeeting(params) {
	const wid = params.workspaceId;
	const db = await admin(wid);
	const duration = params.durationMinutes ?? 30;
	const free = await isSlotFree(params.startIso, duration);
	if (!free.ok) return {
		ok: false,
		error: free.error
	};
	if (!free.data) return {
		ok: false,
		error: "busy"
	};
	const summary = params.title ?? `Reunião / Sessão - ${params.contactName}`;
	const created = await createEvent({
		summary,
		description: `Agendado automaticamente pela EVA.\nWhatsApp do lead: ${params.phone}\nContato: ${params.contactName}`,
		startIso: params.startIso,
		durationMinutes: duration,
		attendeeEmail: params.email ?? null,
		withMeet: params.online !== false
	});
	if (!created.ok) return {
		ok: false,
		error: created.error
	};
	const { data: contact } = await db.from("contacts").select("company_id").eq("id", params.contactId).maybeSingle();
	const { data: ev } = await db.from("events").insert({
		title: summary,
		kind: "reuniao",
		contact_id: params.contactId,
		company_id: contact?.company_id ?? null,
		starts_at: params.startIso,
		ends_at: new Date(new Date(params.startIso).getTime() + duration * 6e4).toISOString(),
		duration_minutes: duration,
		meet_link: created.data.meetLink ?? null,
		google_event_id: created.data.id,
		attendee_email: params.email ?? null,
		status: "agendado",
		source: "eva",
		location: params.online === false ? "Presencial" : "Google Meet"
	}).select("id").maybeSingle();
	const f = formatBr(params.startIso);
	await logActivity(wid, params.contactId, "Reunião agendada pela EVA", `${f.completo} · ${duration} min${created.data.meetLink ? `\nMeet: ${created.data.meetLink}` : ""}${params.email ? `\nConvite enviado para ${params.email}` : ""}`);
	await db.from("contacts").update({
		next_action: "Reunião agendada",
		next_action_at: params.startIso
	}).eq("id", params.contactId);
	await setStage(wid, params.contactId, "reuniao_agendada", "Reunião confirmada no Google Calendar.");
	await clearState(wid, params.contactId);
	return {
		ok: true,
		meetLink: created.data.meetLink,
		eventId: ev?.id
	};
}
async function cancelMeeting(wid, contactId, motivo = "Cancelado pelo cliente via WhatsApp") {
	const db = await admin(wid);
	const ev = await upcomingEvent(wid, contactId);
	if (!ev) return {
		ok: false,
		error: "no_event"
	};
	if (ev.google_event_id) await deleteEvent(ev.google_event_id);
	await db.from("events").update({ status: "cancelado" }).eq("id", ev.id);
	await logActivity(wid, contactId, "Reunião cancelada", `${formatBr(ev.starts_at).completo}\n${motivo}`);
	await db.from("contacts").update({
		next_action: null,
		next_action_at: null
	}).eq("id", contactId);
	await setStage(wid, contactId, "qualificado", "Reunião cancelada — lead volta para acompanhamento.");
	return {
		ok: true,
		event: ev
	};
}
async function rescheduleMeeting(wid, contactId, startIso) {
	const db = await admin(wid);
	const ev = await upcomingEvent(wid, contactId);
	if (!ev) return {
		ok: false,
		error: "no_event"
	};
	const duration = ev.duration_minutes ?? 30;
	const free = await isSlotFree(startIso, duration);
	if (!free.ok) return {
		ok: false,
		error: free.error
	};
	if (!free.data) return {
		ok: false,
		error: "busy"
	};
	if (ev.google_event_id) {
		const upd = await updateEvent(ev.google_event_id, startIso, duration);
		if (!upd.ok) return {
			ok: false,
			error: upd.error
		};
	}
	await db.from("events").update({
		starts_at: startIso,
		ends_at: new Date(new Date(startIso).getTime() + duration * 6e4).toISOString(),
		status: "agendado",
		reminder_24h_sent_at: null,
		reminder_1h_sent_at: null
	}).eq("id", ev.id);
	await logActivity(wid, contactId, "Reunião remarcada", `De ${formatBr(ev.starts_at).completo}\nPara ${formatBr(startIso).completo}`);
	await db.from("contacts").update({
		next_action: "Reunião agendada",
		next_action_at: startIso
	}).eq("id", contactId);
	await setStage(wid, contactId, "reuniao_agendada", "Reunião remarcada.");
	return {
		ok: true,
		event: {
			...ev,
			starts_at: startIso
		}
	};
}
/**
* Ponto de entrada chamado pelo webhook. Retorna handled=true quando a EVA
* tratou a mensagem como agendamento (nesse caso a resposta já está pronta).
*/
async function handleSchedulingMessage(params) {
	const wid = params.workspaceId;
	const db = await admin(wid);
	const { data: contactRow } = await db.from("contacts").select("email, name").eq("id", params.contactId).maybeSingle();
	const contact = contactRow ?? {};
	const state = await getState(wid, params.contactId);
	if (state?.awaiting_saturday && state?.pending_start) {
		if (isNegative(params.text)) {
			await setState(wid, params.contactId, {
				awaiting_saturday: false,
				pending_start: null
			});
			const slots = await suggestSlots({
				durationMinutes: state.duration_minutes ?? 30,
				limit: 3
			});
			return {
				handled: true,
				reply: `Sem problema!${slots.ok && slots.data.length ? ` Tenho estes horários livres: ${slotsPhrase(slots.data)}.` : ""} Qual fica melhor para você?`,
				status: "saturday_cancelled_by_lead"
			};
		}
		return {
			handled: true,
			reply: await saturdayPendingReply(wid, state.pending_start),
			status: "saturday_awaiting_owner"
		};
	}
	const history = await recentHistory(wid, params.contactId);
	const intent = await detectIntent(params.text, history, Boolean(contact.email), state?.pending_start ? formatBr(state.pending_start).completo : null);
	if (!intent) return {
		handled: false,
		status: "intent_error"
	};
	if (state?.awaiting_email && intent.email) {
		await db.from("contacts").update({ email: intent.email }).eq("id", params.contactId);
		await logActivity(wid, params.contactId, "E-mail capturado pela EVA", intent.email, "nota");
		const startIso = state.pending_start;
		const bizPending = isBusinessSlot(startIso, state.duration_minutes ?? 30, DEFAULT_TZ, true);
		if (!bizPending.ok) {
			await setState(wid, params.contactId, {
				pending_start: null,
				awaiting_email: false
			});
			return {
				handled: true,
				reply: await outOfHoursReply(startIso, state.duration_minutes ?? 30, bizPending.reason),
				status: `out_of_hours:${bizPending.reason}`
			};
		}
		const res = await scheduleMeeting({
			workspaceId: wid,
			contactId: params.contactId,
			contactName: contact.name ?? params.contactName,
			phone: params.phone,
			startIso,
			durationMinutes: state.duration_minutes ?? 30,
			online: state.online ?? true,
			email: intent.email
		});
		if (!res.ok) return {
			handled: true,
			reply: await busyReply(startIso, state.duration_minutes ?? 30, res.error),
			status: `schedule_failed:${res.error}`
		};
		return {
			handled: true,
			reply: confirmText(startIso, state.duration_minutes ?? 30, res.meetLink, intent.email),
			status: "scheduled"
		};
	}
	if (intent.intent === "nenhum") return {
		handled: false,
		status: "no_intent"
	};
	if (!await calendarConfigured(wid)) return {
		handled: false,
		status: "calendar_not_connected"
	};
	if (intent.email && !contact.email) {
		await db.from("contacts").update({ email: intent.email }).eq("id", params.contactId);
		contact.email = intent.email;
		await logActivity(wid, params.contactId, "E-mail capturado pela EVA", intent.email, "nota");
	}
	if (intent.intent === "cancelar") {
		if (!(await cancelMeeting(wid, params.contactId)).ok) return {
			handled: true,
			reply: "Não localizei nenhuma reunião ativa no seu nome. Quer que eu agende uma?",
			status: "cancel_no_event"
		};
		return {
			handled: true,
			reply: "Prontinho, sua reunião foi cancelada e removida da agenda. Se quiser remarcar, é só me dizer o melhor dia e horário.",
			status: "cancelled"
		};
	}
	const duration = intent.duration_minutes ?? 30;
	if (intent.intent === "agendar" && !intent.datetime) {
		const slots = await suggestSlots({
			durationMinutes: duration,
			limit: 3
		});
		if (!slots.ok || slots.data.length === 0) return {
			handled: true,
			reply: "Que ótimo! Me diga o melhor dia e horário para você que eu confirmo na agenda.",
			status: "ask_time"
		};
		await setState(wid, params.contactId, {
			suggested: slots.data,
			duration_minutes: duration,
			online: intent.online !== false,
			awaiting_email: false,
			pending_start: null
		});
		await setStage(wid, params.contactId, "qualificado", "Lead demonstrou interesse em agendar reunião.");
		return {
			handled: true,
			reply: `Perfeito! Tenho estes horários livres: ${slotsPhrase(slots.data)}. Qual fica melhor para você?`,
			status: "suggested"
		};
	}
	const startIso = intent.datetime ? localToIso(intent.datetime) : null;
	if (intent.intent === "remarcar") {
		if (!startIso) {
			const slots = await suggestSlots({
				durationMinutes: duration,
				limit: 3
			});
			return {
				handled: true,
				reply: `Claro, podemos remarcar.${slots.ok && slots.data.length ? ` Tenho livre: ${slotsPhrase(slots.data)}.` : ""} Qual horário prefere?`,
				status: "reschedule_ask"
			};
		}
		const biz = isBusinessSlot(startIso, duration);
		if (!biz.ok) {
			if (biz.reason === "saturday") return await requestSaturdayApproval({
				workspaceId: wid,
				contactId: params.contactId,
				contactName: contact.name ?? params.contactName,
				phone: params.phone,
				startIso,
				duration,
				online: intent.online !== false
			});
			return {
				handled: true,
				reply: await outOfHoursReply(startIso, duration, biz.reason),
				status: `reschedule_${biz.reason}`
			};
		}
		const res = await rescheduleMeeting(wid, params.contactId, startIso);
		if (!res.ok && res.error === "no_event") return await scheduleFlow({
			...params,
			workspaceId: wid,
			contact,
			startIso,
			duration,
			online: intent.online !== false
		});
		if (!res.ok) return {
			handled: true,
			reply: await busyReply(startIso, duration, res.error),
			status: `reschedule_failed:${res.error}`
		};
		const f = formatBr(startIso);
		return {
			handled: true,
			reply: `Reunião remarcada com sucesso!\nData: ${f.data}\nHorário: ${f.hora}\nO convite atualizado já foi enviado. Até breve!`,
			status: "rescheduled"
		};
	}
	if (!startIso) return {
		handled: false,
		status: "no_datetime"
	};
	return await scheduleFlow({
		...params,
		workspaceId: wid,
		contact,
		startIso,
		duration,
		online: intent.online !== false
	});
}
async function scheduleFlow(args) {
	const biz = isBusinessSlot(args.startIso, args.duration, DEFAULT_TZ, args.allowSaturday === true);
	if (!biz.ok) {
		if (biz.reason === "saturday") return await requestSaturdayApproval({
			workspaceId: args.workspaceId,
			contactId: args.contactId,
			contactName: args.contact.name ?? args.contactName,
			phone: args.phone,
			startIso: args.startIso,
			duration: args.duration,
			online: args.online
		});
		const slots = await suggestSlots({
			fromIso: args.startIso,
			durationMinutes: args.duration,
			limit: 3
		});
		await setState(args.workspaceId, args.contactId, {
			suggested: slots.ok ? slots.data : null,
			duration_minutes: args.duration,
			online: args.online,
			awaiting_email: false,
			pending_start: null,
			awaiting_saturday: false
		});
		return {
			handled: true,
			reply: await outOfHoursReply(args.startIso, args.duration, biz.reason),
			status: `out_of_hours:${biz.reason}`
		};
	}
	const free = await isSlotFree(args.startIso, args.duration);
	if (!free.ok) return {
		handled: true,
		reply: "Tive um problema para consultar a agenda agora. Pode confirmar o horário novamente em instantes?",
		status: `calendar_error:${free.error}`
	};
	if (!free.data) {
		const slots = await suggestSlots({
			fromIso: args.startIso,
			durationMinutes: args.duration,
			limit: 3
		});
		const phrase = slots.ok && slots.data.length ? `Tenho disponibilidade em ${slotsPhrase(slots.data)}. Qual prefere?` : "Pode me sugerir outro horário?";
		await setState(args.workspaceId, args.contactId, {
			suggested: slots.ok ? slots.data : null,
			duration_minutes: args.duration,
			online: args.online,
			awaiting_email: false,
			pending_start: null
		});
		return {
			handled: true,
			reply: `Neste horário já existe um compromisso. ${phrase}`,
			status: "busy"
		};
	}
	if (!args.contact.email) {
		await setState(args.workspaceId, args.contactId, {
			pending_start: args.startIso,
			duration_minutes: args.duration,
			online: args.online,
			awaiting_email: true,
			awaiting_saturday: false
		});
		const f = formatBr(args.startIso);
		await setStage(args.workspaceId, args.contactId, "qualificado", "Horário combinado — aguardando e-mail para enviar o convite.");
		return {
			handled: true,
			reply: `Consegui reservar ${f.data} às ${f.hora}. Qual é o seu melhor e-mail para eu enviar o convite com o link da reunião?`,
			status: "awaiting_email"
		};
	}
	const res = await scheduleMeeting({
		workspaceId: args.workspaceId,
		contactId: args.contactId,
		contactName: args.contact.name ?? args.contactName,
		phone: args.phone,
		startIso: args.startIso,
		durationMinutes: args.duration,
		online: args.online,
		email: args.contact.email
	});
	if (!res.ok) return {
		handled: true,
		reply: await busyReply(args.startIso, args.duration, res.error),
		status: `schedule_failed:${res.error}`
	};
	return {
		handled: true,
		reply: confirmText(args.startIso, args.duration, res.meetLink, args.contact.email),
		status: "scheduled"
	};
}
async function busyReply(startIso, duration, error) {
	if (error === "out_of_hours" || error === "weekend" || error === "sunday") return await outOfHoursReply(startIso, duration, error === "out_of_hours" ? "after_hours" : "sunday");
	if (error === "busy") {
		const slots = await suggestSlots({
			fromIso: startIso,
			durationMinutes: duration,
			limit: 3
		});
		return `Neste horário já existe um compromisso. ${slots.ok && slots.data.length ? `Tenho disponibilidade em ${slotsPhrase(slots.data)}. Qual prefere?` : "Pode me sugerir outro horário?"}`;
	}
	return "Não consegui concluir o agendamento agora. Pode confirmar o horário novamente em instantes?";
}
var NEGATIVE = /\b(n[aã]o|nao|nops|melhor n[aã]o|prefiro n[aã]o|nem|negativo)\b/i;
function isNegative(text) {
	return NEGATIVE.test((text ?? "").trim());
}
/**
* Sábado: a EVA nunca decide. Ela registra o pedido para o responsável do
* workspace autorizar e avisa o lead que vai confirmar.
*/
async function requestSaturdayApproval(args) {
	await setState(args.workspaceId, args.contactId, {
		pending_start: args.startIso,
		duration_minutes: args.duration,
		online: args.online,
		awaiting_email: false,
		awaiting_saturday: true
	});
	const { createSaturdayRequest } = await import("./saturday.server-DcJJYLmp.mjs");
	await createSaturdayRequest({
		workspaceId: args.workspaceId,
		contactId: args.contactId,
		contactName: args.contactName,
		phone: args.phone,
		startIso: args.startIso,
		durationMinutes: args.duration,
		online: args.online
	});
	const f = formatBr(args.startIso);
	return {
		handled: true,
		reply: `Nossa agenda padrão é de segunda a sexta, das 9h às 18h. Sábado é possível em casos especiais: vou confirmar a disponibilidade com ${await ownerName(args.workspaceId)} para ${f.data} às ${f.hora} e te retorno em seguida, combinado?`,
		status: "saturday_awaiting_owner"
	};
}
async function ownerName(workspaceId) {
	try {
		const { loadWorkspace } = await import("./workspace.server-VbM9IL_r.mjs");
		const ws = await loadWorkspace(workspaceId);
		return ws.owner_name || ws.name || "a nossa equipe";
	} catch {
		return "a nossa equipe";
	}
}
async function saturdayPendingReply(workspaceId, startIso) {
	const f = formatBr(startIso);
	const owner = await ownerName(workspaceId);
	return `Já encaminhei o pedido de ${f.data} às ${f.hora} para ${owner} e assim que tiver a confirmação eu te aviso por aqui. Se preferir um horário de segunda a sexta, me diga que eu já reservo.`;
}
/** Recusa educadamente domingo / fora do expediente e oferece dias úteis. */
async function outOfHoursReply(startIso, duration, reason) {
	const slots = await suggestSlots({
		fromIso: startIso,
		durationMinutes: duration,
		limit: 3
	});
	const phrase = slots.ok && slots.data.length ? ` Tenho estes horários livres: ${slotsPhrase(slots.data)}.` : "";
	if (reason === "sunday" || reason === "weekend") return `No domingo não temos atendimento — nossa agenda é de segunda a sexta, das 9h às 18h.${phrase} Qual fica melhor para você?`;
	if (reason === "saturday") return `Aos sábados atendemos apenas em casos especiais.${phrase} Qual fica melhor para você?`;
	if (reason === "after_hours") return `Esse horário está fora do expediente (segunda a sexta, das 9h às 18h).${phrase} Qual prefere?`;
	return `Não consegui entender a data.${phrase} Pode me confirmar o dia e a hora?`;
}
function confirmText(startIso, duration, meetLink, email) {
	const f = formatBr(startIso);
	return [
		"Perfeito! Sua reunião foi agendada.",
		`Data: ${f.data}`,
		`Horário: ${f.hora}`,
		`Duração: ${duration} minutos`,
		meetLink ? `Link do Google Meet: ${meetLink}` : null,
		email ? "O convite já foi enviado para seu e-mail." : null,
		"Até breve!"
	].filter(Boolean).join("\n");
}
/** Lembretes automáticos: 24h antes e 1h antes. Chamado pelo cron. */
async function runMeetingReminders(wid) {
	const db = await admin(wid);
	const { sendAndLog } = await import("./messaging.server-Czbp4TxB.mjs");
	const now = Date.now();
	const { data: events } = await db.from("events").select("id, title, starts_at, meet_link, contact_id, reminder_24h_sent_at, reminder_1h_sent_at, status").eq("status", "agendado").gte("starts_at", new Date(now).toISOString()).lte("starts_at", new Date(now + 9e7).toISOString());
	let sent24 = 0;
	let sent1 = 0;
	for (const ev of events ?? []) {
		if (!ev.contact_id) continue;
		const diffMin = (new Date(ev.starts_at).getTime() - now) / 6e4;
		const { data: c } = await db.from("contacts").select("name, whatsapp, phone, do_not_contact").eq("id", ev.contact_id).maybeSingle();
		const contact = c;
		if (!contact || contact.do_not_contact) continue;
		const to = contact.whatsapp || contact.phone || "";
		if (!to) continue;
		const f = formatBr(ev.starts_at);
		if (diffMin <= 1440 && diffMin > 1380 && !ev.reminder_24h_sent_at) {
			await sendAndLog({
				workspaceId: wid,
				to,
				contactId: ev.contact_id,
				title: "Lembrete 24h da reunião",
				tag: "reminder-24h",
				body: `Olá! Passando para lembrar da nossa reunião amanhã, ${f.data} às ${f.hora}.${ev.meet_link ? `\nLink: ${ev.meet_link}` : ""}\nPosso confirmar sua presença?`
			});
			await db.from("events").update({ reminder_24h_sent_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", ev.id);
			sent24++;
		} else if (diffMin <= 60 && diffMin > 0 && !ev.reminder_1h_sent_at) {
			await sendAndLog({
				workspaceId: wid,
				to,
				contactId: ev.contact_id,
				title: "Lembrete 1h da reunião",
				tag: "reminder-1h",
				body: `Nossa reunião começa em 1 hora, às ${f.hora}.${ev.meet_link ? `\nLink do Meet: ${ev.meet_link}` : ""}\nAté já!`
			});
			await db.from("events").update({ reminder_1h_sent_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", ev.id);
			sent1++;
		}
	}
	return {
		sent24,
		sent1
	};
}
//#endregion
export { cancelMeeting, handleSchedulingMessage, rescheduleMeeting, runMeetingReminders, scheduleMeeting };
