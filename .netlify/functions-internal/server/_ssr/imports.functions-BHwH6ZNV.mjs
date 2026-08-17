import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime, a as Overlay2, c as Title2, i as Description2, l as Trigger2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { o as cn } from "./card-CtX3ithx.mjs";
import { n as buttonVariants } from "./button-BkEeRci-.mjs";
import { a as objectType, o as stringType, t as arrayType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/imports.functions-BHwH6ZNV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var AlertDialog = Root2;
var AlertDialogTrigger = Trigger2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
var batchSchema = objectType({ batchId: stringType().uuid() });
var idsSchema = objectType({ ids: arrayType(stringType().uuid()).min(1).max(1e4) });
var filterSchema = objectType({
	q: stringType().max(200).optional(),
	stage: stringType().max(50).optional(),
	batch: stringType().max(60).optional()
});
/** Lista lotes de importação, incluindo os que estão na lixeira. */
var listImportBatchesFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2753c3e8902abd350e4d0bc2b5e0eb891e9f68dec5e3958b41f380e371e554a5"));
/** Desfaz uma importação: exclui permanentemente contatos, empresas e histórico relacionado. */
var undoImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(createSsrRpc("9d75ed2e702ee63b83c8626a1881d1cac03ea70e5d62e1dc63082b0c2a942abf"));
/** Restaura uma importação que estava na lixeira. */
var restoreImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(createSsrRpc("de327c9a0e219f70e2f19673018f203dfba6b571bbd8106359520c32288ae0b8"));
/** Exclusão definitiva de uma importação (contatos, empresas e histórico). */
var purgeImportFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => batchSchema.parse(d)).handler(createSsrRpc("13435c0493a640c4b17b7d995082d900232ebdce49b8541ecc95c98dc3625301"));
/**
* Exclui permanentemente os contatos selecionados no CRM.
* Usa a RPC delete_contacts (SECURITY DEFINER) que:
*   - valida auth.uid() e role admin internamente
*   - verifica que todos os contatos pertencem ao workspace do chamador
*   - deleta atomicamente — CASCADE remove activities/eva_scheduling_state/saturday_requests
*   - SET NULL preserva events e tasks (contact_id fica NULL)
*   - não toca em empresas
*   - recalcula agregados das empresas afetadas
*/
var deleteContactsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => idsSchema.parse(d)).handler(createSsrRpc("45efc16d02127ed3969e3e771281bc6e96c6b707850b7d09cbb9ac8fe9e7bd9d"));
/**
* Exclui permanentemente TODOS os contatos que correspondem ao filtro atual do CRM.
* Usa a RPC delete_contacts_by_filter (SECURITY DEFINER) que processa todo o filtro
* no banco de forma atômica — não apenas os contatos visíveis na página.
*/
var deleteContactsByFilterFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => filterSchema.parse(d)).handler(createSsrRpc("14ea9b996723a678ffedcc174e4d4f378666d6bcf276372f085b6dbd50a53170"));
/** Exclui permanentemente as empresas selecionadas. Contatos vinculados ficam sem empresa. */
var deleteCompaniesFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((d) => idsSchema.parse(d)).handler(createSsrRpc("04cf9ced396979b43d54c23b1b9cf00bb4fb908ef6a8dc0e41a7aa53cec6cb18"));
//#endregion
export { AlertDialogDescription as a, AlertDialogTitle as c, deleteContactsByFilterFn as d, deleteContactsFn as f, undoImportFn as g, restoreImportFn as h, AlertDialogContent as i, AlertDialogTrigger as l, purgeImportFn as m, AlertDialogAction as n, AlertDialogFooter as o, listImportBatchesFn as p, AlertDialogCancel as r, AlertDialogHeader as s, AlertDialog as t, deleteCompaniesFn as u };
