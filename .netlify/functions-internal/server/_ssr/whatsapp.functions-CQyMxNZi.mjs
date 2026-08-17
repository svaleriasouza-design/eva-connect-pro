import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType } from "../_libs/zod.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/whatsapp.functions-CQyMxNZi.js
var sendSchema = objectType({
	contactId: stringType().uuid(),
	to: stringType().min(6),
	body: stringType().min(1),
	cadenceDay: numberType().int().min(1).max(5).optional(),
	tag: stringType().max(64).optional(),
	manual: booleanType().optional()
});
var sendWhatsappMessageFn_createServerFn_handler = createServerRpc({
	id: "5a81420a20f43eeabbede86e21c07f43884e3de02be3a31c7c5c4ec58e5b7e48",
	name: "sendWhatsappMessageFn",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => sendWhatsappMessageFn.__executeServer(opts));
var sendWhatsappMessageFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => sendSchema.parse(data)).handler(sendWhatsappMessageFn_createServerFn_handler, async ({ data, context }) => {
	const { sendAndLog } = await import("./messaging.server-Czbp4TxB.mjs");
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const workspaceId = await currentWorkspaceId(context.supabase);
	const { requireRole, displayNameFor } = await import("./users.server-DAiMNjvP.mjs");
	await requireRole(context.userId, ["admin", "operador"], workspaceId);
	const sender = await displayNameFor(context.userId, context.claims?.email ?? "atendente");
	const manualTitle = `Mensagem enviada por ${sender}`;
	const result = await sendAndLog({
		workspaceId,
		to: data.to,
		body: data.body,
		contactId: data.contactId,
		title: data.cadenceDay ? `Mensagem Dia ${data.cadenceDay} enviada` : data.manual ? manualTitle : "Mensagem enviada",
		tag: data.tag ?? (data.cadenceDay ? `cadence-day-${data.cadenceDay}` : data.manual ? "humano-manual" : "crm-manual"),
		sentBy: context.userId,
		sentByName: sender,
		sendMode: data.cadenceDay ? "cadencia" : "manual"
	});
	if (result.ok && data.cadenceDay) {
		const now = (/* @__PURE__ */ new Date()).toISOString();
		await context.supabase.from("contacts").update({
			cadence_day: data.cadenceDay,
			last_contact_at: now,
			cadence_active: data.cadenceDay < 5
		}).eq("id", data.contactId);
	}
	return result.ok ? {
		ok: true,
		messageId: result.messageId
	} : {
		ok: false,
		error: result.error ?? "Falha no envio."
	};
});
var testMetaConfigFn_createServerFn_handler = createServerRpc({
	id: "4fbe7dd79b0ab71949f3f2cd951b6eebb09622ba4a5926df719587108819669a",
	name: "testMetaConfigFn",
	filename: "src/lib/whatsapp.functions.ts"
}, (opts) => testMetaConfigFn.__executeServer(opts));
var testMetaConfigFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(testMetaConfigFn_createServerFn_handler, async ({ context }) => {
	const { loadMetaConfig } = await import("./whatsapp.server-Bx4h-P3h.mjs").then((n) => n.i).then((n) => n.i);
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const cfg = await loadMetaConfig(await currentWorkspaceId(context.supabase));
	return {
		configured: Boolean(cfg.phoneNumberId && cfg.accessToken),
		hasPhoneNumberId: Boolean(cfg.phoneNumberId),
		hasAccessToken: Boolean(cfg.accessToken),
		hasVerifyToken: Boolean(cfg.verifyToken),
		hasAppSecret: Boolean(cfg.appSecret),
		graphVersion: cfg.graphVersion
	};
});
//#endregion
export { sendWhatsappMessageFn_createServerFn_handler, testMetaConfigFn_createServerFn_handler };
