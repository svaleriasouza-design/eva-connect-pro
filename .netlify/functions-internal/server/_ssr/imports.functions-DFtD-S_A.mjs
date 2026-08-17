import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType, t as arrayType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/imports.functions-DFtD-S_A.js
var batchSchema = objectType({ batchId: stringType().uuid() });
var idsSchema = objectType({ ids: arrayType(stringType().uuid()).min(1).max(1e4) });
var filterSchema = objectType({
	q: stringType().max(200).optional(),
	stage: stringType().max(50).optional(),
	batch: stringType().max(60).optional()
});
async function scope(context) {
	const { currentWorkspaceId, wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { requireRole } = await import("./users.server-DAiMNjvP.mjs");
	const workspaceId = await currentWorkspaceId(context.supabase);
	await requireRole(context.userId, ["admin"], workspaceId);
	return {
		workspaceId,
		db: await wsDb(workspaceId)
	};
}
/** Lista lotes de importação, incluindo os que estão na lixeira. */
var listImportBatchesFn_createServerFn_handler = createServerRpc({
	id: "2753c3e8902abd350e4d0bc2b5e0eb891e9f68dec5e3958b41f380e371e554a5",
	name: "listImportBatchesFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => listImportBatchesFn.__executeServer(opts));
var listImportBatchesFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(listImportBatchesFn_createServerFn_handler, async ({ context }) => {
	const { currentWorkspaceId, wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { data } = await (await wsDb(await currentWorkspaceId(context.supabase))).from("import_batches").select("id, file_name, total_rows, inserted_rows, created_at, created_by_name, deleted_at").order("created_at", { ascending: false }).limit(30);
	return data ?? [];
});
var undoImportFn_createServerFn_handler = createServerRpc({
	id: "9d75ed2e702ee63b83c8626a1881d1cac03ea70e5d62e1dc63082b0c2a942abf",
	name: "undoImportFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => undoImportFn.__executeServer(opts));
var undoImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(undoImportFn_createServerFn_handler, async ({ data, context }) => {
	const { db } = await scope(context);
	const { data: rows } = await db.from("contacts").select("id").eq("import_batch_id", data.batchId);
	const ids = (rows ?? []).map((r) => r.id);
	for (let i = 0; i < ids.length; i += 200) {
		const chunk = ids.slice(i, i + 200);
		await db.from("activities").delete().in("contact_id", chunk);
		await db.from("tasks").delete().in("contact_id", chunk);
		await db.from("events").delete().in("contact_id", chunk);
		await db.from("eva_scheduling_state").delete().in("contact_id", chunk);
		await db.from("saturday_requests").delete().in("contact_id", chunk);
	}
	await db.from("contacts").delete().eq("import_batch_id", data.batchId);
	await db.from("companies").delete().eq("import_batch_id", data.batchId);
	await db.from("import_batches").delete().eq("id", data.batchId);
	return { ok: true };
});
var restoreImportFn_createServerFn_handler = createServerRpc({
	id: "de327c9a0e219f70e2f19673018f203dfba6b571bbd8106359520c32288ae0b8",
	name: "restoreImportFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => restoreImportFn.__executeServer(opts));
var restoreImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(restoreImportFn_createServerFn_handler, async ({ data, context }) => {
	const { db } = await scope(context);
	await db.from("contacts").update({ deleted_at: null }).eq("import_batch_id", data.batchId);
	await db.from("companies").update({ deleted_at: null }).eq("import_batch_id", data.batchId);
	await db.from("import_batches").update({ deleted_at: null }).eq("id", data.batchId);
	return { ok: true };
});
var purgeImportFn_createServerFn_handler = createServerRpc({
	id: "13435c0493a640c4b17b7d995082d900232ebdce49b8541ecc95c98dc3625301",
	name: "purgeImportFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => purgeImportFn.__executeServer(opts));
var purgeImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(purgeImportFn_createServerFn_handler, async ({ data, context }) => {
	const { db } = await scope(context);
	const { data: rows } = await db.from("contacts").select("id").eq("import_batch_id", data.batchId);
	const ids = (rows ?? []).map((r) => r.id);
	for (let i = 0; i < ids.length; i += 200) {
		const chunk = ids.slice(i, i + 200);
		await db.from("activities").delete().in("contact_id", chunk);
		await db.from("tasks").delete().in("contact_id", chunk);
		await db.from("events").delete().in("contact_id", chunk);
		await db.from("eva_scheduling_state").delete().in("contact_id", chunk);
		await db.from("saturday_requests").delete().in("contact_id", chunk);
	}
	await db.from("contacts").delete().eq("import_batch_id", data.batchId);
	await db.from("companies").delete().eq("import_batch_id", data.batchId);
	await db.from("import_batches").delete().eq("id", data.batchId);
	return {
		ok: true,
		removed: ids.length
	};
});
var deleteContactsFn_createServerFn_handler = createServerRpc({
	id: "45efc16d02127ed3969e3e771281bc6e96c6b707850b7d09cbb9ac8fe9e7bd9d",
	name: "deleteContactsFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => deleteContactsFn.__executeServer(opts));
var deleteContactsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => idsSchema.parse(d)).handler(deleteContactsFn_createServerFn_handler, async ({ data, context }) => {
	const { error, data: removed } = await context.supabase.rpc("delete_contacts", { p_ids: data.ids });
	if (error) throw new Error(error.message);
	return {
		ok: true,
		removed: removed ?? 0
	};
});
var deleteContactsByFilterFn_createServerFn_handler = createServerRpc({
	id: "14ea9b996723a678ffedcc174e4d4f378666d6bcf276372f085b6dbd50a53170",
	name: "deleteContactsByFilterFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => deleteContactsByFilterFn.__executeServer(opts));
var deleteContactsByFilterFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => filterSchema.parse(d)).handler(deleteContactsByFilterFn_createServerFn_handler, async ({ data, context }) => {
	const { error, data: removed } = await context.supabase.rpc("delete_contacts_by_filter", {
		p_q: data.q ?? null,
		p_stage: data.stage ?? null,
		p_batch: data.batch ?? null
	});
	if (error) throw new Error(error.message);
	return {
		ok: true,
		removed: removed ?? 0
	};
});
var deleteCompaniesFn_createServerFn_handler = createServerRpc({
	id: "04cf9ced396979b43d54c23b1b9cf00bb4fb908ef6a8dc0e41a7aa53cec6cb18",
	name: "deleteCompaniesFn",
	filename: "src/lib/imports.functions.ts"
}, (opts) => deleteCompaniesFn.__executeServer(opts));
var deleteCompaniesFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => idsSchema.parse(d)).handler(deleteCompaniesFn_createServerFn_handler, async ({ data, context }) => {
	const { error, data: removed } = await context.supabase.rpc("delete_companies", { p_ids: data.ids });
	if (error) throw new Error(error.message);
	return {
		ok: true,
		removed: removed ?? 0
	};
});
//#endregion
export { deleteCompaniesFn_createServerFn_handler, deleteContactsByFilterFn_createServerFn_handler, deleteContactsFn_createServerFn_handler, listImportBatchesFn_createServerFn_handler, purgeImportFn_createServerFn_handler, restoreImportFn_createServerFn_handler, undoImportFn_createServerFn_handler };
