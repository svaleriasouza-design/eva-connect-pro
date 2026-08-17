import { n as wsDb } from "./workspace-scope.server-BnuHkW86.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace.server-VbM9IL_r.js
var WORKSPACE_FALLBACK = {
	name: "EVA IA",
	tagline: "Assistente Executiva",
	owner_name: ""
};
async function loadWorkspace(workspaceId, supabase) {
	const { data } = await (supabase ?? await wsDb(workspaceId)).from("workspace_settings").select("name, tagline, owner_name").eq("workspace_id", workspaceId).maybeSingle();
	const row = data ?? {};
	return {
		name: row.name || WORKSPACE_FALLBACK.name,
		tagline: row.tagline || WORKSPACE_FALLBACK.tagline,
		owner_name: row.owner_name || ""
	};
}
async function saveWorkspace(workspaceId, input, supabase) {
	const { error } = await (supabase ?? await wsDb(workspaceId)).from("workspace_settings").upsert({
		id: true,
		workspace_id: workspaceId,
		name: input.name,
		tagline: input.tagline || null,
		owner_name: input.owner_name || null
	}, { onConflict: "workspace_id" });
	if (error) return {
		ok: false,
		error: error.message
	};
	await (supabase ?? await wsDb(workspaceId)).from("workspaces").update({ name: input.name }).eq("id", workspaceId);
	return { ok: true };
}
//#endregion
export { loadWorkspace, saveWorkspace };
