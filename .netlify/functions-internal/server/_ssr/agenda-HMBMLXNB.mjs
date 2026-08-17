import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { E as Plus, I as LoaderCircle, Y as Clock, it as Calendar, n as Video, u as Trash2 } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-Bk9pEsHD.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { a as suggestSlotsFn, i as scheduleMeetingFn, r as rescheduleMeetingFn, t as cancelMeetingFn } from "./calendar.functions-6CDk9ktk.mjs";
import { i as TabsTrigger, r as TabsList, t as Tabs } from "./tabs-CCJRliUM.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/agenda-HMBMLXNB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var STATUS_LABEL = {
	agendado: "Agendada",
	concluido: "Concluída",
	cancelado: "Cancelada",
	remarcado: "Remarcada"
};
function Agenda() {
	const qc = useQueryClient();
	const [view, setView] = (0, import_react.useState)("hoje");
	const [detail, setDetail] = (0, import_react.useState)(null);
	const scheduleFn = useServerFn(scheduleMeetingFn);
	const rescheduleFn = useServerFn(rescheduleMeetingFn);
	const cancelFn = useServerFn(cancelMeetingFn);
	const slotsFn = useServerFn(suggestSlotsFn);
	const { data: events = [], isLoading } = useQuery({
		queryKey: ["events"],
		queryFn: async () => (await supabase.from("events").select("*, contact:contacts(id, name, email, whatsapp, phone, funnel_stage, company_id), company:companies(name)").order("starts_at")).data ?? []
	});
	const { data: contacts = [] } = useQuery({
		queryKey: ["contacts-min"],
		queryFn: async () => (await supabase.from("contacts").select("id, name, email").order("name").limit(500)).data ?? []
	});
	const now = /* @__PURE__ */ new Date();
	const filtered = (0, import_react.useMemo)(() => events.filter((e) => {
		const d = new Date(e.starts_at);
		if (view === "canceladas") return e.status === "cancelado";
		if (view === "concluidas") return e.status === "concluido" || e.status === "agendado" && d < now;
		if (view === "hoje") return e.status !== "cancelado" && d.toDateString() === now.toDateString();
		return e.status === "agendado" && d >= now;
	}), [events, view]);
	const [open, setOpen] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({
		kind: "reuniao",
		starts_at: "",
		duration: 30,
		online: true
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [slots, setSlots] = (0, import_react.useState)([]);
	const upd = (k) => (e) => setForm({
		...form,
		[k]: e?.target?.value ?? e
	});
	async function loadSlots() {
		const res = await slotsFn({ data: { duration: Number(form.duration) || 30 } });
		if (res.ok) setSlots(res.slots);
		else toast.error(res.error);
	}
	async function save() {
		if (!form.starts_at) return toast.error("Escolha data e hora");
		setSaving(true);
		try {
			if (form.contact_id) {
				const res = await scheduleFn({ data: {
					contactId: form.contact_id,
					startIso: new Date(form.starts_at).toISOString(),
					duration: Number(form.duration) || 30,
					online: form.online !== false,
					title: form.title || void 0
				} });
				if (!res.ok) return toast.error(res.error);
				toast.success("Reunião criada no Google Calendar e sincronizada");
			} else {
				if (!form.title) return toast.error("Informe um título");
				const { error } = await supabase.from("events").insert({
					title: form.title,
					kind: form.kind,
					starts_at: new Date(form.starts_at).toISOString(),
					location: form.location ?? null,
					notes: form.notes ?? null,
					duration_minutes: Number(form.duration) || 30
				});
				if (error) return toast.error(error.message);
				toast.success("Evento criado na Agenda");
			}
			setOpen(false);
			setForm({
				kind: "reuniao",
				duration: 30,
				online: true
			});
			qc.invalidateQueries({ queryKey: ["events"] });
		} finally {
			setSaving(false);
		}
	}
	async function doCancel(ev) {
		if (!ev.contact_id) await supabase.from("events").update({ status: "cancelado" }).eq("id", ev.id);
		else {
			const res = await cancelFn({ data: { contactId: ev.contact_id } });
			if (!res.ok) return toast.error(res.error ?? "Falha ao cancelar");
		}
		toast.success("Reunião cancelada");
		setDetail(null);
		qc.invalidateQueries({ queryKey: ["events"] });
	}
	async function doReschedule(ev, startLocal) {
		if (!ev.contact_id) return toast.error("Evento sem contato vinculado");
		const res = await rescheduleFn({ data: {
			contactId: ev.contact_id,
			startIso: new Date(startLocal).toISOString()
		} });
		if (!res.ok) return toast.error(res.error ?? "Falha ao remarcar");
		toast.success("Reunião remarcada e sincronizada");
		setDetail(null);
		qc.invalidateQueries({ queryKey: ["events"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "Agenda"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [filtered.length, " reunião(ões) · sincronizada com o Google Calendar"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tabs, {
						value: view,
						onValueChange: (v) => setView(v),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "hoje",
								children: "Hoje"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "futuras",
								children: "Futuras"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "concluidas",
								children: "Concluídas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
								value: "canceladas",
								children: "Canceladas"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
						open,
						onOpenChange: setOpen,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Nova reunião"] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
							className: "max-w-lg",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Nova reunião" }) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid gap-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
											label: "Cliente (cria no Google Calendar e no CRM)",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
												value: form.contact_id ?? "",
												onValueChange: (v) => setForm({
													...form,
													contact_id: v || null
												}),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "— evento interno —" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: contacts.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
													value: c.id,
													children: c.name
												}, c.id)) })]
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
											label: "Título",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
												value: form.title ?? "",
												onChange: upd("title"),
												placeholder: "Reunião / Sessão - Cliente"
											})
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-2 gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
												label: "Data e hora *",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "datetime-local",
													value: form.starts_at ?? "",
													onChange: upd("starts_at")
												})
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
												label: "Duração (min)",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
													type: "number",
													value: form.duration,
													onChange: upd("duration")
												})
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between rounded-md border p-2 text-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Online (gera Google Meet)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
												type: "button",
												size: "sm",
												variant: form.online !== false ? "default" : "outline",
												onClick: () => setForm({
													...form,
													online: form.online === false
												}),
												children: form.online !== false ? "Sim" : "Não"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												type: "button",
												size: "sm",
												variant: "outline",
												onClick: loadSlots,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "mr-2 h-3 w-3" }), " Ver horários livres"]
											}), slots.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "flex flex-wrap gap-1",
												children: slots.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => setForm({
														...form,
														starts_at: toLocalInput(s)
													}),
													className: "rounded-full border px-2 py-0.5 text-xs hover:border-primary hover:text-primary",
													children: formatDateTime(s)
												}, s))
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(F, {
											label: "Observações",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
												rows: 2,
												value: form.notes ?? "",
												onChange: upd("notes")
											})
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "outline",
									onClick: () => setOpen(false),
									children: "Cancelar"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: save,
									disabled: saving,
									children: [saving && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Salvar"]
								})] })
							]
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
						className: "p-8 text-center text-muted-foreground",
						children: "Carregando…"
					}),
					!isLoading && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-8 text-center text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "mx-auto mb-2 h-8 w-8" }), " Sem reuniões neste filtro."]
					}),
					filtered.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "flex items-center justify-between gap-3 p-4 cursor-pointer hover:border-primary",
						onClick: () => setDetail(e),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2 font-medium",
								children: [
									e.title,
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										className: "text-[10px]",
										children: STATUS_LABEL[e.status] ?? e.status
									}),
									e.source === "eva" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										className: "text-[10px]",
										children: "EVA"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									formatDateTime(e.starts_at),
									" · ",
									e.duration_minutes ?? 30,
									" min",
									e.contact?.name && ` · ${e.contact.name}`,
									e.company?.name && ` · ${e.company.name}`
								]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1",
							children: [e.meet_link && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
								href: e.meet_link,
								target: "_blank",
								rel: "noreferrer",
								onClick: (ev) => ev.stopPropagation(),
								className: "text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "h-4 w-4" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "ghost",
								size: "icon",
								onClick: (ev) => {
									ev.stopPropagation();
									doCancel(e);
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
							})]
						})]
					}, e.id))
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MeetingDetail, {
				event: detail,
				onClose: () => setDetail(null),
				onCancel: doCancel,
				onReschedule: doReschedule
			})
		]
	});
}
function MeetingDetail({ event, onClose, onCancel, onReschedule }) {
	const [newDate, setNewDate] = (0, import_react.useState)("");
	const { data: history = [] } = useQuery({
		queryKey: ["event-history", event?.contact_id],
		enabled: Boolean(event?.contact_id),
		queryFn: async () => (await supabase.from("activities").select("id, kind, title, content, created_at").eq("contact_id", event.contact_id).order("created_at", { ascending: false }).limit(30)).data ?? []
	});
	if (!event) return null;
	const c = event.contact ?? {};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: Boolean(event),
		onOpenChange: (v) => !v && onClose(),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl max-h-[85vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: event.title }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-1 sm:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Quando",
								value: `${formatDateTime(event.starts_at)} · ${event.duration_minutes ?? 30} min`
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Status",
								value: STATUS_LABEL[event.status] ?? event.status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Nome",
								value: c.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Empresa",
								value: event.company?.name ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Telefone",
								value: c.whatsapp ?? c.phone ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "E-mail",
								value: c.email ?? event.attendee_email ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Etapa do funil",
								value: c.funnel_stage ?? "—"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Local",
								value: event.location ?? "—"
							})
						]
					}),
					event.meet_link && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
						href: event.meet_link,
						target: "_blank",
						rel: "noreferrer",
						className: "inline-flex items-center gap-2 text-primary hover:underline",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Video, { className: "h-4 w-4" }), " Abrir Google Meet"]
					}),
					event.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-md border p-2 text-muted-foreground whitespace-pre-wrap",
						children: event.notes
					}),
					c.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/crm/$id",
						params: { id: c.id },
						className: "text-xs text-primary hover:underline",
						children: "Abrir ficha no CRM →"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-2 text-xs font-medium uppercase text-muted-foreground",
							children: "Remarcar"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "datetime-local",
									value: newDate,
									onChange: (e) => setNewDate(e.target.value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									disabled: !newDate,
									onClick: () => onReschedule(event, newDate),
									children: "Remarcar"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "outline",
									onClick: () => onCancel(event),
									children: "Cancelar reunião"
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-2 text-xs font-medium uppercase text-muted-foreground",
						children: "Histórico completo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [history.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-muted-foreground",
							children: "Sem registros."
						}), history.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded border p-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between text-[11px] text-muted-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: a.kind }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatDateTime(a.created_at) })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs font-medium",
									children: a.title
								}),
								a.content && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground whitespace-pre-wrap",
									children: a.content
								})
							]
						}, a.id))]
					})] })
				]
			})]
		})
	});
}
function Info$1({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "text-xs text-muted-foreground",
		children: [label, ": "]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: value })] });
}
function toLocalInput(iso) {
	const d = new Date(iso);
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function F({ label, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs",
			children: label
		}), children]
	});
}
//#endregion
export { Agenda as component };
