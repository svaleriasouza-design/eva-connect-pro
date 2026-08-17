import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType, r as enumType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/users.functions-3PVsyxLF.js
async function wid(context) {
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return currentWorkspaceId(context.supabase);
}
var roleSchema = objectType({
	userId: stringType().uuid(),
	role: enumType([
		"admin",
		"operador",
		"leitor"
	])
});
var getMyAccessFn_createServerFn_handler = createServerRpc({
	id: "4c36180d9bfef945b32f7bf6df42047be396255042e52aeda75bd5a708896ece",
	name: "getMyAccessFn",
	filename: "src/lib/users.functions.ts"
}, (opts) => getMyAccessFn.__executeServer(opts));
var getMyAccessFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getMyAccessFn_createServerFn_handler, async ({ context }) => {
	const { getRolesFor, displayNameFor } = await import("./users.server-DAiMNjvP.mjs");
	const workspaceId = await wid(context);
	const roles = await getRolesFor(context.userId, workspaceId, context.supabase);
	const email = context.claims?.email ?? "";
	const { data: profile } = await context.supabase.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
	const row = profile ?? null;
	const name = (row?.full_name || row?.email || email || "usuário").trim();
	return {
		workspaceId,
		userId: context.userId,
		email,
		name,
		roles,
		isAdmin: roles.includes("admin"),
		canSend: roles.includes("admin") || roles.includes("operador")
	};
});
var listUsersFn_createServerFn_handler = createServerRpc({
	id: "ba34ab571250545f9427c43baa7ae6e6c0a2d561044afeb362322f4d136bd8fc",
	name: "listUsersFn",
	filename: "src/lib/users.functions.ts"
}, (opts) => listUsersFn.__executeServer(opts));
var listUsersFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listUsersFn_createServerFn_handler, async ({ context }) => {
	const { requireRole, listUsersWithRoles } = await import("./users.server-DAiMNjvP.mjs");
	const workspaceId = await wid(context);
	await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
	return listUsersWithRoles(workspaceId, context.supabase);
});
var setUserRoleFn_createServerFn_handler = createServerRpc({
	id: "3de7bb02871b09ce8ce41e72bac79cb403ac89ad56d7d05ab28fb8febdc99bbb",
	name: "setUserRoleFn",
	filename: "src/lib/users.functions.ts"
}, (opts) => setUserRoleFn.__executeServer(opts));
var setUserRoleFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => roleSchema.parse(data)).handler(setUserRoleFn_createServerFn_handler, async ({ data, context }) => {
	const { requireRole, setUserRole } = await import("./users.server-DAiMNjvP.mjs");
	const workspaceId = await wid(context);
	await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
	if (data.userId === context.userId && data.role !== "admin") throw new Error("Você não pode remover seu próprio acesso de administrador.");
	await setUserRole(data.userId, data.role, workspaceId, context.supabase);
	return { ok: true };
});
var inviteSchema = objectType({
	email: stringType().email(),
	role: enumType([
		"admin",
		"operador",
		"leitor"
	])
});
/** Adiciona um usuário já cadastrado ao workspace do admin, com o papel escolhido. */
var addUserToWorkspaceFn_createServerFn_handler = createServerRpc({
	id: "b91922560501c7cbac2bb8376b3a1490ee305837e3e6c53d0186c2541c069c96",
	name: "addUserToWorkspaceFn",
	filename: "src/lib/users.functions.ts"
}, (opts) => addUserToWorkspaceFn.__executeServer(opts));
var addUserToWorkspaceFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => inviteSchema.parse(data)).handler(addUserToWorkspaceFn_createServerFn_handler, async ({ data, context }) => {
	const { requireRole } = await import("./users.server-DAiMNjvP.mjs");
	const workspaceId = await wid(context);
	await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
	const { supabaseAdmin } = await import("./client.server-Bw6iWMJ-.mjs");
	const sb = supabaseAdmin;
	const { data: profile } = await sb.from("profiles").select("id, email, full_name").ilike("email", data.email).maybeSingle();
	if (!profile) throw new Error("Usuário não encontrado. Peça para a pessoa se cadastrar na EVA primeiro, depois adicione-a aqui.");
	if (profile.id === context.userId) throw new Error("Você já está neste workspace.");
	const { data: existing } = await sb.from("user_roles").select("role").eq("user_id", profile.id).eq("workspace_id", workspaceId);
	if (existing && existing.length > 0) throw new Error("Este usuário já está no seu workspace.");
	const { error } = await sb.from("user_roles").insert({
		user_id: profile.id,
		role: data.role,
		workspace_id: workspaceId
	});
	if (error) throw new Error(error.message);
	return {
		ok: true,
		name: profile.full_name || profile.email
	};
});
//#endregion
export { addUserToWorkspaceFn_createServerFn_handler, getMyAccessFn_createServerFn_handler, listUsersFn_createServerFn_handler, setUserRoleFn_createServerFn_handler };
