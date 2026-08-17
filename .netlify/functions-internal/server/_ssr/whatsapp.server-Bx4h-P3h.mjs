import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
import { t as normalizePhoneNumber } from "./phone-06k09EE6.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/whatsapp.server-Bx4h-P3h.js
var whatsapp_server_Bx4h_P3h_exports = /* @__PURE__ */ __exportAll({
	i: () => whatsapp_server_exports,
	n: () => sendWhatsappTemplate,
	r: () => sendWhatsappText,
	t: () => loadMetaConfig
});
var whatsapp_server_exports = /* @__PURE__ */ __exportAll$1({
	loadMetaConfig: () => loadMetaConfig,
	sendWhatsappTemplate: () => sendWhatsappTemplate,
	sendWhatsappText: () => sendWhatsappText,
	verifyMetaSignature: () => verifyMetaSignature
});
/**
* Credenciais da Meta SEMPRE por workspace. Número e token nunca caem em
* variável de ambiente global — isso evitaria o isolamento entre empresas.
*/
async function loadMetaConfig(workspaceId) {
	let row = {};
	try {
		const { wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
		const { data } = await (await wsDb(workspaceId)).from("meta_wa_settings").select("phone_number_id, access_token, app_secret, verify_token, graph_version, default_template_name, default_template_lang").maybeSingle();
		row = data ?? {};
	} catch {
		row = {};
	}
	return {
		phoneNumberId: row.phone_number_id || "",
		accessToken: row.access_token || "",
		appSecret: row.app_secret || "",
		verifyToken: row.verify_token || "",
		graphVersion: row.graph_version || "v21.0",
		defaultTemplateName: row.default_template_name || "hello_world",
		defaultTemplateLang: row.default_template_lang || "en_US"
	};
}
function normalizePhone(raw) {
	return normalizePhoneNumber(raw);
}
async function sendWhatsappText(workspaceId, to, body) {
	try {
		const cfg = await loadMetaConfig(workspaceId);
		const phoneId = cfg?.phoneNumberId;
		const token = cfg?.accessToken;
		if (!phoneId || !token) return {
			ok: false,
			error: "Credenciais Meta Cloud API não configuradas."
		};
		const url = `https://graph.facebook.com/${cfg?.graphVersion ?? "v21.0"}/${phoneId}/messages`;
		const payload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: normalizePhone(to ?? ""),
			type: "text",
			text: {
				preview_url: false,
				body: body ?? ""
			}
		};
		let res;
		try {
			res = await fetch(url, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(payload)
			});
		} catch (netErr) {
			return {
				ok: false,
				error: `Falha de rede ao contatar Graph API: ${netErr instanceof Error ? netErr.message : String(netErr)}`
			};
		}
		const rawText = await res.text().catch(() => "");
		let json = null;
		if (rawText) try {
			json = JSON.parse(rawText);
		} catch {
			json = null;
		}
		if (!res.ok || json?.error) {
			const metaMsg = json?.error?.message;
			const metaCode = json?.error?.code;
			const metaSub = json?.error?.error_subcode;
			const metaType = json?.error?.type;
			return {
				ok: false,
				error: [
					metaMsg ? `${metaMsg}` : `HTTP ${res.status}`,
					metaCode != null ? `code ${metaCode}` : null,
					metaSub != null ? `subcode ${metaSub}` : null,
					metaType ? `type ${metaType}` : null
				].filter(Boolean).join(" · "),
				raw: json ?? rawText
			};
		}
		return {
			ok: true,
			messageId: json?.messages?.[0]?.id,
			raw: json
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
}
async function sendWhatsappTemplate(workspaceId, to, templateName, languageCode = "pt_BR", bodyParams = []) {
	const cfg = await loadMetaConfig(workspaceId);
	const phoneId = cfg.phoneNumberId;
	const token = cfg.accessToken;
	if (!phoneId || !token) return {
		ok: false,
		error: "Credenciais Meta Cloud API não configuradas."
	};
	const url = `https://graph.facebook.com/${cfg.graphVersion}/${phoneId}/messages`;
	const name = (templateName ?? "").trim().toLowerCase();
	const payload = {
		messaging_product: "whatsapp",
		to: normalizePhone(to),
		type: "template",
		template: {
			name,
			language: { code: languageCode }
		}
	};
	if (bodyParams.length) payload.template.components = [{
		type: "body",
		parameters: bodyParams.map((text) => ({
			type: "text",
			text
		}))
	}];
	let res;
	try {
		res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify(payload)
		});
	} catch (netErr) {
		return {
			ok: false,
			error: `Falha de rede ao contatar Graph API: ${netErr instanceof Error ? netErr.message : String(netErr)}`
		};
	}
	const rawText = await res.text().catch(() => "");
	let json = null;
	try {
		json = rawText ? JSON.parse(rawText) : null;
	} catch {
		json = null;
	}
	if (!res.ok || json?.error) return {
		ok: false,
		error: [
			json?.error?.message ? String(json.error.message) : `HTTP ${res.status}`,
			json?.error?.code != null ? `code ${json.error.code}` : null,
			json?.error?.error_subcode != null ? `subcode ${json.error.error_subcode}` : null,
			`template ${name} (${languageCode})`
		].filter(Boolean).join(" · "),
		raw: json ?? rawText
	};
	return {
		ok: true,
		messageId: json?.messages?.[0]?.id,
		raw: json
	};
}
async function verifyMetaSignature(workspaceId, rawBody, headerValue) {
	const secret = (workspaceId ? await loadMetaConfig(workspaceId) : null)?.appSecret || process.env.META_WA_APP_SECRET || "";
	if (!secret) return false;
	if (!headerValue) return false;
	const provided = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
	const enc = new TextEncoder();
	const key = await crypto.subtle.importKey("raw", enc.encode(secret), {
		name: "HMAC",
		hash: "SHA-256"
	}, false, ["sign"]);
	const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
	const expected = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
	if (expected.length !== provided.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
	return diff === 0;
}
//#endregion
export { whatsapp_server_Bx4h_P3h_exports as i, sendWhatsappTemplate as n, sendWhatsappText as r, loadMetaConfig as t };
