import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/whatsapp.functions-DiM6LUQl.js
var sendSchema = objectType({
	contactId: stringType().uuid(),
	to: stringType().min(6),
	body: stringType().min(1),
	cadenceDay: numberType().int().min(1).max(5).optional(),
	tag: stringType().max(64).optional(),
	manual: booleanType().optional()
});
var sendWhatsappMessageFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => sendSchema.parse(data)).handler(createSsrRpc("5a81420a20f43eeabbede86e21c07f43884e3de02be3a31c7c5c4ec58e5b7e48"));
createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4fbe7dd79b0ab71949f3f2cd951b6eebb09622ba4a5926df719587108819669a"));
//#endregion
export { sendWhatsappMessageFn as t };
