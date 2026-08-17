//#region node_modules/.nitro/vite/services/ssr/assets/inbound-router.server-CBoGV8ym.js
var DEBOUNCE_MS = 8e3;
async function admin(wid) {
	const { wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return await wsDb(wid);
}
var BOT_PATTERNS = [
	{
		re: /mensagem autom[áa]tica|resposta autom[áa]tica|este n[úu]mero n[ãa]o recebe|n[ãa]o responda (a )?esta mensagem/i,
		reason: "Mensagem automática declarada"
	},
	{
		re: /digite\s*[1-9]|tecle\s*[1-9]|responda com o n[úu]mero|escolha uma (das )?op[çc][õo]es|menu de atendimento/i,
		reason: "Menu de URA / opções numéricas"
	},
	{
		re: /sou (o|a) (assistente|atendente) virtual|assistente virtual|chatbot|bot de atendimento|atendimento autom[áa]tico/i,
		reason: "Assistente virtual identificado"
	},
	{
		re: /hor[áa]rio de atendimento.*(segunda|seg\.).*(sexta|sex)/i,
		reason: "Resposta padrão de horário de atendimento"
	},
	{
		re: /protocolo (de atendimento )?n?[ºo°]?\s*\d{4,}/i,
		reason: "Protocolo automático"
	},
	{
		re: /aguarde.*(um|alguns) (momento|instante)s?.*atendente/i,
		reason: "Fila de atendimento automatizada"
	}
];
function detectBotHeuristic(text) {
	const t = (text ?? "").trim();
	if (!t) return null;
	for (const p of BOT_PATTERNS) if (p.re.test(t)) return p.reason;
	return null;
}
/** Marca o contato como robô, encerra cadência e registra no histórico. */
async function markAsBot(wid, contactId, reason) {
	const db = await admin(wid);
	await db.from("contacts").update({
		is_bot: true,
		bot_reason: reason,
		cadence_active: false,
		do_not_contact: true,
		status: "perdido"
	}).eq("id", contactId);
	await db.from("activities").insert({
		contact_id: contactId,
		kind: "bot_detected",
		title: "Atendimento automático detectado",
		content: `A EVA identificou que este número responde por robô/URA (${reason}). Cadência interrompida e resposta automática desativada para não conversar com máquina.`
	});
}
/**
* Classifica por IA se as mensagens vieram de um robô, quando a heurística não bateu.
* Falha em silêncio (assume humano) para nunca travar o fluxo.
*/
async function detectBotAI(text) {
	const key = process.env.LOVABLE_API_KEY;
	if (!key) return null;
	try {
		const { createLovableAiGatewayProvider } = await import("./ai-gateway.server-DeOvIXyQ.mjs");
		const { generateText } = await import("../_libs/ai.mjs").then((n) => n.t);
		const { text: out } = await generateText({
			model: createLovableAiGatewayProvider(key)("google/gemini-2.5-flash"),
			system: "Classifique a mensagem de WhatsApp abaixo. Responda APENAS com BOT: <motivo curto> quando for claramente uma resposta automática, URA, menu numérico, assistente virtual, autoresponder ou mensagem de sistema. Caso contrário responda apenas HUMANO. Na dúvida, responda HUMANO.",
			messages: [{
				role: "user",
				content: text.slice(0, 1500)
			}]
		});
		const clean = (out ?? "").trim();
		if (/^bot\b/i.test(clean)) return clean.replace(/^bot:?\s*/i, "").slice(0, 200) || "Detectado por IA";
		return null;
	} catch {
		return null;
	}
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
* Aguarda 8s, agrupa tudo que chegou nesse intervalo e responde uma única vez.
* Se outra mensagem chegar durante a espera, esta execução se cancela — a
* execução mais recente é quem responde (debounce por contato).
*/
async function routeInbound(params) {
	const wid = params.workspaceId;
	const db = await admin(wid);
	const startedAt = (/* @__PURE__ */ new Date()).toISOString();
	await sleep(DEBOUNCE_MS);
	const { data: newer } = await db.from("activities").select("id").eq("contact_id", params.contactId).eq("kind", "whatsapp_in").gt("created_at", startedAt).limit(1);
	if (newer && newer.length > 0) return "debounced:superseded";
	const since = (/* @__PURE__ */ new Date(Date.now() - 3e5)).toISOString();
	const { data: lastOut } = await db.from("activities").select("created_at").eq("contact_id", params.contactId).eq("kind", "whatsapp_out").order("created_at", { ascending: false }).limit(1);
	const floor = (lastOut?.[0]?.created_at ?? since) > since ? lastOut[0].created_at : since;
	const { data: inbound } = await db.from("activities").select("content, created_at").eq("contact_id", params.contactId).eq("kind", "whatsapp_in").gt("created_at", floor).order("created_at", { ascending: true }).limit(20);
	const grouped = (inbound ?? []).map((a) => (a.content ?? "").trim()).filter(Boolean).join("\n") || params.incomingText;
	const { data: contactRow } = await db.from("contacts").select("is_bot, ai_paused, do_not_contact").eq("id", params.contactId).maybeSingle();
	const contact = contactRow ?? {};
	if (contact.is_bot) return "skipped:bot";
	if (contact.ai_paused) return "skipped:manual_mode";
	const { classifyLeadIntent } = await import("./intent.server-B7WaKwLp.mjs");
	const classified = await classifyLeadIntent(grouped);
	if (classified.intent === "opt_out") {
		const { sendAndLog } = await import("./messaging.server-Czbp4TxB.mjs");
		await db.from("contacts").update({
			do_not_contact: true,
			cadence_active: false,
			status: "perdido",
			funnel_stage: "perdido",
			next_action: null,
			next_action_at: null
		}).eq("id", params.contactId);
		await db.from("activities").insert({
			contact_id: params.contactId,
			kind: "nota",
			title: "Recusa / pedido de remoção detectado",
			content: `Detecção: ${classified.source === "ai" ? "IA" : "padrão de texto"} — ${classified.reason ?? "recusa"}.\nCadência encerrada, lead marcado como "não entrar em contato" e movido para Perdido.\n\nMensagem: ${grouped.slice(0, 500)}`
		});
		await sendAndLog({
			workspaceId: wid,
			to: params.phone,
			body: "Entendido, agradeço a sinceridade! Já removi seu contato da nossa lista e não vou mais te enviar mensagens. Desejo sucesso — qualquer coisa, estou por aqui.",
			contactId: params.contactId,
			title: "EVA — encerramento por solicitação",
			tag: "eva-optout"
		});
		return "opt_out";
	}
	const reason = detectBotHeuristic(grouped) ?? await detectBotAI(grouped);
	if (reason) {
		await markAsBot(wid, params.contactId, reason);
		return `bot_detected:${reason}`;
	}
	if (classified.intent !== "handoff_interno") try {
		const { handleSchedulingMessage } = await import("./scheduling.server-D_Wsh8N5.mjs");
		const { sendAndLog } = await import("./messaging.server-Czbp4TxB.mjs");
		const outcome = await handleSchedulingMessage({
			workspaceId: wid,
			contactId: params.contactId,
			contactName: params.contactName,
			phone: params.phone,
			text: grouped
		});
		if (outcome.handled && outcome.reply) {
			const sent = await sendAndLog({
				workspaceId: wid,
				to: params.phone,
				body: outcome.reply,
				contactId: params.contactId,
				title: "EVA — agendamento",
				tag: `eva-scheduling-${outcome.status}`
			});
			return `scheduling:${outcome.status}:${sent.ok ? "sent" : sent.error}`;
		}
		if (outcome.status === "calendar_not_connected") {
			const sent = await sendAndLog({
				workspaceId: wid,
				to: params.phone,
				body: "Combinado! Me confirma o dia e o horário que preferir que eu já reservo na agenda e te envio o convite com o link da reunião.",
				contactId: params.contactId,
				title: "EVA — agendamento (agenda indisponível)",
				tag: "eva-scheduling-fallback"
			});
			return `scheduling:fallback:${sent.ok ? "sent" : sent.error}`;
		}
	} catch (err) {
		console.error("[inbound-router] scheduling failed", err);
	}
	const { autoReplyToInbound } = await import("./cadence-runner.server-BNvRE-Rw.mjs");
	return `autoreply:${await autoReplyToInbound({
		workspaceId: wid,
		contactId: params.contactId,
		contactName: params.contactName,
		to: params.phone,
		incomingText: grouped,
		currentDay: params.cadenceDay || 1,
		signal: classified.intent === "handoff_interno" ? "handoff_interno" : void 0
	})}`;
}
//#endregion
export { routeInbound };
