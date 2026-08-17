import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/workspace.functions-CklZr7zu.js
var saveSchema = objectType({
	name: stringType().trim().min(2).max(80),
	tagline: stringType().trim().max(120).optional().nullable(),
	owner_name: stringType().trim().max(80).optional().nullable()
});
async function wid(context) {
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return currentWorkspaceId(context.supabase);
}
var getWorkspaceFn_createServerFn_handler = createServerRpc({
	id: "2853047e2e8bff0a6624aa1804d77d73163a963eb22f56f5fd76cc60b1567dd3",
	name: "getWorkspaceFn",
	filename: "src/lib/workspace.functions.ts"
}, (opts) => getWorkspaceFn.__executeServer(opts));
var getWorkspaceFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getWorkspaceFn_createServerFn_handler, async ({ context }) => {
	const { loadWorkspace } = await import("./workspace.server-VbM9IL_r.mjs");
	return loadWorkspace(await wid(context), context.supabase);
});
var saveWorkspaceFn_createServerFn_handler = createServerRpc({
	id: "d9c48897b8e92b0b0bede6b6c6687a221e78c08262f501790291ef096c0fdae3",
	name: "saveWorkspaceFn",
	filename: "src/lib/workspace.functions.ts"
}, (opts) => saveWorkspaceFn.__executeServer(opts));
var saveWorkspaceFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => saveSchema.parse(data)).handler(saveWorkspaceFn_createServerFn_handler, async ({ data, context }) => {
	const workspaceId = await wid(context);
	const { getRolesFor } = await import("./users.server-DAiMNjvP.mjs");
	if (!(await getRolesFor(context.userId, workspaceId, context.supabase)).includes("admin")) throw new Error("Acesso negado: somente administradores podem alterar estes dados.");
	const { saveWorkspace } = await import("./workspace.server-VbM9IL_r.mjs");
	return saveWorkspace(workspaceId, data, context.supabase);
});
//#endregion
export { getWorkspaceFn_createServerFn_handler, saveWorkspaceFn_createServerFn_handler };
