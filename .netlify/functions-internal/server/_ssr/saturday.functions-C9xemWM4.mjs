import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, n as booleanType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/saturday.functions-C9xemWM4.js
async function wid(context) {
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return currentWorkspaceId(context.supabase);
}
var listSaturdayRequestsFn_createServerFn_handler = createServerRpc({
	id: "f01d8af5205acdef9419a007f48c32d83ef690e30c403d7f6b3712d78724c96c",
	name: "listSaturdayRequestsFn",
	filename: "src/lib/saturday.functions.ts"
}, (opts) => listSaturdayRequestsFn.__executeServer(opts));
var listSaturdayRequestsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listSaturdayRequestsFn_createServerFn_handler, async ({ context }) => {
	const { listPendingSaturdayRequests } = await import("./saturday.server-DcJJYLmp.mjs");
	return listPendingSaturdayRequests(await wid(context));
});
var decideSaturdayRequestFn_createServerFn_handler = createServerRpc({
	id: "2a4a6be3abc7027777c52dab592d41db552955c8fe70d93efc01f3b02daa852e",
	name: "decideSaturdayRequestFn",
	filename: "src/lib/saturday.functions.ts"
}, (opts) => decideSaturdayRequestFn.__executeServer(opts));
var decideSaturdayRequestFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	requestId: stringType().uuid(),
	approve: booleanType()
}).parse(raw)).handler(decideSaturdayRequestFn_createServerFn_handler, async ({ data, context }) => {
	const workspaceId = await wid(context);
	const { requireRole, displayNameFor } = await import("./users.server-DAiMNjvP.mjs");
	await requireRole(context.userId, ["admin", "operador"], workspaceId);
	const email = context.claims?.email ?? "";
	const { decideSaturdayRequest } = await import("./saturday.server-DcJJYLmp.mjs");
	return decideSaturdayRequest({
		workspaceId,
		requestId: data.requestId,
		approve: data.approve,
		userId: context.userId,
		userName: await displayNameFor(context.userId, email)
	});
});
//#endregion
export { decideSaturdayRequestFn_createServerFn_handler, listSaturdayRequestsFn_createServerFn_handler };
