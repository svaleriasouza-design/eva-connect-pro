import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/settings.functions-DIWzLUV_.js
async function wid(context) {
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return currentWorkspaceId(context.supabase);
}
var saveSchema = objectType({
	phone_number_id: stringType().trim().max(64).optional().nullable(),
	access_token: stringType().trim().max(4096).optional().nullable(),
	app_secret: stringType().trim().max(512).optional().nullable(),
	verify_token: stringType().trim().max(256).optional().nullable(),
	graph_version: stringType().trim().max(16).optional().nullable(),
	default_template_name: stringType().trim().max(128).optional().nullable(),
	default_template_lang: stringType().trim().max(16).optional().nullable()
});
var testSendSchema = objectType({
	to: stringType().min(6),
	body: stringType().min(1).max(1e3)
});
var getMetaSettingsFn_createServerFn_handler = createServerRpc({
	id: "43a4c05023f0de8b4662cd5d6c17472e7376515bb40b6a2dcb29512f3c5313d9",
	name: "getMetaSettingsFn",
	filename: "src/lib/settings.functions.ts"
}, (opts) => getMetaSettingsFn.__executeServer(opts));
var getMetaSettingsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMetaSettingsFn_createServerFn_handler, async ({ context }) => {
	const { wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { data } = await (await wsDb(await wid(context))).from("meta_wa_settings").select("phone_number_id, access_token, app_secret, verify_token, graph_version, default_template_name, default_template_lang, updated_at").maybeSingle();
	const row = data ?? {};
	return {
		phone_number_id: row.phone_number_id ?? "",
		access_token: row.access_token ?? "",
		app_secret: row.app_secret ?? "",
		verify_token: row.verify_token ?? "",
		graph_version: row.graph_version ?? "v21.0",
		default_template_name: row.default_template_name ?? "hello_world",
		default_template_lang: row.default_template_lang ?? "en_US",
		updated_at: row.updated_at ?? null
	};
});
var saveMetaSettingsFn_createServerFn_handler = createServerRpc({
	id: "744770ddce0ae6952190a7da68e93cb4fb4398938fe502890d51243ceb16b841",
	name: "saveMetaSettingsFn",
	filename: "src/lib/settings.functions.ts"
}, (opts) => saveMetaSettingsFn.__executeServer(opts));
var saveMetaSettingsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => saveSchema.parse(data)).handler(saveMetaSettingsFn_createServerFn_handler, async ({ data, context }) => {
	const workspaceId = await wid(context);
	const { requireRole } = await import("./users.server-DAiMNjvP.mjs");
	await requireRole(context.userId, ["admin"], workspaceId);
	const payload = {
		id: true,
		phone_number_id: data.phone_number_id || null,
		access_token: data.access_token || null,
		app_secret: data.app_secret || null,
		verify_token: data.verify_token || null,
		graph_version: data.graph_version || "v21.0",
		default_template_name: data.default_template_name || "hello_world",
		default_template_lang: data.default_template_lang || "en_US"
	};
	const { wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { error } = await (await wsDb(workspaceId)).from("meta_wa_settings").upsert(payload, { onConflict: "workspace_id" });
	if (error) return {
		ok: false,
		error: error.message
	};
	return { ok: true };
});
var testMetaConnectionFn_createServerFn_handler = createServerRpc({
	id: "e9244bf2cfc50d7b14327d925a4b0a8c42baefd4601a231223c1388aed4b4ce0",
	name: "testMetaConnectionFn",
	filename: "src/lib/settings.functions.ts"
}, (opts) => testMetaConnectionFn.__executeServer(opts));
var testMetaConnectionFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(testMetaConnectionFn_createServerFn_handler, async ({ context }) => {
	const { loadMetaConfig } = await import("./whatsapp.server-Bx4h-P3h.mjs").then((n) => n.i).then((n) => n.i);
	const cfg = await loadMetaConfig(await wid(context));
	if (!cfg.phoneNumberId || !cfg.accessToken) return {
		ok: false,
		error: "Preencha o ID do Número e o Token de Acesso antes de testar."
	};
	try {
		const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
		const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } });
		const json = await res.json();
		if (!res.ok || json.error) return {
			ok: false,
			error: json?.error?.message || `HTTP ${res.status}`
		};
		return {
			ok: true,
			phone: json.display_phone_number,
			name: json.verified_name,
			quality: json.quality_rating
		};
	} catch (err) {
		return {
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		};
	}
});
var sendTestMessageFn_createServerFn_handler = createServerRpc({
	id: "ea08e9a2a1628a1e6e6401fde41ed4b328e88234049a33771375ad287996676d",
	name: "sendTestMessageFn",
	filename: "src/lib/settings.functions.ts"
}, (opts) => sendTestMessageFn.__executeServer(opts));
var sendTestMessageFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => {
	const parsed = testSendSchema.safeParse(data);
	if (!parsed.success) return {
		__invalid: true,
		error: parsed.error.issues[0]?.message ?? "Dados inválidos."
	};
	return parsed.data;
}).handler(sendTestMessageFn_createServerFn_handler, async ({ data, context }) => {
	try {
		const workspaceId = await wid(context);
		if (data?.__invalid) return {
			ok: false,
			error: data.error
		};
		const payload = data;
		const { sendAndLog, findContactByPhone } = await import("./messaging.server-Czbp4TxB.mjs");
		const contact = await findContactByPhone(workspaceId, payload?.to ?? "");
		const res = await sendAndLog({
			workspaceId,
			to: payload?.to ?? "",
			body: payload?.body ?? "",
			contactId: contact?.id ?? null,
			title: "Teste de conexão",
			tag: "test"
		});
		if (res?.ok) return {
			ok: true,
			messageId: res?.messageId,
			to: res.to
		};
		return {
			ok: false,
			error: res?.error ?? "Falha no envio.",
			to: res.to,
			raw: res?.raw ?? null
		};
	} catch (err) {
		return {
			ok: false,
			error: `Exceção no servidor: ${err instanceof Error ? err.message : String(err)}`
		};
	}
});
//#endregion
export { getMetaSettingsFn_createServerFn_handler, saveMetaSettingsFn_createServerFn_handler, sendTestMessageFn_createServerFn_handler, testMetaConnectionFn_createServerFn_handler };
