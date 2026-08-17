//#region node_modules/.nitro/vite/services/ssr/assets/users.server-DAiMNjvP.js
async function admin() {
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	return supabaseAdmin;
}
async function getRolesFor(userId, workspaceId, supabase) {
	if (supabase) {
		const { data } = await supabase.from("user_roles").select("role").eq("workspace_id", workspaceId).eq("user_id", userId);
		return (data ?? []).map((r) => r.role);
	}
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const { data } = await supabaseAdmin.from("user_roles").select("role").eq("workspace_id", workspaceId).eq("user_id", userId);
	return (data ?? []).map((r) => r.role);
}
async function requireRole(userId, allowed, workspaceId, supabase) {
	const roles = await getRolesFor(userId, workspaceId, supabase);
	if (!roles.some((r) => allowed.includes(r))) throw new Error("Acesso negado: seu usuário não tem permissão para esta ação.");
	return roles;
}
async function displayNameFor(userId, fallback) {
	const { data } = await (await admin()).from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
	const row = data ?? null;
	return (row?.full_name || row?.email || fallback || "usuário").trim();
}
/** Lista apenas os membros do workspace informado. Usa o cliente autenticado. */
async function listUsersWithRoles(workspaceId, supabase) {
	const sb = supabase ?? await admin();
	const { data: roles } = await sb.from("user_roles").select("user_id, role, created_at").eq("workspace_id", workspaceId);
	const rows = roles ?? [];
	const ids = Array.from(new Set(rows.map((r) => r.user_id)));
	if (ids.length === 0) return [];
	const { data: profiles } = await sb.from("profiles").select("id, email, full_name, created_at").in("id", ids).order("created_at", { ascending: true });
	const byUser = /* @__PURE__ */ new Map();
	for (const r of rows) byUser.set(r.user_id, [...byUser.get(r.user_id) ?? [], r.role]);
	return (profiles ?? []).map((p) => ({
		id: p.id,
		email: p.email ?? "",
		full_name: p.full_name ?? "",
		created_at: p.created_at,
		roles: byUser.get(p.id) ?? []
	}));
}
async function setUserRole(userId, role, workspaceId, supabase) {
	const sb = supabase ?? await admin();
	if ((await getRolesFor(userId, workspaceId, sb)).length === 0) throw new Error("Este usuário não pertence ao seu workspace.");
	await sb.from("user_roles").delete().eq("user_id", userId).eq("workspace_id", workspaceId);
	const { error } = await sb.from("user_roles").insert({
		user_id: userId,
		role,
		workspace_id: workspaceId
	});
	if (error) throw new Error(error.message);
}
//#endregion
export { displayNameFor, getRolesFor, listUsersWithRoles, requireRole, setUserRole };
