import { n as wsDb } from "./workspace-scope.server-BnuHkW86.mjs";
import { formatBr, suggestSlots } from "./google-calendar.server-CSmWKIP6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/saturday.server-DcJJYLmp.js
async function admin(wid) {
	return await wsDb(wid);
}
/** Registra o pedido e cria uma tarefa para o responsável decidir. */
async function createSaturdayRequest(params) {
	const db = await admin(params.workspaceId);
	await db.from("saturday_requests").update({
		status: "superseded",
		decided_at: (/* @__PURE__ */ new Date()).toISOString()
	}).eq("contact_id", params.contactId).eq("status", "pending");
	const { data } = await db.from("saturday_requests").insert({
		contact_id: params.contactId,
		contact_name: params.contactName,
		phone: params.phone,
		start_at: params.startIso,
		duration_minutes: params.durationMinutes,
		online: params.online,
		status: "pending"
	}).select("id").maybeSingle();
	const f = formatBr(params.startIso);
	await db.from("activities").insert({
		contact_id: params.contactId,
		kind: "nota",
		title: "Pedido de reunião no sábado — aguardando sua autorização",
		content: `${params.contactName} pediu reunião no sábado, ${f.data} às ${f.hora}. Aprove ou recuse no painel da EVA.`,
		status: "OK",
		status_updated_at: (/* @__PURE__ */ new Date()).toISOString()
	});
	await db.from("tasks").insert({
		title: `Autorizar reunião de sábado — ${params.contactName}`,
		description: `${f.completo} · ${params.durationMinutes} min. Decida no painel "Pedidos de sábado".`,
		contact_id: params.contactId,
		due_at: (/* @__PURE__ */ new Date()).toISOString(),
		priority: "alta"
	});
	return {
		ok: true,
		id: data?.id
	};
}
async function listPendingSaturdayRequests(workspaceId) {
	const { data } = await (await admin(workspaceId)).from("saturday_requests").select("id, contact_id, contact_name, phone, start_at, duration_minutes, online, status, created_at").eq("status", "pending").order("start_at", { ascending: true });
	return (data ?? []).filter((r) => new Date(r.start_at).getTime() > Date.now() - 36e5);
}
/** Aprova ou recusa o pedido, agenda (ou não) e responde ao lead no WhatsApp. */
async function decideSaturdayRequest(params) {
	const wid = params.workspaceId;
	const db = await admin(wid);
	const { data: req } = await db.from("saturday_requests").select("*").eq("id", params.requestId).maybeSingle();
	if (!req) return {
		ok: false,
		error: "Pedido não encontrado."
	};
	if (req.status !== "pending") return {
		ok: false,
		error: "Este pedido já foi decidido."
	};
	const r = req;
	const { data: contact } = await db.from("contacts").select("name, email, whatsapp, phone").eq("id", r.contact_id).maybeSingle();
	const c = contact ?? {};
	const to = r.phone || c.whatsapp || c.phone || "";
	const f = formatBr(r.start_at);
	const { sendAndLog } = await import("./messaging.server-Czbp4TxB.mjs");
	let reply = "";
	let ok = true;
	let error;
	if (params.approve) {
		const { scheduleMeeting } = await import("./scheduling.server-D_Wsh8N5.mjs");
		if (!c.email) {
			await db.from("eva_scheduling_state").upsert({
				contact_id: r.contact_id,
				pending_start: r.start_at,
				duration_minutes: r.duration_minutes,
				online: r.online,
				awaiting_email: true,
				awaiting_saturday: false,
				updated_at: (/* @__PURE__ */ new Date()).toISOString()
			}, { onConflict: "contact_id" });
			reply = `Boa notícia! Consegui confirmar o sábado, ${f.data} às ${f.hora}. Qual é o seu melhor e-mail para eu enviar o convite com o link da reunião?`;
		} else {
			const res = await scheduleMeeting({
				workspaceId: wid,
				contactId: r.contact_id,
				contactName: c.name ?? r.contact_name ?? "Cliente",
				phone: to,
				startIso: r.start_at,
				durationMinutes: r.duration_minutes ?? 30,
				online: r.online !== false,
				email: c.email
			});
			if (!res.ok) {
				ok = false;
				error = res.error;
				reply = `Tive um imprevisto para reservar ${f.data} às ${f.hora}. Pode me confirmar outro horário?`;
			} else reply = `Confirmado! Nossa reunião ficou para ${f.data} às ${f.hora}.${res.meetLink ? `\nLink: ${res.meetLink}` : ""}\nO convite foi enviado para ${c.email}. Até lá!`;
		}
	} else {
		await db.from("eva_scheduling_state").upsert({
			contact_id: r.contact_id,
			pending_start: null,
			awaiting_saturday: false,
			awaiting_email: false,
			updated_at: (/* @__PURE__ */ new Date()).toISOString()
		}, { onConflict: "contact_id" });
		const slots = await suggestSlots({
			durationMinutes: r.duration_minutes ?? 30,
			limit: 3
		});
		reply = `Verifiquei aqui e neste sábado não vamos conseguir atender.${slots.ok && slots.data.length ? ` Tenho estes horários livres: ${slots.data.map((s) => formatBr(s).completo).join(", ")}.` : ""} Qual fica melhor para você?`;
	}
	await db.from("saturday_requests").update({
		status: params.approve ? ok ? "approved" : "failed" : "declined",
		decided_at: (/* @__PURE__ */ new Date()).toISOString(),
		decided_by: params.userId ?? null,
		decided_by_name: params.userName ?? null
	}).eq("id", r.id);
	if (to) await sendAndLog({
		workspaceId: wid,
		to,
		body: reply,
		contactId: r.contact_id,
		title: params.approve ? "Sábado autorizado — resposta ao lead" : "Sábado recusado — resposta ao lead",
		tag: "saturday-decision",
		sendMode: "eva",
		sentBy: params.userId ?? null,
		sentByName: params.userName ?? null
	});
	return {
		ok,
		error,
		reply
	};
}
//#endregion
export { createSaturdayRequest, decideSaturdayRequest, listPendingSaturdayRequests };
