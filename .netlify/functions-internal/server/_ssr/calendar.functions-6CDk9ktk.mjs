import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/calendar.functions-6CDk9ktk.js
var getCalendarStatusFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2e07aa154785720f39dc7248df59e3c112828655e40e3dc600a6fac377e742b8"));
var suggestSlotsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({ duration: numberType().min(15).max(240).default(30) }).parse(raw)).handler(createSsrRpc("4cd7f6ed562b7aaefd159f9588e2186496a294aee0a7dfab8acdbb04c1879282"));
var scheduleMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	startIso: stringType().min(10),
	duration: numberType().min(15).max(480).default(30),
	online: booleanType().default(true),
	title: stringType().max(200).optional()
}).parse(raw)).handler(createSsrRpc("bf9c27a9880d0a5598a350064b2942611c7d79683809f842468434960eb83347"));
var rescheduleMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	startIso: stringType().min(10)
}).parse(raw)).handler(createSsrRpc("ca6ed22f86c47c1ac9534fd3f78c1e82fc6d53c9cd9a2e9e6d12c57ddede719f"));
var cancelMeetingFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactId: stringType().uuid(),
	motivo: stringType().max(300).optional()
}).parse(raw)).handler(createSsrRpc("66388ae22cc2f3defa6c79b71282b637f564d6996960b624db2dc379bbfdfe4f"));
//#endregion
export { suggestSlotsFn as a, scheduleMeetingFn as i, getCalendarStatusFn as n, rescheduleMeetingFn as r, cancelMeetingFn as t };
