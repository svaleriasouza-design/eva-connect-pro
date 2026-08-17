import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eva.functions-CEGVFw1L.js
var EvaInput = objectType({
	messages: arrayType(objectType({
		role: enumType([
			"user",
			"assistant",
			"system"
		]),
		content: stringType()
	})),
	context: stringType().optional()
});
var askEva = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => EvaInput.parse(raw)).handler(createSsrRpc("0fd248d3eb34769dd299fc88a91d2af388020dc1390e8b4c400374b1bc2d82d4"));
//#endregion
export { askEva as t };
