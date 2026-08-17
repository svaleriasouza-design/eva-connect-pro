import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/calendar.functions-Bbp5KlZU.js
async function wid(context) {
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return currentWorkspaceId(context.supabase);
}
var getCalendarStatusFn_createServerFn_handler = createServerRpc({
	id: "2e07aa154785720f39dc7248df59e3c112828655e40e3dc600a6fac377e742b8",
	name: "getCalendarStatusFn",
	filename: "src/lib/calendar.functions.ts"
}, (opts) => getCalendarStatusFn.__executeServer(opts));
var getCalendarStatusFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(getCalendarStatusFn_createServerFn_handler, async ({ context }) => {
	const { calendarConfigured, listCalendars } = await import("./google-calendar.server-CSmWKIP6.mjs");
	if (!await calendarConfigured(await wid(context))) return {
		connected: false,
		error: "Google Calendar ainda não conectado."
	};
	const res = await listCalendars();
	if (!res.ok) return {
		connected: false,
		error: res.error
	};
	return {
		connected: true,
		calendar: (res.data.items?.find((c) => c.primary) ?? res.data.items?.[0])?.summary ?? "primary",
		total: res.data.items?.length ?? 0
	};
});
var suggestSlotsFn_createServerFn_handler = createServerRpc({
	id: "4cd7f6ed562b7aaefd159f9588e2186496a294aee0a7dfab8acdbb04c1879282",
	name: "suggestSlotsFn",
	filename: "src/lib/calendar.functions.ts"
}, (opts) => suggestSlotsFn.__executeServer(opts));
var suggestSlotsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({ duration: numberType().min(15).max(240).default(30) }).parse(raw)).handler(suggestSlotsFn_createServerFn_handler, async ({ data }) => {
	const { suggestSlots } = await import("./google-calendar.server-CSmWKIP6.mjs");
	const res = await suggestSlots({
		durationMinutes: data.duration,
		limit: 5
	});
	return res.ok ? {
		ok: true,
		slots: res.data
	} : {
		ok: false,
		error: res.error
	};
});
var scheduleMeetingFn_createServerFn_handler = createServerRpc({
	id: "bf9c27a9880d0a5598a350064b2942611c7d79683809f842468434960eb83347",
	name: "scheduleMeetingFn",
	filename: "src/lib/calendar.functions.ts"
}, (opts) => scheduleMeetingFn.__executeServer(opts));
var scheduleMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	startIso: stringType().min(10),
	duration: numberType().min(15).max(480).default(30),
	online: booleanType().default(true),
	title: stringType().max(200).optional()
}).parse(raw)).handler(scheduleMeetingFn_createServerFn_handler, async ({ data, context }) => {
	const workspaceId = await wid(context);
	const { wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { data: c } = await (await wsDb(workspaceId)).from("contacts").select("id, name, email, whatsapp, phone").eq("id", data.contactId).maybeSingle();
	if (!c) return {
		ok: false,
		error: "Contato não encontrado."
	};
	const { scheduleMeeting } = await import("./scheduling.server-D_Wsh8N5.mjs");
	const res = await scheduleMeeting({
		workspaceId,
		contactId: c.id,
		contactName: c.name,
		phone: c.whatsapp || c.phone || "",
		startIso: new Date(data.startIso).toISOString(),
		durationMinutes: data.duration,
		online: data.online,
		email: c.email,
		title: data.title
	});
	if (!res.ok) return {
		ok: false,
		error: res.error === "busy" ? "Horário ocupado no Google Calendar." : res.error
	};
	return {
		ok: true,
		meetLink: res.meetLink
	};
});
var rescheduleMeetingFn_createServerFn_handler = createServerRpc({
	id: "ca6ed22f86c47c1ac9534fd3f78c1e82fc6d53c9cd9a2e9e6d12c57ddede719f",
	name: "rescheduleMeetingFn",
	filename: "src/lib/calendar.functions.ts"
}, (opts) => rescheduleMeetingFn.__executeServer(opts));
var rescheduleMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	startIso: stringType().min(10)
}).parse(raw)).handler(rescheduleMeetingFn_createServerFn_handler, async ({ data, context }) => {
	const { rescheduleMeeting } = await import("./scheduling.server-D_Wsh8N5.mjs");
	const res = await rescheduleMeeting(await wid(context), data.contactId, new Date(data.startIso).toISOString());
	return res.ok ? { ok: true } : {
		ok: false,
		error: res.error === "busy" ? "Horário ocupado." : res.error
	};
});
var cancelMeetingFn_createServerFn_handler = createServerRpc({
	id: "66388ae22cc2f3defa6c79b71282b637f564d6996960b624db2dc379bbfdfe4f",
	name: "cancelMeetingFn",
	filename: "src/lib/calendar.functions.ts"
}, (opts) => cancelMeetingFn.__executeServer(opts));
var cancelMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	motivo: stringType().max(300).optional()
}).parse(raw)).handler(cancelMeetingFn_createServerFn_handler, async ({ data, context }) => {
	const { cancelMeeting } = await import("./scheduling.server-D_Wsh8N5.mjs");
	const res = await cancelMeeting(await wid(context), data.contactId, data.motivo ?? "Cancelado pela Valéria na Agenda da EVA");
	return res.ok ? { ok: true } : {
		ok: false,
		error: res.error
	};
});
//#endregion
export { cancelMeetingFn_createServerFn_handler, getCalendarStatusFn_createServerFn_handler, rescheduleMeetingFn_createServerFn_handler, scheduleMeetingFn_createServerFn_handler, suggestSlotsFn_createServerFn_handler };
