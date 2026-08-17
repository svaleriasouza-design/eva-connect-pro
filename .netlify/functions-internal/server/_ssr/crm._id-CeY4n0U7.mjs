import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime, t as FUNNEL_STAGES } from "./db-DhO7Bl8s.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { C as Save, I as LoaderCircle, b as Send, h as Sparkles, it as Calendar, m as SquareCheckBig, u as Trash2, ut as ArrowLeft } from "../_libs/lucide-react.mjs";
import { t as sendWhatsappMessageFn } from "./whatsapp.functions-DiM6LUQl.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { c as WhatsAppQuickSend } from "./import-batches-card-BMBArryj.mjs";
import { n as Route$2 } from "./router-n_2ZGQ-O.mjs";
import { t as askEva } from "./eva.functions-CEGVFw1L.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/crm._id-CeY4n0U7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Ficha() {
	const { id } = Route$2.useParams();
	const nav = useNavigate();
	const qc = useQueryClient();
	const [nextAction, setNextAction] = (0, import_react.useState)(null);
	const [nextLoading, setNextLoading] = (0, import_react.useState)(false);
	const askServer = useServerFn(askEva);
	const sendWa = useServerFn(sendWhatsappMessageFn);
	const [quickMsg, setQuickMsg] = (0, import_react.useState)("");
	const [quickSending, setQuickSending] = (0, import_react.useState)(false);
	const { data: contact } = useQuery({
		queryKey: ["contact", id],
		queryFn: async () => (await supabase.from("contacts").select("*").eq("id", id).maybeSingle()).data
	});
	const { data: activities = [] } = useQuery({
		queryKey: ["activities", id],
		queryFn: async () => (await supabase.from("activities").select("*").eq("contact_id", id).order("created_at", { ascending: false })).data ?? []
	});
	(0, import_react.useEffect)(() => {
		if (!id) return;
		const channel = supabase.channel(`crm-${id}`).on("postgres_changes", {
			event: "*",
			schema: "public",
			table: "activities",
			filter: `contact_id=eq.${id}`
		}, () => {
			qc.invalidateQueries({ queryKey: ["activities", id] });
		}).on("postgres_changes", {
			event: "UPDATE",
			schema: "public",
			table: "contacts",
			filter: `id=eq.${id}`
		}, () => {
			qc.invalidateQueries({ queryKey: ["contact", id] });
		}).subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [id, qc]);
	const [form, setForm] = (0, import_react.useState)(null);
	const state = form ?? contact ?? {};
	const upd = (k) => (e) => setForm({
		...state,
		[k]: e?.target?.value ?? e
	});
	async function save() {
		if (!form) return;
		const { id: _id, created_at, updated_at, ...patch } = form;
		const { error } = await supabase.from("contacts").update(patch).eq("id", id);
		if (error) return toast.error(error.message);
		toast.success("Salvo");
		qc.invalidateQueries({ queryKey: ["contact", id] });
		setForm(null);
	}
	async function remove() {
		if (!confirm("Excluir este contato?")) return;
		await supabase.from("contacts").delete().eq("id", id);
		toast.success("Contato excluído");
		nav({ to: "/crm" });
	}
	async function logActivity(kind, title, content) {
		await supabase.from("activities").insert({
			contact_id: id,
			kind,
			title,
			content: content ?? null
		});
		await supabase.from("contacts").update({ last_contact_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
		qc.invalidateQueries({ queryKey: ["activities", id] });
		qc.invalidateQueries({ queryKey: ["contact", id] });
	}
	async function nextBestAction() {
		if (!contact) return;
		setNextLoading(true);
		setNextAction(null);
		const ctx = `Cliente: ${contact.name}. Empresa: ${contact.company_name ?? "—"}. Etapa: ${contact.funnel_stage}. Último contato: ${formatDateTime(contact.last_contact_at)}. Dor: ${contact.main_pain ?? "—"}. Objetivo: ${contact.goal ?? "—"}. Histórico (últimas atividades): ${activities.slice(0, 5).map((a) => `${a.kind}:${a.title}`).join(" | ") || "nenhum"}.`;
		try {
			const res = await askServer({ data: {
				messages: [{
					role: "user",
					content: "Qual é a próxima melhor ação para este cliente? Responda em uma frase curta e direta, propondo apenas UMA ação (ex.: 'Enviar a mensagem do Dia 3.', 'Ligar para este contato.', 'Agendar reunião.', 'Enviar proposta.', 'Reativar lead.', 'Mover para Perdido.'). Justifique em 1 linha."
				}],
				context: ctx
			} });
			setNextAction(res.text);
		} catch {
			toast.error("EVA falhou");
		} finally {
			setNextLoading(false);
		}
	}
	async function sendQuick() {
		if (!contact || !quickMsg.trim()) return;
		const to = contact.whatsapp ?? contact.phone;
		if (!to) {
			toast.error("Sem WhatsApp/telefone cadastrado.");
			return;
		}
		setQuickSending(true);
		try {
			const res = await sendWa({ data: {
				contactId: id,
				to,
				body: quickMsg.trim()
			} });
			if (res.ok) {
				toast.success("Mensagem enviada");
				setQuickMsg("");
				qc.invalidateQueries({ queryKey: ["activities", id] });
				qc.invalidateQueries({ queryKey: ["contact", id] });
			} else toast.error(res.error ?? "Falha no envio");
		} finally {
			setQuickSending(false);
		}
	}
	if (!contact) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6 text-muted-foreground",
		children: "Carregando…"
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => nav({ to: "/crm" }),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "mr-1 h-4 w-4" }), " Voltar"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
					form && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: save,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-2 h-4 w-4" }), " Salvar"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "destructive",
						size: "sm",
						onClick: remove,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mr-1 h-4 w-4" }), " Excluir"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-start justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: contact.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm text-muted-foreground",
					children: [
						contact.company_name ?? "Sem empresa",
						" · ",
						contact.city ?? "—"
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WhatsAppQuickSend, {
							contactId: contact.id,
							to: contact.whatsapp ?? contact.phone,
							contactName: contact.name,
							label: "WhatsApp"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/agenda",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "mr-1 h-4 w-4" }), " Agendar"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/tarefas",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								variant: "outline",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareCheckBig, { className: "mr-1 h-4 w-4" }), " Tarefa"]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							size: "sm",
							onClick: nextBestAction,
							disabled: nextLoading,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-1 h-4 w-4 text-[color:var(--gold)]" }),
								" ",
								nextLoading ? "Analisando…" : "Próxima Melhor Ação"
							]
						})
					]
				})]
			}),
			nextAction && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-[color:var(--gold)]/40 bg-accent/10",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "p-4 text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 text-[color:var(--gold)]" }), " Sugestão da EVA"]
					}), nextAction]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:col-span-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Dados cadastrais" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "grid gap-3 md:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Nome",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.name ?? "",
									onChange: upd("name")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Empresa",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.company_name ?? "",
									onChange: upd("company_name")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "WhatsApp",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.whatsapp ?? "",
									onChange: upd("whatsapp")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Telefone",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.phone ?? "",
									onChange: upd("phone")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "E-mail",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.email ?? "",
									onChange: upd("email")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Instagram",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.instagram ?? "",
									onChange: upd("instagram")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Cidade",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.city ?? "",
									onChange: upd("city")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Nascimento",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "date",
									value: state.birthdate ?? "",
									onChange: upd("birthdate")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Profissão",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.profession ?? "",
									onChange: upd("profession")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Filhos",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.children ?? "",
									onChange: upd("children")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Serviço de interesse",
								className: "md:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.service_interest ?? "",
									onChange: upd("service_interest")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Etapa do funil",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: state.funnel_stage,
									onValueChange: (v) => setForm({
										...state,
										funnel_stage: v
									}),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: FUNNEL_STAGES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: s.key,
										children: s.label
									}, s.key)) })]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Próxima ação",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									value: state.next_action ?? "",
									onChange: upd("next_action")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Objetivo",
								className: "md:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 2,
									value: state.goal ?? "",
									onChange: upd("goal")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Dor principal",
								className: "md:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 2,
									value: state.main_pain ?? "",
									onChange: upd("main_pain")
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
								label: "Observações",
								className: "md:col-span-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
									rows: 3,
									value: state.notes ?? "",
									onChange: upd("notes")
								})
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Resumo" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-2 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Etapa:"
									}),
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										children: FUNNEL_STAGES.find((s) => s.key === contact.funnel_stage)?.label
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Cadência:"
									}),
									" ",
									contact.cadence_active ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, { children: [
										"Dia ",
										contact.cadence_day ?? 0,
										"/5"
									] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "outline",
										children: "Fora da cadência"
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Último contato:"
									}),
									" ",
									formatDateTime(contact.last_contact_at)
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Origem:"
									}),
									" ",
									contact.origin ?? "—"
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Não contatar:"
									}),
									" ",
									contact.do_not_contact ? "Sim" : "Não"
								] })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
							className: "text-base",
							children: "Enviar WhatsApp"
						}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 3,
								value: quickMsg,
								onChange: (e) => setQuickMsg(e.target.value),
								placeholder: "Mensagem rápida via Meta Cloud API…"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								size: "sm",
								className: "w-full",
								onClick: sendQuick,
								disabled: quickSending || !quickMsg.trim(),
								children: [quickSending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "mr-2 h-4 w-4" }), "Enviar"]
							})]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Linha do tempo" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
							className: "space-y-2 max-h-[400px] overflow-y-auto",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NoteAdder, { onAdd: (t) => logActivity("nota", "Nota", t) }),
								activities.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Sem atividades ainda."
								}),
								activities.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-md border-l-2 border-primary/40 bg-muted/40 p-2 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", {
												className: "truncate",
												children: a.title
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground shrink-0",
												children: formatDateTime(a.created_at)
											})]
										}),
										a.status && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-0.5 text-[10px] uppercase text-muted-foreground",
											children: a.status
										}),
										a.content && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "text-muted-foreground mt-1",
											children: a.content
										})
									]
								}, a.id))
							]
						})] })
					]
				})]
			})
		]
	});
}
function NoteAdder({ onAdd }) {
	const [t, setT] = (0, import_react.useState)("");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
			placeholder: "Registrar observação…",
			value: t,
			onChange: (e) => setT(e.target.value)
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
			size: "sm",
			onClick: () => {
				if (t.trim()) {
					onAdd(t.trim());
					setT("");
				}
			},
			children: "+"
		})]
	});
}
function F({ label, children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs",
			children: label
		}), children]
	});
}
//#endregion
export { Ficha as component };
