import { i as __toESM } from "./_runtime.mjs";
import { u as require_react } from "./_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "./_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "./_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as createServerFn } from "./_ssr/server-tob7IPQL.mjs";
import { n as useServerFn, t as createSsrRpc } from "./_ssr/createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./_ssr/auth-middleware-C7ixY5gc.mjs";
import { t as supabase } from "./_ssr/client-l9Wso-f0.mjs";
import { a as formatDateTime } from "./_ssr/db-DhO7Bl8s.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./_ssr/card-CtX3ithx.mjs";
import { t as Button } from "./_ssr/button-BkEeRci-.mjs";
import { t as Badge } from "./_ssr/badge-D1Dupn2y.mjs";
import { $ as CircleAlert, H as Flame, I as LoaderCircle, M as MessageCircle, O as Play, Q as CircleCheck, U as FileText, Y as Clock, at as CalendarClock, d as Target, h as Sparkles, it as Calendar, l as TriangleAlert, nt as Check, o as UserCheck, st as Building2, t as X } from "./_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./_ssr/dialog-Bk9pEsHD.mjs";
import { t as Checkbox } from "./_ssr/checkbox-kt6FvQcE.mjs";
import { a as objectType, n as booleanType, o as stringType } from "./_libs/zod.mjs";
import { t as sendWhatsappMessageFn } from "./_ssr/whatsapp.functions-DiM6LUQl.mjs";
import { t as Progress } from "./_ssr/progress-DOIEKRJF.mjs";
import { r as useQueryClient, t as useQuery } from "./_libs/tanstack__react-query.mjs";
import { n as useWorkspace } from "./_ssr/use-workspace-n7F-1Rfj.mjs";
import { n as toast } from "./_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/_authenticated-yOCtP-C2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Retorna os contatos que devem receber mensagem hoje.
* Regras:
*  - cadence_active = true
*  - do_not_contact = false
*  - cadence_day entre 0 e 4 (próxima mensagem é Dia 1-5)
*  - last_contact_at nulo OU anterior às 00:00 de hoje
*/
async function fetchDueCadence() {
	const today = /* @__PURE__ */ new Date();
	today.setHours(0, 0, 0, 0);
	const { data: contacts, error } = await supabase.from("contacts").select("id, name, whatsapp, phone, cadence_day, cadence_active, do_not_contact, last_contact_at").eq("cadence_active", true).eq("do_not_contact", false).lt("cadence_day", 5);
	if (error) throw error;
	const eligibles = (contacts ?? []).filter((c) => !c.last_contact_at || new Date(c.last_contact_at) < today);
	if (eligibles.length === 0) return [];
	const { data: templates } = await supabase.from("message_templates").select("category, content");
	const byDay = {};
	(templates ?? []).forEach((t) => {
		const m = /^Dia\s+(\d)/.exec(t.category);
		if (m) byDay[Number(m[1])] = t.content;
	});
	return eligibles.map((c) => {
		const nextDay = (c.cadence_day ?? 0) + 1;
		const message = (byDay[nextDay] ?? `Mensagem do Dia ${nextDay}`).replaceAll("{{nome}}", c.name.split(" ")[0]);
		return {
			id: c.id,
			name: c.name,
			whatsapp: c.whatsapp,
			phone: c.phone,
			cadence_day: c.cadence_day ?? 0,
			nextDay,
			message
		};
	});
}
function CadenceModal({ open, onOpenChange }) {
	const qc = useQueryClient();
	const { data: due = [], isLoading, refetch } = useQuery({
		queryKey: ["cadence-due"],
		queryFn: fetchDueCadence,
		enabled: open
	});
	const [selected, setSelected] = (0, import_react.useState)({});
	const [sending, setSending] = (0, import_react.useState)(false);
	const [sentIds, setSentIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [failedIds, setFailedIds] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const sendFn = useServerFn(sendWhatsappMessageFn);
	const list = due;
	const activeIds = list.map((c) => c.id).filter((id) => !sentIds.has(id));
	const allSelected = activeIds.length > 0 && activeIds.every((id) => selected[id] ?? true);
	function toggleAll() {
		const next = {};
		activeIds.forEach((id) => next[id] = !allSelected);
		setSelected(next);
	}
	async function startSending() {
		const targets = list.filter((c) => (selected[c.id] ?? true) && !sentIds.has(c.id));
		if (targets.length === 0) {
			toast.info("Selecione ao menos um contato.");
			return;
		}
		setSending(true);
		let okCount = 0;
		let failCount = 0;
		for (const c of targets) {
			const to = c.whatsapp ?? c.phone;
			if (!to) {
				toast.warning(`${c.name} não possui WhatsApp cadastrado.`);
				failCount++;
				continue;
			}
			try {
				const res = await sendFn({ data: {
					contactId: c.id,
					to,
					body: c.message,
					cadenceDay: c.nextDay
				} });
				if (res.ok) {
					setSentIds((s) => new Set(s).add(c.id));
					okCount++;
				} else {
					setFailedIds((s) => new Set(s).add(c.id));
					failCount++;
					toast.error(`${c.name}: ${res.error}`);
				}
			} catch (err) {
				setFailedIds((s) => new Set(s).add(c.id));
				failCount++;
				toast.error(`${c.name}: ${err instanceof Error ? err.message : "erro"}`);
			}
			await new Promise((r) => setTimeout(r, 400));
		}
		setSending(false);
		if (okCount) toast.success(`${okCount} enviado(s) via Meta Cloud API.`);
		if (failCount && !okCount) toast.error(`Falha em ${failCount} envio(s).`);
		qc.invalidateQueries();
		refetch();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogTitle, {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-5 w-5 text-primary" }), "Iniciar Cadência"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: isLoading ? "Analisando contatos…" : list.length === 0 ? "Nenhum contato pendente para hoje. 🎉" : `Hoje existem ${list.length} contato(s) para receber mensagens. Deseja iniciar os envios?` })] }),
				isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center py-10 text-muted-foreground",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin" })
				}),
				!isLoading && list.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-h-[50vh] overflow-y-auto rounded-md border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "sticky top-0 flex items-center gap-3 border-b bg-muted/50 px-3 py-2 text-xs font-medium",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								checked: allSelected,
								onCheckedChange: toggleAll
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "flex-1",
								children: "Contato"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-16",
								children: "Dia"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "w-20 text-right",
								children: "Status"
							})
						]
					}), list.map((c) => {
						const isSent = sentIds.has(c.id);
						const isFailed = failedIds.has(c.id);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: `flex items-center gap-3 border-b px-3 py-2 text-sm ${isSent ? "opacity-60" : ""}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
									checked: !isSent && (selected[c.id] ?? true),
									disabled: isSent,
									onCheckedChange: (v) => setSelected((s) => ({
										...s,
										[c.id]: !!v
									}))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium",
										children: c.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "text-xs text-muted-foreground truncate max-w-md",
										children: c.message
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "w-16 text-xs",
									children: ["Dia ", c.nextDay]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-20 text-right",
									children: isSent ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 text-xs text-green-600",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3" }), " Enviado"]
									}) : isFailed ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 text-xs text-destructive",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-3 w-3" }), " Falhou"]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 text-xs text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3 w-3" }), " Pendente"]
									})
								})
							]
						}, c.id);
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => onOpenChange(false),
					children: "Fechar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: startSending,
					disabled: sending || list.length === 0,
					children: [sending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Enviar via Meta Cloud API"]
				})] })
			]
		})
	});
}
var listSaturdayRequestsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("f01d8af5205acdef9419a007f48c32d83ef690e30c403d7f6b3712d78724c96c"));
var decideSaturdayRequestFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	requestId: stringType().uuid(),
	approve: booleanType()
}).parse(raw)).handler(createSsrRpc("2a4a6be3abc7027777c52dab592d41db552955c8fe70d93efc01f3b02daa852e"));
/** Pedidos de reunião no sábado que a EVA encaminhou para o responsável decidir. */
function SaturdayRequestsCard() {
	const qc = useQueryClient();
	const list = useServerFn(listSaturdayRequestsFn);
	const decide = useServerFn(decideSaturdayRequestFn);
	const [busy, setBusy] = (0, import_react.useState)(null);
	const { data: requests = [] } = useQuery({
		queryKey: ["saturday-requests"],
		queryFn: () => list({}),
		refetchInterval: 6e4
	});
	async function act(id, approve) {
		setBusy(id);
		try {
			const res = await decide({ data: {
				requestId: id,
				approve
			} });
			if (res?.ok === false && res?.error) toast.error(res.error);
			else toast.success(approve ? "Sábado autorizado — a EVA já confirmou com o lead." : "Recusado — a EVA ofereceu horários de segunda a sexta.");
			qc.invalidateQueries({ queryKey: ["saturday-requests"] });
			qc.invalidateQueries({ queryKey: ["events"] });
			qc.invalidateQueries({ queryKey: ["dashboard-central"] });
		} catch {
			toast.error("Não consegui registrar sua decisão agora.");
		} finally {
			setBusy(null);
		}
	}
	if (requests.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "border-[color:var(--gold)]/40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
			className: "flex flex-row items-center justify-between space-y-0",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2 text-base",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarClock, { className: "h-4 w-4 text-[color:var(--gold)]" }), " Pedidos de reunião no sábado"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
				variant: "secondary",
				className: "text-[10px]",
				children: [requests.length, " aguardando você"]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "space-y-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "A EVA não confirma sábado sozinha. Autorize para ela fechar com o lead ou recuse para ela oferecer dias úteis."
			}), requests.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 rounded-md border p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/crm/$id",
						params: { id: r.contact_id },
						className: "font-medium hover:text-primary",
						children: r.contact_name || "Lead"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted-foreground",
						children: [
							formatDateTime(r.start_at),
							" · ",
							r.duration_minutes ?? 30,
							" min · ",
							r.online === false ? "Presencial" : "Google Meet"
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						disabled: busy === r.id,
						onClick: () => act(r.id, true),
						children: [busy === r.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1 h-3 w-3 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "mr-1 h-3 w-3" }), " Autorizar"]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						size: "sm",
						variant: "outline",
						disabled: busy === r.id,
						onClick: () => act(r.id, false),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "mr-1 h-3 w-3" }), " Recusar"]
					})]
				})]
			}, r.id))]
		})]
	});
}
var META_DIARIA = 4;
function StatCard({ label, value, icon: Icon, tone = "primary", hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		className: "border-border/60",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
			className: "flex items-center gap-4 p-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `flex h-11 w-11 items-center justify-center rounded-lg ${{
					primary: "bg-primary/10 text-primary",
					gold: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
					warn: "bg-orange-500/10 text-orange-600",
					muted: "bg-muted text-muted-foreground"
				}[tone]}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-[11px] uppercase tracking-wide text-muted-foreground",
						children: label
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-2xl font-semibold text-foreground leading-tight",
						children: value
					}),
					hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground truncate",
						children: hint
					})
				]
			})]
		})
	});
}
function Dashboard() {
	const [cadenceOpen, setCadenceOpen] = (0, import_react.useState)(false);
	const { data, isLoading: dashLoading } = useQuery({
		queryKey: ["dashboard-central"],
		queryFn: async () => {
			const startDay = /* @__PURE__ */ new Date();
			startDay.setHours(0, 0, 0, 0);
			const endDay = /* @__PURE__ */ new Date();
			endDay.setHours(23, 59, 59, 999);
			const fifteen = /* @__PURE__ */ new Date();
			fifteen.setDate(fifteen.getDate() - 15);
			const startIso = startDay.toISOString();
			const endIso = endDay.toISOString();
			const fifteenIso = fifteen.toISOString();
			const cnt = async (q) => (await q).count ?? 0;
			const head = () => supabase.from("contacts").select("id", {
				count: "exact",
				head: true
			}).is("deleted_at", null);
			const companyHead = () => supabase.from("companies").select("id", {
				count: "exact",
				head: true
			}).is("deleted_at", null);
			const [active, proposals, inCadence, newLeads, meetingsScheduled, inbox, forgottenCompanies, overdueFollowups, meetingsToday, noShows, companiesCount, meetingsList, priorities, overdueList, respondeuList, semContatoList] = await Promise.all([
				cnt(head().eq("funnel_stage", "cliente_ativo")),
				cnt(head().eq("funnel_stage", "proposta_enviada")),
				cnt(head().eq("cadence_active", true).eq("do_not_contact", false)),
				cnt(head().eq("funnel_stage", "novo_lead")),
				cnt(head().eq("funnel_stage", "reuniao_agendada")),
				cnt(head().eq("status", "aguardando_resposta")),
				cnt(companyHead().is("next_meeting", null)),
				cnt(supabase.from("tasks").select("id", {
					count: "exact",
					head: true
				}).eq("done", false).lt("due_at", startIso)),
				cnt(supabase.from("events").select("id", {
					count: "exact",
					head: true
				}).gte("starts_at", startIso).lte("starts_at", endIso)),
				cnt(supabase.from("events").select("id", {
					count: "exact",
					head: true
				}).eq("kind", "reuniao").gte("starts_at", startIso).lte("starts_at", endIso).eq("status", "no_show")),
				cnt(companyHead()),
				supabase.from("events").select("id, title, starts_at, status, kind").gte("starts_at", startIso).lte("starts_at", endIso).order("starts_at"),
				supabase.from("contacts").select("id, name, funnel_stage, last_contact_at").eq("funnel_stage", "proposta_enviada").is("deleted_at", null).order("updated_at", { ascending: false }).limit(5),
				supabase.from("tasks").select("id, title, due_at, contact_id").eq("done", false).lt("due_at", startIso).order("due_at", { ascending: true }).limit(5),
				supabase.from("contacts").select("id, name, last_contact_at").is("deleted_at", null).gte("last_contact_at", startIso).lte("last_contact_at", endIso).order("last_contact_at", { ascending: false }).limit(5),
				supabase.from("contacts").select("id, name, last_contact_at").is("deleted_at", null).eq("do_not_contact", false).lt("last_contact_at", fifteenIso).order("last_contact_at", { ascending: true }).limit(5)
			]);
			const meetingsData = meetingsList.data ?? [];
			const reunioesHoje = meetingsData.filter((m) => m.kind === "reuniao" && m.status === "confirmed").length;
			return {
				stats: {
					inbox,
					inCadence,
					meetingsToday,
					overdueFollowups,
					proposals,
					noShows,
					forgottenCompanies,
					active,
					newLeads,
					meetingsScheduled,
					companies: companiesCount
				},
				meetings: meetingsData,
				reunioesHoje,
				prioridades: {
					semContatoLongo: semContatoList.data ?? [],
					respondeuHoje: respondeuList.data ?? [],
					propostaAberta: priorities.data ?? [],
					foraCadencia: [],
					tasks: overdueList.data ?? []
				}
			};
		},
		staleTime: 3e4
	});
	const { data: dueCount = 0 } = useQuery({
		queryKey: ["cadence-due-count"],
		queryFn: async () => (await fetchDueCadence()).length
	});
	const meta = data?.reunioesHoje ?? 0;
	const metaPct = Math.min(100, Math.round(meta / META_DIARIA * 100));
	const { workspace } = useWorkspace();
	const hour = (/* @__PURE__ */ new Date()).getHours();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl font-semibold tracking-tight",
					children: "Central de Operações ✨"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [
						hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite",
						", ",
						workspace.owner_name || workspace.name,
						". A EVA já organizou o que importa para hoje."
					]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "lg",
					onClick: () => setCadenceOpen(true),
					className: "h-14 gap-3 bg-[color:var(--petrol)] px-6 text-base text-white shadow-lg hover:brightness-110",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--gold)]/20",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Play, {
							className: "h-4 w-4 text-[color:var(--gold)]",
							fill: "currentColor"
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-start leading-tight",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-semibold",
							children: "Iniciar Cadência"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[11px] opacity-80",
							children: [dueCount, " contato(s) prontos para hoje"]
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SaturdayRequestsCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "border-[color:var(--gold)]/30 bg-gradient-to-r from-[color:var(--petrol)]/5 to-[color:var(--gold)]/5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Target, { className: "h-6 w-6" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs uppercase tracking-wide text-muted-foreground",
							children: "Meta do dia"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-lg font-semibold",
							children: [
								"Agendar ",
								META_DIARIA,
								" reuniões"
							]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex-1 md:max-w-md",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-1 flex justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-medium",
								children: [
									meta,
									" de ",
									META_DIARIA,
									" reuniões"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-muted-foreground",
								children: [metaPct, "%"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, {
							value: metaPct,
							className: "h-3"
						})]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Mensagens p/ responder",
						value: data?.stats.inbox ?? 0,
						icon: MessageCircle,
						tone: "gold",
						hint: "clientes aguardando você"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Em cadência",
						value: data?.stats.inCadence ?? 0,
						icon: Flame,
						tone: "primary",
						hint: "rodando automaticamente"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Reuniões hoje",
						value: data?.stats.meetingsToday ?? 0,
						icon: Calendar,
						tone: "primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Follow-ups atrasados",
						value: data?.stats.overdueFollowups ?? 0,
						icon: Clock,
						tone: "warn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Propostas pendentes",
						value: data?.stats.proposals ?? 0,
						icon: FileText,
						tone: "gold"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "No shows",
						value: data?.stats.noShows ?? 0,
						icon: TriangleAlert,
						tone: "warn"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Empresas aguardando",
						value: data?.stats.forgottenCompanies ?? 0,
						icon: Building2,
						tone: "muted"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Clientes ativos",
						value: data?.stats.active ?? 0,
						icon: UserCheck,
						tone: "primary"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:col-span-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
						className: "flex flex-row items-center justify-between space-y-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-[color:var(--gold)]" }), " Prioridades da EVA"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: "secondary",
							className: "text-[10px]",
							children: "Sugerido pela IA"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "space-y-4 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrioRow, {
								title: "Quem responder primeiro",
								tone: "gold",
								items: data?.prioridades.respondeuHoje ?? [],
								empty: "Ninguém respondeu ainda hoje."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrioRow, {
								title: "Sem contato há mais de 15 dias",
								tone: "warn",
								items: data?.prioridades.semContatoLongo ?? [],
								empty: "Todos com contato recente 👏"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrioRow, {
								title: "Proposta em aberto",
								tone: "primary",
								items: data?.prioridades.propostaAberta ?? [],
								empty: "Sem propostas para acompanhar."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PrioRow, {
								title: "Follow-ups atrasados",
								tone: "warn",
								tasks: data?.prioridades.tasks ?? [],
								empty: "Nenhum follow-up atrasado."
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calendar, { className: "h-4 w-4 text-primary" }), " Agenda de hoje"]
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "space-y-2",
					children: [(data?.meetings ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground",
						children: "Sem compromissos hoje."
					}), data?.meetings.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between rounded-md border p-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "truncate font-medium",
								children: m.title
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: formatDateTime(m.starts_at)
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/agenda",
							className: "text-xs text-primary hover:underline",
							children: "Abrir"
						})]
					}, m.id))]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CadenceModal, {
				open: cadenceOpen,
				onOpenChange: setCadenceOpen
			})
		]
	});
}
function PrioRow({ title, items = [], tasks = [], tone, empty }) {
	const toneBar = {
		primary: "bg-primary",
		gold: "bg-[color:var(--gold)]",
		warn: "bg-orange-500"
	}[tone];
	const total = (items?.length ?? 0) + (tasks?.length ?? 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border bg-card p-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-2 flex items-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `h-2 w-2 rounded-full ${toneBar}` }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs font-semibold uppercase tracking-wide text-foreground",
					children: title
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
					variant: "outline",
					className: "ml-auto text-[10px]",
					children: total
				})
			]
		}), total === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-xs text-muted-foreground",
			children: empty
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
			className: "space-y-1 text-xs",
			children: [items.slice(0, 4).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				"• ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/crm/$id",
					params: { id: c.id },
					className: "text-primary hover:underline",
					children: c.name
				}),
				c.last_contact_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [" — último: ", new Date(c.last_contact_at).toLocaleDateString("pt-BR")]
				})
			] }, c.id)), tasks.slice(0, 4).map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
				"• ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-foreground",
					children: t.title
				}),
				t.due_at && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "text-muted-foreground",
					children: [" — ", new Date(t.due_at).toLocaleDateString("pt-BR")]
				})
			] }, t.id))]
		})]
	});
}
//#endregion
export { Dashboard as component };
