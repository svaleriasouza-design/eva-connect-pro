import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { n as useServerFn, t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType, r as enumType } from "../_libs/zod.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-access-DH-CD7hW.js
var roleSchema = objectType({
	userId: stringType().uuid(),
	role: enumType([
		"admin",
		"operador",
		"leitor"
	])
});
var getMyAccessFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("4c36180d9bfef945b32f7bf6df42047be396255042e52aeda75bd5a708896ece"));
var listUsersFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("ba34ab571250545f9427c43baa7ae6e6c0a2d561044afeb362322f4d136bd8fc"));
var setUserRoleFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => roleSchema.parse(data)).handler(createSsrRpc("3de7bb02871b09ce8ce41e72bac79cb403ac89ad56d7d05ab28fb8febdc99bbb"));
var inviteSchema = objectType({
	email: stringType().email(),
	role: enumType([
		"admin",
		"operador",
		"leitor"
	])
});
/** Adiciona um usuário já cadastrado ao workspace do admin, com o papel escolhido. */
var addUserToWorkspaceFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => inviteSchema.parse(data)).handler(createSsrRpc("b91922560501c7cbac2bb8376b3a1490ee305837e3e6c53d0186c2541c069c96"));
function useAccess() {
	const fn = useServerFn(getMyAccessFn);
	const q = useQuery({
		queryKey: ["my-access"],
		queryFn: () => fn(),
		staleTime: 6e4
	});
	return {
		access: q.data ?? null,
		loading: q.isLoading,
		isAdmin: q.data?.isAdmin ?? false,
		canSend: q.data?.canSend ?? false
	};
}
//#endregion
export { useAccess as i, listUsersFn as n, setUserRoleFn as r, addUserToWorkspaceFn as t };
