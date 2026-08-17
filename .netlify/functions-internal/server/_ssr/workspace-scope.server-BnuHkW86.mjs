import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace-scope.server-BnuHkW86.js
var workspace_scope_server_BnuHkW86_exports = /* @__PURE__ */ __exportAll({
	n: () => wsDb,
	t: () => workspace_scope_server_exports
});
var workspace_scope_server_exports = /* @__PURE__ */ __exportAll$1({
	currentWorkspaceId: () => currentWorkspaceId,
	legacyWorkspaceId: () => legacyWorkspaceId,
	listCadenceSettings: () => listCadenceSettings,
	workspaceIdForPhoneNumberId: () => workspaceIdForPhoneNumberId,
	workspaceIdForVerifyToken: () => workspaceIdForVerifyToken,
	wsDb: () => wsDb
});
async function admin() {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	return supabaseAdmin;
}
function withWs(rows, workspaceId) {
	const add = (r) => ({
		...r,
		workspace_id: workspaceId
	});
	return Array.isArray(rows) ? rows.map(add) : add(rows);
}
/** Cliente admin escopado a um workspace. */
async function wsDb(workspaceId) {
	if (!workspaceId) throw new Error("workspaceId obrigatório (isolamento multi-tenant).");
	const db = await admin();
	return { from(table) {
		return {
			select: (...args) => db.from(table).select(...args).eq("workspace_id", workspaceId),
			insert: (rows, opts) => db.from(table).insert(withWs(rows, workspaceId), opts),
			upsert: (rows, opts) => db.from(table).upsert(withWs(rows, workspaceId), opts),
			update: (patch, opts) => db.from(table).update(patch, opts).eq("workspace_id", workspaceId),
			delete: (opts) => db.from(table).delete(opts).eq("workspace_id", workspaceId)
		};
	} };
}
/** Workspace do usuário autenticado (usa o client com RLS do próprio usuário). */
async function currentWorkspaceId(supabase) {
	const { data, error } = await supabase.rpc("current_workspace_id");
	if (error) throw new Error(`Não foi possível identificar seu workspace: ${error.message}`);
	if (!data) throw new Error("Seu usuário ainda não possui um workspace.");
	return data;
}
/** Resolve o workspace a partir do número da Meta que recebeu a mensagem. */
async function workspaceIdForPhoneNumberId(phoneNumberId) {
	if (!phoneNumberId) return null;
	const { data } = await (await admin()).from("meta_wa_settings").select("workspace_id").eq("phone_number_id", phoneNumberId).maybeSingle();
	return data?.workspace_id ?? null;
}
/** Resolve o workspace pelo verify token (handshake do webhook da Meta). */
async function workspaceIdForVerifyToken(token) {
	if (!token) return null;
	const { data } = await (await admin()).from("meta_wa_settings").select("workspace_id").eq("verify_token", token).maybeSingle();
	return data?.workspace_id ?? null;
}
/** Workspace legado (o mais antigo) — usado como fallback do webhook. */
async function legacyWorkspaceId() {
	const { data } = await (await admin()).from("workspaces").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();
	return data?.id ?? null;
}
/** Todas as configurações de cadência (uma por workspace) — usado pelo cron. */
async function listCadenceSettings() {
	const { data } = await (await admin()).from("cadence_settings").select("*");
	return data ?? [];
}
//#endregion
export { wsDb as n, workspace_scope_server_BnuHkW86_exports as t };
