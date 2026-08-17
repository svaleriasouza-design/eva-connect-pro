import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { B as Hand, V as Funnel, x as Search } from "../_libs/lucide-react.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/historico-CirpEn8r.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KIND_LABEL = {
	whatsapp_out: "WhatsApp enviado",
	whatsapp_in: "WhatsApp recebido",
	cadence_stop: "Saiu da cadência",
	bot_detected: "Robô detectado",
	nota: "Nota",
	reuniao: "Reunião",
	ligacao: "Ligação",
	email: "E-mail",
	proposta: "Proposta"
};
function Historico() {
	const qc = useQueryClient();
	const [contactId, setContactId] = (0, import_react.useState)("all");
	const [kind, setKind] = (0, import_react.useState)("all");
	const [q, setQ] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("hist-live").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "activities"
		}, () => {
			qc.invalidateQueries({ queryKey: ["all-activities"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const { data: contacts = [] } = useQuery({
		queryKey: ["hist-contacts"],
		queryFn: async () => (await supabase.from("contacts").select("id, name").order("name")).data ?? []
	});
	const { data: acts = [] } = useQuery({
		queryKey: [
			"all-activities",
			contactId,
			kind
		],
		queryFn: async () => {
			let query = supabase.from("activities").select("*, contact:contacts(id, name)").order("created_at", { ascending: false }).limit(500);
			if (contactId !== "all") query = query.eq("contact_id", contactId);
			if (kind !== "all") query = query.eq("kind", kind);
			const { data } = await query;
			return data ?? [];
		},
		refetchInterval: 15e3
	});
	const filtered = (0, import_react.useMemo)(() => {
		const s = q.trim().toLowerCase();
		if (!s) return acts;
		return acts.filter((a) => (a.title ?? "").toLowerCase().includes(s) || (a.content ?? "").toLowerCase().includes(s) || (a.contact?.name ?? "").toLowerCase().includes(s));
	}, [acts, q]);
	const kinds = Array.from(new Set(acts.map((a) => a.kind).filter(Boolean)));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4 max-w-5xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold",
				children: "Histórico"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Todas as interações em ordem cronológica."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-2 md:grid-cols-[1fr_240px_200px]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => setQ(e.target.value),
							placeholder: "Buscar por título, conteúdo ou cliente…",
							className: "pl-8"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: contactId,
						onValueChange: setContactId,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Funnel, { className: "mr-2 h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Cliente" })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "Todos os clientes"
						}), contacts.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: c.id,
							children: c.name
						}, c.id))] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: kind,
						onValueChange: setKind,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Tipo" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "Todos os tipos"
						}), kinds.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: k,
							children: KIND_LABEL[k] ?? k
						}, k))] })]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-xs text-muted-foreground",
				children: [filtered.length, " registro(s)"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "p-8 text-center text-muted-foreground",
					children: "Nenhum registro para os filtros escolhidos."
				}), filtered.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex justify-between text-xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-[10px]",
									children: KIND_LABEL[a.kind] ?? a.kind
								}), a.status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] uppercase",
									children: a.status
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDateTime(a.created_at) })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium mt-1",
							children: a.title
						}),
						a.send_mode === "manual" && a.sent_by_name && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-0.5 flex items-center gap-1 text-[11px] font-medium text-[color:var(--gold)]",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "h-3 w-3" }),
								"Envio manual por ",
								a.sent_by_name,
								" · ",
								formatDateTime(a.created_at)
							]
						}),
						a.content && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm text-muted-foreground whitespace-pre-wrap",
							children: a.content
						}),
						a.contact && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/crm/$id",
							params: { id: a.contact.id },
							className: "mt-1 inline-block text-xs text-primary hover:underline",
							children: ["— ", a.contact.name]
						})
					]
				}, a.id))]
			})
		]
	});
}
//#endregion
export { Historico as component };
