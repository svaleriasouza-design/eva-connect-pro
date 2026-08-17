import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cadence.functions-DDQTYnao.js
var getCadenceConfigFn_createServerFn_handler = createServerRpc({
	id: "befeefa330923b71f17b6d70e947ba48bd2a2e2f7c1617800f1ca8e430c33d5f",
	name: "getCadenceConfigFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => getCadenceConfigFn.__executeServer(opts));
var getCadenceConfigFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getCadenceConfigFn_createServerFn_handler, async ({ context }) => {
	const sb = context.supabase;
	const { data: steps } = await sb.from("cadence_steps").select("day, script, ai_instructions, active").order("day", { ascending: true });
	const { data: settings } = await sb.from("cadence_settings").select("*").maybeSingle();
	return {
		steps: steps ?? [],
		settings: settings ?? null
	};
});
var stepSchema = objectType({
	day: numberType().int().min(1).max(30),
	script: stringType().default(""),
	ai_instructions: stringType().default(""),
	active: booleanType().default(true)
});
var saveCadenceStepFn_createServerFn_handler = createServerRpc({
	id: "6bc6281d96f26ca7147e63aba33a145b7f1c7bdb22a3df1683d3afc37da51195",
	name: "saveCadenceStepFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => saveCadenceStepFn.__executeServer(opts));
var saveCadenceStepFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => stepSchema.parse(raw)).handler(saveCadenceStepFn_createServerFn_handler, async ({ data, context }) => {
	const sb = context.supabase;
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const workspace_id = await currentWorkspaceId(context.supabase);
	const { error } = await sb.from("cadence_steps").upsert({
		workspace_id,
		day: data.day,
		script: data.script,
		ai_instructions: data.ai_instructions,
		active: data.active
	}, { onConflict: "workspace_id,day" });
	if (error) throw new Error(error.message);
	return { ok: true };
});
var deleteCadenceStepFn_createServerFn_handler = createServerRpc({
	id: "724bda7c6aa35edbd00d31c5bcc7d8233387bce8db1df18d6d60a5a822accb80",
	name: "deleteCadenceStepFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => deleteCadenceStepFn.__executeServer(opts));
var deleteCadenceStepFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({ day: numberType().int().min(1).max(30) }).parse(raw)).handler(deleteCadenceStepFn_createServerFn_handler, async ({ data, context }) => {
	const { error } = await context.supabase.from("cadence_steps").delete().eq("day", data.day);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var settingsSchema = objectType({
	morning_time: stringType().regex(/^\d{2}:\d{2}(:\d{2})?$/),
	afternoon_time: stringType().regex(/^\d{2}:\d{2}(:\d{2})?$/),
	batch_size: numberType().int().min(1).max(500),
	timezone: stringType().default("America/Sao_Paulo"),
	weekdays_only: booleanType(),
	auto_reply_enabled: booleanType(),
	automation_enabled: booleanType()
});
var saveCadenceSettingsFn_createServerFn_handler = createServerRpc({
	id: "168dee4f9e5f9e6d4a62bb4a7d4938976c3775c49917361360965ca4b3975e05",
	name: "saveCadenceSettingsFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => saveCadenceSettingsFn.__executeServer(opts));
var saveCadenceSettingsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => settingsSchema.parse(raw)).handler(saveCadenceSettingsFn_createServerFn_handler, async ({ data, context }) => {
	const sb = context.supabase;
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const workspaceId = await currentWorkspaceId(context.supabase);
	const { error } = await sb.from("cadence_settings").update({ ...data }).eq("workspace_id", workspaceId);
	if (error) throw new Error(error.message);
	return { ok: true };
});
var activateCadenceFn_createServerFn_handler = createServerRpc({
	id: "87a318cbd3cfe775436a72dde43ab3c4b3f442990fef43c6c88e027437152256",
	name: "activateCadenceFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => activateCadenceFn.__executeServer(opts));
var activateCadenceFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactIds: arrayType(stringType().uuid()).min(1).max(5e3),
	resetToDayZero: booleanType().default(true)
}).parse(raw)).handler(activateCadenceFn_createServerFn_handler, async ({ data, context }) => {
	const sb = context.supabase;
	const patch = {
		cadence_active: true,
		do_not_contact: false
	};
	if (data.resetToDayZero) patch.cadence_day = 0;
	const { error, count } = await sb.from("contacts").update(patch, { count: "exact" }).in("id", data.contactIds);
	if (error) throw new Error(error.message);
	return {
		ok: true,
		activated: count ?? data.contactIds.length
	};
});
var startCadenceForAllEligibleFn_createServerFn_handler = createServerRpc({
	id: "2e2f4112fbaec01d97a223c76b41d904f7a0c11541450410064109a0b94bdd62",
	name: "startCadenceForAllEligibleFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => startCadenceForAllEligibleFn.__executeServer(opts));
var startCadenceForAllEligibleFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(startCadenceForAllEligibleFn_createServerFn_handler, async ({ context }) => {
	const { data: updated, error } = await context.supabase.from("contacts").update({
		cadence_active: true,
		cadence_day: 0
	}).eq("funnel_stage", "novo_lead").eq("do_not_contact", false).eq("cadence_active", false).or("whatsapp.neq.,phone.neq.").select("id");
	if (error) throw new Error(error.message);
	return {
		ok: true,
		activated: updated?.length ?? 0
	};
});
var getCadenceStatsFn_createServerFn_handler = createServerRpc({
	id: "32543015e2627274b96c4ef30b00d4507ee72b95119e19dbaf387508f5146ea4",
	name: "getCadenceStatsFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => getCadenceStatsFn.__executeServer(opts));
var getCadenceStatsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getCadenceStatsFn_createServerFn_handler, async ({ context }) => {
	const sb = context.supabase;
	const q = (b) => b.select("id", {
		count: "exact",
		head: true
	});
	const [active, novo, blocked] = await Promise.all([
		q(sb.from("contacts")).eq("cadence_active", true),
		q(sb.from("contacts")).eq("funnel_stage", "novo_lead").eq("cadence_active", false).eq("do_not_contact", false).or("whatsapp.neq.,phone.neq."),
		q(sb.from("contacts")).eq("do_not_contact", true)
	]);
	return {
		active: active.count ?? 0,
		eligible: novo.count ?? 0,
		blocked: blocked.count ?? 0
	};
});
var runCadenceNowFn_createServerFn_handler = createServerRpc({
	id: "4946e41880276233dd51fa4ccefc805fe436b31f01e8b5dcff69ca2f4a4d9905",
	name: "runCadenceNowFn",
	filename: "src/lib/cadence.functions.ts"
}, (opts) => runCadenceNowFn.__executeServer(opts));
var runCadenceNowFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	slot: enumType(["morning", "afternoon"]),
	batchSize: numberType().int().min(1).max(500).optional()
}).parse(raw)).handler(runCadenceNowFn_createServerFn_handler, async ({ data, context }) => {
	const sb = context.supabase;
	let size = data.batchSize;
	if (!size) {
		const { data: settings } = await sb.from("cadence_settings").select("batch_size").maybeSingle();
		size = settings?.batch_size ?? 10;
	}
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const workspaceId = await currentWorkspaceId(context.supabase);
	const { runCadenceBatch } = await import("./cadence-runner.server-BNvRE-Rw.mjs");
	return await runCadenceBatch(workspaceId, data.slot, size);
});
//#endregion
export { activateCadenceFn_createServerFn_handler, deleteCadenceStepFn_createServerFn_handler, getCadenceConfigFn_createServerFn_handler, getCadenceStatsFn_createServerFn_handler, runCadenceNowFn_createServerFn_handler, saveCadenceSettingsFn_createServerFn_handler, saveCadenceStepFn_createServerFn_handler, startCadenceForAllEligibleFn_createServerFn_handler };
