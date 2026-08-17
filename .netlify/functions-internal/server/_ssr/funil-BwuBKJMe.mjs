import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { t as FUNNEL_STAGES } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/funil-BwuBKJMe.js
var import_jsx_runtime = require_jsx_runtime();
function Funil() {
	const qc = useQueryClient();
	const { data: stageData = {}, isLoading } = useQuery({
		queryKey: ["funil-por-etapa"],
		queryFn: async () => {
			const results = await Promise.all(FUNNEL_STAGES.map(async (s) => {
				const [{ data }, { count }] = await Promise.all([supabase.from("contacts").select("id, name, company_name, whatsapp, phone, last_contact_at, next_action, cadence_active, cadence_day").eq("funnel_stage", s.key).is("deleted_at", null).order("updated_at", { ascending: false }).limit(100), supabase.from("contacts").select("id", {
					count: "exact",
					head: true
				}).eq("funnel_stage", s.key).is("deleted_at", null)]);
				return [s.key, {
					items: data ?? [],
					total: count ?? 0
				}];
			}));
			return Object.fromEntries(results);
		},
		staleTime: 3e4
	});
	async function move(id, stage) {
		const { error } = await supabase.from("contacts").update({ funnel_stage: stage }).eq("id", id);
		if (error) toast.error(error.message);
		else {
			toast.success("Movido");
			qc.invalidateQueries({ queryKey: ["contacts"] });
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "text-2xl font-semibold",
			children: "Funil"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Arraste os cartões entre as etapas."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-3",
			children: FUNNEL_STAGES.map((stage) => {
				const entry = stageData[stage.key] ?? {
					items: [],
					total: 0
				};
				const items = entry.items;
				const total = entry.total;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					onDragOver: (e) => e.preventDefault(),
					onDrop: (e) => {
						const id = e.dataTransfer.getData("text/plain");
						if (id) move(id, stage.key);
					},
					className: "flex flex-col rounded-lg bg-muted/40 p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-2 flex items-center justify-between px-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs font-semibold uppercase text-muted-foreground",
							children: stage.label
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "secondary",
							children: total.toLocaleString("pt-BR")
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col gap-2",
						children: [
							isLoading && Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 w-full" }, i)),
							items.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
								draggable: true,
								onDragStart: (e) => e.dataTransfer.setData("text/plain", c.id),
								className: "cursor-grab p-3 hover:shadow-md active:cursor-grabbing",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/crm/$id",
									params: { id: c.id },
									className: "block",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium text-sm",
											children: c.name
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-xs text-muted-foreground",
											children: c.company_name ?? "—"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-2 space-y-0.5 text-[11px] text-muted-foreground",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["📞 ", c.whatsapp ?? c.phone ?? "—"] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Últ. contato: ", c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString("pt-BR") : "—"] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["Próx. ação: ", c.next_action ?? "—"] })
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-2",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
												variant: c.cadence_active ? "default" : "secondary",
												className: "text-[10px]",
												children: c.cadence_active ? `Cadência Dia ${c.cadence_day ?? 0}/5` : "Fora da cadência"
											})
										})
									]
								})
							}, c.id)),
							!isLoading && items.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground text-center py-4",
								children: "Vazio"
							}),
							total > items.length && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-[10px] text-muted-foreground text-center py-1",
								children: [
									"Exibindo ",
									items.length,
									" de ",
									total.toLocaleString("pt-BR"),
									" — use o CRM para ver todos."
								]
							})
						]
					})]
				}, stage.key);
			})
		})]
	});
}
//#endregion
export { Funil as component };
