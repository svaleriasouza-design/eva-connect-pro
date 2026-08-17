import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { n as useServerFn, t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-workspace-n7F-1Rfj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var saveSchema = objectType({
	name: stringType().trim().min(2).max(80),
	tagline: stringType().trim().max(120).optional().nullable(),
	owner_name: stringType().trim().max(80).optional().nullable()
});
var getWorkspaceFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2853047e2e8bff0a6624aa1804d77d73163a963eb22f56f5fd76cc60b1567dd3"));
var saveWorkspaceFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => saveSchema.parse(data)).handler(createSsrRpc("d9c48897b8e92b0b0bede6b6c6687a221e78c08262f501790291ef096c0fdae3"));
var FALLBACK = {
	name: "EVA IA",
	tagline: "Assistente Executiva",
	owner_name: ""
};
function useWorkspace() {
	const fn = useServerFn(getWorkspaceFn);
	const q = useQuery({
		queryKey: ["workspace"],
		queryFn: () => fn(),
		staleTime: 3e5
	});
	const workspace = q.data ?? FALLBACK;
	(0, import_react.useEffect)(() => {
		if (typeof document !== "undefined" && q.data?.name) document.title = `${q.data.name} — ${q.data.tagline || "Assistente Executiva"}`;
	}, [q.data?.name, q.data?.tagline]);
	return {
		workspace,
		loading: q.isLoading
	};
}
//#endregion
export { useWorkspace as n, saveWorkspaceFn as t };
