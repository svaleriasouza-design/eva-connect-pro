import { t as normalizePhoneNumber } from "./phone-06k09EE6.mjs";
import { n as sendWhatsappTemplate, r as sendWhatsappText, t as loadMetaConfig } from "./whatsapp.server-Bx4h-P3h.mjs";
import { n as wsDb } from "./workspace-scope.server-BnuHkW86.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/messaging.server-Czbp4TxB.js
/** Todo acesso ao banco aqui é escopado ao workspace (isolamento multi-tenant). */
async function admin(workspaceId) {
	return wsDb(workspaceId);
}
/**
* Janela de atendimento de 24h: existe se houve mensagem RECEBIDA do contato
* nas últimas 24 horas. Sem contato conhecido, procura por telefone no histórico.
*/
async function hasOpenWindow(workspaceId, contactId, phone) {
	const db = await admin(workspaceId);
	const since = (/* @__PURE__ */ new Date(Date.now() - 864e5)).toISOString();
	if (contactId) {
		const { data } = await db.from("activities").select("id").eq("contact_id", contactId).eq("kind", "whatsapp_in").gte("created_at", since).limit(1);
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
async function sendAndLog(input) {
	const wid = input.workspaceId;
	const db = await admin(wid);
	const to = normalizePhoneNumber(input.to ?? "");
	const tag = input.tag ?? "manual";
	console.log(`[msg:out] tag=${tag} contact=${input.contactId ?? "-"} to=${to} len=${(input.body ?? "").length}`);
	if (!to || to.length < 12) {
		console.warn(`[msg:out] telefone inválido tag=${tag} raw=${input.to}`);
		return {
			ok: false,
			to,
			error: "Número inválido (use DDD + número)."
		};
	}
	const windowOpen = input.forceTemplate ? false : await hasOpenWindow(wid, input.contactId ?? null, to);
	let usedTemplate = false;
	let send = windowOpen ? await sendWhatsappText(wid, to, input.body ?? "") : await (async () => {
		usedTemplate = true;
		const cfg = await loadMetaConfig(wid);
		const name = input.templateName || cfg.defaultTemplateName;
		const lang = input.templateLang || cfg.defaultTemplateLang;
		const contactName = input.contactId ? await contactFirstName(wid, input.contactId) : "";
		const attempt = async (tplName) => {
			const first = await sendWhatsappTemplate(wid, to, tplName, lang, []);
			if (first.ok) return first;
			if (/param|variable|132000|132012|132001/i.test(first.error ?? "")) return sendWhatsappTemplate(wid, to, tplName, lang, [contactName || "cliente"]);
			return first;
		};
		const primary = await attempt(name);
		if (primary.ok) return primary;
		if (/132001|does not exist|not found|não existe/i.test(primary.error ?? "") && name !== cfg.defaultTemplateName) {
			console.warn(`[msg:out] template "${name}" indisponível — usando "${cfg.defaultTemplateName}"`);
			return attempt(cfg.defaultTemplateName);
		}
		return primary;
	})();
	if (!windowOpen && !send.ok) console.warn(`[msg:out] template "${(await loadMetaConfig(wid)).defaultTemplateName}" falhou: ${send.error}`);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	let activityId;
	try {
		const { data } = await db.from("activities").insert({
			contact_id: input.contactId ?? null,
			kind: "whatsapp_out",
			title: (input.title ?? "Mensagem enviada") + (usedTemplate ? " (template)" : ""),
			content: usedTemplate ? `[Template Meta] Janela de 24h fechada — enviado template aprovado.\n\nConteúdo pretendido:\n${input.body ?? ""}` : input.body ?? "",
			external_id: send.messageId ?? null,
			status: send.ok ? "SENT" : "FAILED",
			status_updated_at: now,
			error_message: send.ok ? null : send.error ?? "Falha no envio (Meta Cloud API)",
			sent_by: input.sentBy ?? null,
			sent_by_name: input.sentByName ?? null,
			send_mode: input.sendMode ?? (input.sentBy ? "manual" : "eva")
		}).select("id").maybeSingle();
		activityId = data?.id;
		console.log(`[msg:out] gravado activity=${activityId ?? "-"} ok=${send.ok} externalId=${send.messageId ?? "-"}`);
	} catch (err) {
		console.error("[msg:out] falha ao gravar activity", err);
	}
	if (send.ok && input.contactId) try {
		await db.from("contacts").update({ last_contact_at: now }).eq("id", input.contactId);
	} catch (err) {
		console.error("[msg:out] falha ao atualizar contact", err);
	}
	if (!send.ok) console.warn(`[msg:out] Meta erro: ${send.error}`);
	return {
		ok: send.ok,
		to,
		messageId: send.messageId,
		error: send.error,
		activityId,
		raw: send.raw,
		usedTemplate
	};
}
async function contactFirstName(workspaceId, contactId) {
	try {
		const { data } = await (await admin(workspaceId)).from("contacts").select("name").eq("id", contactId).maybeSingle();
		return (data?.name ?? "").trim().split(/\s+/)[0] ?? "";
	} catch {
		return "";
	}
}
/**
* Localiza contato por telefone tentando várias variações do número.
* Retorna null se não encontrar.
*/
async function findContactByPhone(workspaceId, phoneDigits) {
	if (!phoneDigits) return null;
	const db = await admin(workspaceId);
	const digits = phoneDigits.replace(/\D/g, "");
	const normalized = normalizePhoneNumber(digits);
	const withoutDdi = normalized.startsWith("55") ? normalized.slice(2) : normalized;
	const last10 = digits.slice(-10);
	const last8 = digits.slice(-8);
	const candidates = Array.from(new Set([
		normalized,
		withoutDdi,
		digits,
		last10,
		last8
	].filter(Boolean)));
	for (const c of candidates) {
		const { data } = await db.from("contacts").select("id, name, whatsapp, phone, cadence_active, cadence_day, funnel_stage").or(`whatsapp.ilike.%${c},phone.ilike.%${c}`).limit(1);
		if (data && data.length > 0) {
			console.log(`[msg:lookup] match via "${c}" -> contact=${data[0].id}`);
			return data[0];
		}
	}
	console.log(`[msg:lookup] nenhum contato para ${normalized}`);
	return null;
}
/**
* Grava uma mensagem recebida no histórico e retorna a activity criada.
*/
async function logInbound(params) {
	const db = await admin(params.workspaceId);
	const now = (/* @__PURE__ */ new Date()).toISOString();
	console.log(`[msg:in] contact=${params.contactId ?? "-"} from=${params.from} len=${params.text.length}`);
	const { data } = await db.from("activities").insert({
		contact_id: params.contactId,
		kind: "whatsapp_in",
		title: params.title ?? (params.contactId ? "Resposta recebida" : `Mensagem de ${params.from}`),
		content: params.text,
		external_id: params.externalId ?? null,
		status: params.status ?? "RECEIVED",
		status_updated_at: now
	}).select("id").maybeSingle();
	if (params.contactId) await db.from("contacts").update({ last_contact_at: now }).eq("id", params.contactId);
	return data?.id;
}
//#endregion
export { findContactByPhone, logInbound, sendAndLog };
