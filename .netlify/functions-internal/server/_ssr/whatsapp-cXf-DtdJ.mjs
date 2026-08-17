import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime, n as MESSAGE_CATEGORIES, t as FUNNEL_STAGES } from "./db-DhO7Bl8s.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, o as cn, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { B as Hand, E as Plus, I as LoaderCircle, M as MessageCircle, R as Info, X as CircleX, Z as CircleDot, b as Send, ct as Bot, h as Sparkles, i as User, it as Calendar, j as MessagesSquare, lt as ArrowRight, nt as Check, rt as CheckCheck, u as Trash2, x as Search } from "../_libs/lucide-react.mjs";
import { t as sendWhatsappMessageFn } from "./whatsapp.functions-DiM6LUQl.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-CCJRliUM.mjs";
import { i as useAccess } from "./use-access-DH-CD7hW.mjs";
import { a as Viewport, i as ScrollAreaThumb, n as Root, r as ScrollAreaScrollbar, t as Corner } from "../_libs/radix-ui__react-scroll-area.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/whatsapp-cXf-DtdJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ScrollArea = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Root, {
	ref,
	className: cn("relative overflow-hidden", className),
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Viewport, {
			className: "h-full w-full rounded-[inherit]",
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollBar, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Corner, {})
	]
}));
ScrollArea.displayName = Root.displayName;
var ScrollBar = import_react.forwardRef(({ className, orientation = "vertical", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaScrollbar, {
	ref,
	orientation,
	className: cn("flex touch-none select-none transition-colors", orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]", orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollAreaThumb, { className: "relative flex-1 rounded-full bg-border" })
}));
ScrollBar.displayName = ScrollAreaScrollbar.displayName;
function StatusIcon({ status }) {
	const s = (status ?? "").toUpperCase();
	if (s === "READ") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, { className: "h-3 w-3 text-primary" });
	if (s === "DELIVERED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckCheck, { className: "h-3 w-3 text-muted-foreground" });
	if (s === "SENT") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-muted-foreground" });
	if (s === "FAILED") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		title: "Falha no envio — a Meta rejeitou esta mensagem (não chegou ao lead)",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-3 w-3 text-destructive" })
	});
	return null;
}
function WhatsappConversations() {
	const qc = useQueryClient();
	const [selectedId, setSelectedId] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [filter, setFilter] = (0, import_react.useState)("todas");
	const [draft, setDraft] = (0, import_react.useState)("");
	const [sending, setSending] = (0, import_react.useState)(false);
	const sendFn = useServerFn(sendWhatsappMessageFn);
	const threadRef = (0, import_react.useRef)(null);
	const { canSend } = useAccess();
	(0, import_react.useEffect)(() => {
		const channel = supabase.channel("wa-live").on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "activities"
		}, () => {
			qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
			qc.invalidateQueries({ queryKey: ["wa-thread"] });
			qc.invalidateQueries({ queryKey: ["all-activities"] });
		}).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "contacts"
		}, () => {
			qc.invalidateQueries({ queryKey: ["wa-contacts"] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [qc]);
	const { data: contacts = [] } = useQuery({
		queryKey: ["wa-contacts"],
		queryFn: async () => {
			const { data } = await supabase.from("contacts").select("id, name, company_name, whatsapp, phone, funnel_stage, cadence_day, cadence_active, do_not_contact, main_pain, goal, next_action, last_contact_at, is_bot, ai_paused, bot_reason").order("last_contact_at", {
				ascending: false,
				nullsFirst: false
			}).limit(300);
			return data ?? [];
		},
		refetchInterval: 15e3
	});
	const { data: recentActs = [] } = useQuery({
		queryKey: ["wa-recent-acts"],
		queryFn: async () => {
			const { data } = await supabase.from("activities").select("id, contact_id, kind, title, content, external_id, status, status_updated_at, error_message, created_at, sent_by_name, send_mode").in("kind", ["whatsapp_out", "whatsapp_in"]).order("created_at", { ascending: false }).limit(500);
			return data ?? [];
		},
		refetchInterval: 1e4
	});
	const meta = (0, import_react.useMemo)(() => {
		const m = /* @__PURE__ */ new Map();
		for (const a of recentActs) {
			if (!a.contact_id) continue;
			let cur = m.get(a.contact_id);
			if (!cur) {
				cur = {
					last: a,
					unread: a.kind === "whatsapp_in" && (a.status ?? "").toUpperCase() !== "UNSUPPORTED",
					inbound: 0,
					outbound: 0
				};
				m.set(a.contact_id, cur);
			}
			const unsupported = (a.status ?? "").toUpperCase() === "UNSUPPORTED";
			if (a.kind === "whatsapp_in" && !unsupported) cur.inbound += 1;
			if (a.kind === "whatsapp_out") cur.outbound += 1;
		}
		return m;
	}, [recentActs]);
	const filtered = (0, import_react.useMemo)(() => {
		const q = search.trim().toLowerCase();
		let list = contacts.filter((c) => meta.has(c.id) || c.cadence_active);
		list = list.filter((c) => {
			const m = meta.get(c.id);
			if (filter === "robos") return Boolean(c.is_bot);
			if (c.is_bot) return false;
			if (filter === "manual") return Boolean(c.ai_paused);
			if (filter === "aguardando") return Boolean(m?.unread);
			if (filter === "responderam") return (m?.inbound ?? 0) > 0 && (m?.outbound ?? 0) > 0;
			return true;
		});
		if (q) list = list.filter((c) => c.name.toLowerCase().includes(q) || (c.company_name ?? "").toLowerCase().includes(q) || (c.whatsapp ?? "").includes(q) || (c.phone ?? "").includes(q));
		return [...list].sort((a, b) => {
			const la = meta.get(a.id)?.last?.created_at ?? a.last_contact_at ?? "";
			return (meta.get(b.id)?.last?.created_at ?? b.last_contact_at ?? "").localeCompare(la);
		});
	}, [
		contacts,
		search,
		meta,
		filter
	]);
	(0, import_react.useEffect)(() => {
		if (!selectedId && filtered.length > 0) setSelectedId(filtered[0].id);
	}, [filtered, selectedId]);
	const selected = contacts.find((c) => c.id === selectedId) ?? null;
	const { data: thread = [] } = useQuery({
		queryKey: ["wa-thread", selectedId],
		enabled: !!selectedId,
		queryFn: async () => {
			const { data } = await supabase.from("activities").select("id, contact_id, kind, title, content, external_id, status, status_updated_at, error_message, created_at, sent_by_name, send_mode").eq("contact_id", selectedId).in("kind", [
				"whatsapp_out",
				"whatsapp_in",
				"cadence_stop",
				"bot_detected",
				"nota"
			]).order("created_at", { ascending: true }).limit(200);
			return data ?? [];
		},
		refetchInterval: 8e3
	});
	(0, import_react.useEffect)(() => {
		const el = threadRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [thread.length, selectedId]);
	async function toggleManual(c) {
		const next = !c.ai_paused;
		const { error } = await supabase.from("contacts").update({ ai_paused: next }).eq("id", c.id);
		if (error) return toast.error(error.message);
		toast.success(next ? "Você assumiu a conversa — EVA pausada" : "EVA voltou a responder este contato");
		qc.invalidateQueries({ queryKey: ["wa-contacts"] });
	}
	async function clearBot(c) {
		const { error } = await supabase.from("contacts").update({
			is_bot: false,
			bot_reason: null,
			do_not_contact: false,
			status: "ativo"
		}).eq("id", c.id);
		if (error) return toast.error(error.message);
		toast.success("Contato marcado como humano");
		qc.invalidateQueries({ queryKey: ["wa-contacts"] });
	}
	async function send() {
		if (!selected || !draft.trim()) return;
		if (!canSend) {
			toast.error("Seu acesso é somente leitura. Peça a um administrador o papel de Operador.");
			return;
		}
		const to = selected.whatsapp ?? selected.phone;
		if (!to) {
			toast.error("Contato sem WhatsApp/telefone.");
			return;
		}
		setSending(true);
		try {
			const res = await sendFn({ data: {
				contactId: selected.id,
				to,
				body: draft.trim(),
				manual: true
			} });
			if (res.ok) {
				if (!selected.ai_paused) {
					await supabase.from("contacts").update({ ai_paused: true }).eq("id", selected.id);
					qc.invalidateQueries({ queryKey: ["wa-contacts"] });
					toast.success("Mensagem enviada — você assumiu esta conversa");
				} else toast.success("Mensagem enviada");
				setDraft("");
				qc.invalidateQueries({ queryKey: ["wa-thread", selected.id] });
				qc.invalidateQueries({ queryKey: ["wa-recent-acts"] });
			} else toast.error(res.error ?? "Falha no envio");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Erro");
		} finally {
			setSending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-0 rounded-lg border overflow-hidden h-[calc(100dvh-13rem)] min-h-[420px] md:grid-cols-[280px_1fr_320px]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex min-h-0 min-w-0 flex-col border-r bg-card",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "border-b p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: search,
							onChange: (e) => setSearch(e.target.value),
							placeholder: "Buscar contato…",
							className: "pl-8"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 flex flex-wrap gap-1",
						children: [
							["todas", "Todas"],
							["aguardando", "Aguardando resposta"],
							["responderam", "Fluíram"],
							["manual", "Modo manual"],
							["robos", "Robôs"]
						].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setFilter(key),
							className: `rounded-full border px-2 py-0.5 text-[10px] transition-colors ${filter === key ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50"}`,
							children: label
						}, key))
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(ScrollArea, {
					className: "min-h-0 flex-1",
					children: [filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-6 text-center text-sm text-muted-foreground",
						children: "Nenhum contato."
					}), filtered.map((c) => {
						const m = meta.get(c.id);
						const last = m?.last;
						const preview = last?.content ?? last?.title ?? "Sem mensagens";
						const active = c.id === selectedId;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSelectedId(c.id),
							className: `w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-muted/50 ${active ? "bg-muted" : ""}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
										children: c.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate text-sm font-medium",
												children: c.name
											}), last && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-[10px] text-muted-foreground",
												children: formatShort(last.created_at)
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1 truncate text-xs text-muted-foreground",
											children: [last?.kind === "whatsapp_out" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIcon, { status: last?.status ?? null }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "truncate",
												children: preview
											})]
										})]
									}),
									c.is_bot ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-3 w-3 shrink-0 text-destructive" }) : c.ai_paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "h-3 w-3 shrink-0 text-[color:var(--gold)]" }) : m?.unread && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleDot, { className: "h-3 w-3 shrink-0 text-primary" })
								]
							})
						}, c.id);
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex min-h-0 min-w-0 flex-col bg-background",
				children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-1 items-center justify-center text-sm text-muted-foreground",
					children: "Selecione uma conversa"
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 border-b px-4 py-2.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4 text-primary" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-sm font-semibold",
									children: selected.name
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "truncate text-xs text-muted-foreground",
									children: selected.whatsapp ?? selected.phone ?? "—"
								})]
							}),
							selected.ai_paused ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "default",
								size: "sm",
								onClick: () => toggleManual(selected),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-1 h-3 w-3" }), "Retomar EVA"]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								onClick: () => toggleManual(selected),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-1 h-3 w-3" }), "EVA respondendo"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/crm/$id",
								params: { id: selected.id },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									variant: "ghost",
									size: "sm",
									children: ["Abrir ficha ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "ml-1 h-3 w-3" })]
								})
							})
						]
					}),
					selected.is_bot && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-b bg-destructive/10 px-4 py-2 text-xs text-destructive",
						children: [
							"Atendimento automático detectado",
							selected.bot_reason ? `: ${selected.bot_reason}` : "",
							". A EVA parou de responder este número.",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "ml-2 underline",
								onClick: () => clearBot(selected),
								children: "Marcar como humano"
							})
						]
					}),
					selected.ai_paused && !selected.is_bot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "border-b bg-[color:var(--gold)]/15 px-4 py-2 text-xs",
						children: "Você assumiu esta conversa. A EVA não responde automaticamente aqui até você devolver o controle."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: threadRef,
						className: "min-h-0 flex-1 overflow-y-auto overscroll-contain space-y-2 bg-muted/30 p-4",
						children: [thread.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "py-10 text-center text-sm text-muted-foreground",
							children: "Sem histórico ainda. Envie a primeira mensagem."
						}), thread.map((a) => {
							if (a.kind === "cadence_stop" || a.kind === "bot_detected" || a.kind === "nota") return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mx-auto max-w-md rounded-md bg-background/60 px-3 py-1 text-center text-[11px] text-muted-foreground",
								children: [
									a.title,
									" · ",
									formatDateTime(a.created_at)
								]
							}, a.id);
							const outgoing = a.kind === "whatsapp_out";
							const manual = a.send_mode === "manual" && !!a.sent_by_name;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `flex ${outgoing ? "justify-end" : "justify-start"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: `max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${outgoing ? "bg-primary text-primary-foreground" : "bg-card border"}`,
									children: [
										outgoing && manual && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mb-0.5 flex items-center gap-1 text-[10px] font-medium opacity-80",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hand, { className: "h-2.5 w-2.5" }),
												"Manual · ",
												a.sent_by_name
											]
										}),
										outgoing && !manual && a.title?.startsWith("Mensagem enviada por") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mb-0.5 text-[10px] font-medium opacity-80",
											children: a.title.replace("Mensagem enviada por ", "")
										}),
										outgoing && a.title?.startsWith("EVA respondeu") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mb-0.5 text-[10px] font-medium opacity-80",
											children: "EVA"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "whitespace-pre-wrap break-words",
											children: a.content ?? a.title
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: `mt-1 flex items-center gap-1 text-[10px] ${outgoing ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: manual ? formatDateTime(a.created_at) : formatShort(a.created_at) }), outgoing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusIcon, { status: a.status })]
										}),
										outgoing && (a.status ?? "").toUpperCase() === "FAILED" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] text-destructive",
											children: [
												"Não entregue — a Meta recusou o envio",
												a.error_message ? `: ${a.error_message}` : "",
												"."
											]
										})
									]
								})
							}, a.id);
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border-t bg-card p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 2,
								value: draft,
								onChange: (e) => setDraft(e.target.value),
								placeholder: canSend ? "Escreva sua mensagem…" : "Acesso somente leitura — envio bloqueado",
								disabled: !canSend,
								className: "resize-none",
								onKeyDown: (e) => {
									if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
										e.preventDefault();
										send();
									}
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								onClick: send,
								disabled: sending || !draft.trim() || !canSend,
								children: sending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-1 text-[10px] text-muted-foreground",
							children: "Envio real via Meta Cloud API · ⌘/Ctrl + Enter"
						})]
					})
				] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden min-w-0 flex-col border-l bg-card md:flex",
				children: !selected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-1 items-center justify-center p-4 text-center text-xs text-muted-foreground",
					children: "Selecione um contato para ver a ficha."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScrollArea, {
					className: "min-h-0 flex-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4 p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary",
									children: selected.name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase()
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate font-semibold",
										children: selected.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate text-xs text-muted-foreground",
										children: selected.company_name ?? "Sem empresa"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap gap-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "text-[10px]",
										children: FUNNEL_STAGES.find((s) => s.key === selected.funnel_stage)?.label ?? selected.funnel_stage
									}),
									selected.cadence_active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
										className: "text-[10px]",
										children: [
											"Cadência Dia ",
											selected.cadence_day ?? 0,
											"/5"
										]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "text-[10px]",
										children: "Fora da cadência"
									}),
									selected.do_not_contact && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "destructive",
										className: "text-[10px]",
										children: "Não contatar"
									}),
									selected.is_bot && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "destructive",
										className: "text-[10px]",
										children: "Robô/URA"
									}),
									selected.ai_paused && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										className: "text-[10px]",
										children: "Modo manual"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoBlock, {
								label: "Objetivo",
								value: selected.goal
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoBlock, {
								label: "Dor principal",
								value: selected.main_pain
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoBlock, {
								label: "Próxima ação",
								value: selected.next_action
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(InfoBlock, {
								label: "Último contato",
								value: selected.last_contact_at ? formatDateTime(selected.last_contact_at) : "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 pt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/crm/$id",
									params: { id: selected.id },
									className: "block",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										className: "w-full justify-start",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "mr-2 h-4 w-4" }), " Abrir ficha completa"]
									})
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/agenda",
									className: "block",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										className: "w-full justify-start",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "mr-2 h-4 w-4" }), " Agendar reunião"]
									})
								})]
							})
						]
					})
				})
			})
		]
	});
}
function InfoBlock({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "text-sm",
		children: value?.trim() ? value : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground",
			children: "—"
		})
	})] });
}
function formatShort(iso) {
	const d = new Date(iso);
	const today = /* @__PURE__ */ new Date();
	return d.toDateString() === today.toDateString() ? d.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit"
	}) : d.toLocaleDateString("pt-BR", {
		day: "2-digit",
		month: "2-digit"
	});
}
function WhatsApp() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
			className: "text-2xl font-semibold flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-5 w-5 text-primary" }), " WhatsApp"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted-foreground",
			children: "Cadência automática e biblioteca de mensagens."
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
			defaultValue: "conversas",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
						value: "conversas",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessagesSquare, { className: "mr-1 h-3.5 w-3.5" }), " Conversas"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "cadencia",
						children: "Cadência"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
						value: "biblioteca",
						children: "Biblioteca"
					})
				] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "conversas",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WhatsappConversations, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "cadencia",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cadencia, {})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
					value: "biblioteca",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Biblioteca, {})
				})
			]
		})]
	});
}
function Cadencia() {
	const [perDay, setPerDay] = (0, import_react.useState)(20);
	const [interval, setIntervalMin] = (0, import_react.useState)(5);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Configurações" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-xs",
					children: "Mensagens por dia"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					type: "number",
					value: perDay,
					onChange: (e) => setPerDay(+e.target.value)
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-xs",
					children: "Intervalo entre mensagens (min)"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: String(interval),
					onValueChange: (v) => setIntervalMin(+v),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [
						3,
						5,
						7,
						10
					].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
						value: String(n),
						children: [n, " minutos"]
					}, n)) })]
				})] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "w-full",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Iniciar cadência"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info, { className: "h-4 w-4 shrink-0 mt-0.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "O envio real de WhatsApp requer integração com Twilio, Meta Cloud API ou Z-API. Esta versão organiza a cadência e a biblioteca; o disparo é feito clicando em \"WhatsApp\" na ficha do cliente." })]
				})
			]
		})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Regras da EVA" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "text-sm space-y-2 text-muted-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "• Ao responder, a cadência é interrompida automaticamente." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "• O contato é movido para \"Respondido\" e a EVA sugere resposta." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "• Contatos marcados como \"Não contatar\" são ignorados." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "• A IA rotaciona variantes para reduzir repetição." }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "• Mensagens nunca são enviadas simultaneamente." })
			]
		})] })]
	});
}
function Biblioteca() {
	const qc = useQueryClient();
	const { data: templates = [] } = useQuery({
		queryKey: ["templates"],
		queryFn: async () => (await supabase.from("message_templates").select("*").order("created_at", { ascending: false })).data ?? []
	});
	const [category, setCategory] = (0, import_react.useState)(MESSAGE_CATEGORIES[0]);
	const [content, setContent] = (0, import_react.useState)("");
	async function add() {
		if (!content.trim()) return;
		await supabase.from("message_templates").insert({
			category,
			content
		});
		setContent("");
		toast.success("Modelo salvo");
		qc.invalidateQueries({ queryKey: ["templates"] });
	}
	async function remove(id) {
		await supabase.from("message_templates").delete().eq("id", id);
		qc.invalidateQueries({ queryKey: ["templates"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid gap-4 lg:grid-cols-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "lg:col-span-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Nova mensagem" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: category,
						onValueChange: setCategory,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: MESSAGE_CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: c,
							children: c
						}, c)) })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
						rows: 6,
						value: content,
						onChange: (e) => setContent(e.target.value),
						placeholder: "Texto da mensagem…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						className: "w-full",
						onClick: add,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Salvar variante"]
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "lg:col-span-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Biblioteca" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-2 max-h-[600px] overflow-y-auto",
				children: [MESSAGE_CATEGORIES.map((cat) => {
					const items = templates.filter((t) => t.category === cat);
					if (items.length === 0) return null;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs font-semibold uppercase text-muted-foreground mt-3 mb-1",
						children: cat
					}), items.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex justify-between items-start gap-2 rounded-md border p-2 mb-1 text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "whitespace-pre-wrap",
							children: t.content
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => remove(t.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
						})]
					}, t.id))] }, cat);
				}), templates.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm text-muted-foreground",
					children: "Nenhum modelo ainda."
				})]
			})]
		})]
	});
}
//#endregion
export { WhatsApp as component };
