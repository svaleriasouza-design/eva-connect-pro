import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime, i as formatDate, t as FUNNEL_STAGES } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { E as Plus, F as Loader, N as Mail, st as Building2, u as Trash2, x as Search } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-Bk9pEsHD.mjs";
import { t as Checkbox } from "./checkbox-kt6FvQcE.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, i as AlertDialogContent, l as AlertDialogTrigger, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog, u as deleteCompaniesFn } from "./imports.functions-BHwH6ZNV.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/empresas-CWrBCPg2.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var PAGE_SIZE = 100;
function stageLabel(k) {
	return FUNNEL_STAGES.find((s) => s.key === k)?.label ?? k ?? "—";
}
function Empresas() {
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [page, setPage] = (0, import_react.useState)(0);
	const [openId, setOpenId] = (0, import_react.useState)(null);
	const [openNew, setOpenNew] = (0, import_react.useState)(false);
	const [selected, setSelected] = (0, import_react.useState)([]);
	const [deleting, setDeleting] = (0, import_react.useState)(false);
	const deleteCompanies = useServerFn(deleteCompaniesFn);
	const { data: total = 0 } = useQuery({
		queryKey: ["companies-count", q],
		queryFn: async () => {
			let query = supabase.from("companies").select("id", {
				count: "exact",
				head: true
			}).is("deleted_at", null);
			if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
			const { count } = await query;
			return count ?? 0;
		}
	});
	const { data: companies = [], isLoading } = useQuery({
		queryKey: [
			"companies-page",
			q,
			page
		],
		queryFn: async () => {
			let query = supabase.from("companies").select("id, name, responsible, whatsapp, phone, email, city, segment, employees, funnel_stage, status, last_contact_at, next_action, next_action_at, contacts_count").is("deleted_at", null).order("last_contact_at", {
				ascending: false,
				nullsFirst: false
			}).order("name", { ascending: true }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
			if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
			const { data, error } = await query;
			if (error) throw error;
			return data ?? [];
		},
		placeholderData: (prev) => prev
	});
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const allOnPageSelected = companies.length > 0 && companies.every((c) => selected.includes(c.id));
	function toggleOne(id) {
		setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
	}
	function toggleAllOnPage() {
		const ids = companies.map((c) => c.id);
		setSelected((s) => allOnPageSelected ? s.filter((x) => !ids.includes(x)) : Array.from(/* @__PURE__ */ new Set([...s, ...ids])));
	}
	async function removeSelected() {
		setDeleting(true);
		try {
			const res = await deleteCompanies({ data: { ids: selected } });
			setSelected([]);
			await Promise.all([
				qc.invalidateQueries({ queryKey: ["companies"] }),
				qc.invalidateQueries({ queryKey: ["companies-page"] }),
				qc.invalidateQueries({ queryKey: ["companies-count"] }),
				qc.invalidateQueries({ queryKey: ["company-detail"] }),
				qc.invalidateQueries({ queryKey: ["company-contacts"] }),
				qc.invalidateQueries({ queryKey: ["contacts"] }),
				qc.invalidateQueries({ queryKey: ["contacts-page"] }),
				qc.invalidateQueries({ queryKey: ["contacts-count"] }),
				qc.invalidateQueries({ queryKey: ["contacts-min"] }),
				qc.invalidateQueries({ queryKey: ["funil-por-etapa"] }),
				qc.invalidateQueries({ queryKey: ["funnel"] }),
				qc.invalidateQueries({ queryKey: ["dashboard"] }),
				qc.invalidateQueries({ queryKey: ["dashboard-central"] }),
				qc.invalidateQueries({ queryKey: ["activities"] }),
				qc.invalidateQueries({ queryKey: ["all-activities"] }),
				qc.invalidateQueries({ queryKey: ["events"] }),
				qc.invalidateQueries({ queryKey: ["hist-contacts"] })
			]);
			toast.success(`${(res?.removed ?? 0).toLocaleString("pt-BR")} empresa(s) excluída(s).`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível excluir as empresas.");
		} finally {
			setDeleting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-semibold flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-6 w-6 text-primary" }), " Empresas"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [total.toLocaleString("pt-BR"), " empresas · atualizadas automaticamente pelo CRM"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewCompanyDialog, {
					open: openNew,
					onOpenChange: setOpenNew,
					onSaved: () => qc.invalidateQueries({ queryKey: ["companies-page"] })
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative max-w-md",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
					value: q,
					onChange: (e) => {
						setPage(0);
						setQ(e.target.value);
					},
					placeholder: "Buscar por nome…",
					className: "pl-9"
				})]
			}),
			selected.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.length.toLocaleString("pt-BR") }), " empresa(s) selecionada(s)"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						onClick: () => setSelected([]),
						children: "Limpar seleção"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "destructive",
							size: "sm",
							disabled: deleting,
							className: "gap-2",
							children: [deleting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loader, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), "Excluir selecionadas"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
						"Excluir ",
						selected.length,
						" empresa(s)?"
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "As empresas selecionadas serão excluídas permanentemente. Os contatos vinculados a elas permanecerão no CRM, mas serão desvinculados (sem empresa). Atividades relacionadas serão removidas. Esta ação não pode ser desfeita." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancelar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
						onClick: removeSelected,
						children: "Excluir"
					})] })] })] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
						className: "w-full text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
							className: "bg-muted/50 text-left text-xs uppercase text-muted-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3 w-8",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										checked: allOnPageSelected,
										onCheckedChange: toggleAllOnPage,
										"aria-label": "Selecionar todas"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Empresa"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Responsável"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "WhatsApp"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "E-mail"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Cidade"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Segmento"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3 text-center",
									children: "Colab."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Status"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Último contato"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
									className: "p-3",
									children: "Próxima ação"
								})
							] })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
							isLoading && companies.length === 0 && Array.from({ length: 10 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
								className: "border-t",
								children: Array.from({ length: 11 }).map((__, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })
								}, j))
							}, i)),
							companies.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
								className: "border-t hover:bg-muted/30",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
											checked: selected.includes(c.id),
											onCheckedChange: () => toggleOne(c.id),
											"aria-label": `Selecionar ${c.name}`
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
										className: "p-3 cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-medium",
											children: c.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-[11px] text-muted-foreground",
											children: [c.contacts_count ?? 0, " contato(s)"]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.responsible ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.whatsapp ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.email ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											onClick: (e) => e.stopPropagation(),
											href: `mailto:${c.email}`,
											className: "inline-flex items-center gap-1 hover:underline",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3" }),
												" ",
												c.email
											]
										}) : "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.city ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.segment ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-center text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.employees ?? "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
											variant: "secondary",
											children: stageLabel(c.funnel_stage)
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-xs text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: formatDateTime(c.last_contact_at)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
										className: "p-3 text-xs text-muted-foreground cursor-pointer",
										onClick: () => setOpenId(c.id),
										children: c.next_action ?? "—"
									})
								]
							}, c.id)),
							!isLoading && companies.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								colSpan: 11,
								className: "p-8 text-center text-muted-foreground",
								children: "Nenhuma empresa encontrada."
							}) })
						] })]
					})
				})
			}),
			pages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-muted-foreground",
					children: [
						"Página ",
						page + 1,
						" de ",
						pages
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "sm",
						disabled: page === 0,
						onClick: () => setPage((p) => Math.max(0, p - 1)),
						children: "Anterior"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						size: "sm",
						disabled: page + 1 >= pages,
						onClick: () => setPage((p) => p + 1),
						children: "Próxima"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompanyDetailDialog, {
				id: openId,
				onOpenChange: (v) => !v && setOpenId(null)
			})
		]
	});
}
function CompanyDetailDialog({ id, onOpenChange }) {
	const { data: company } = useQuery({
		queryKey: ["company-detail", id],
		queryFn: async () => (await supabase.from("companies").select("*").eq("id", id).maybeSingle()).data,
		enabled: !!id
	});
	const { data: contacts = [] } = useQuery({
		queryKey: ["company-contacts", id],
		queryFn: async () => (await supabase.from("contacts").select("id, name, whatsapp, email, funnel_stage, last_contact_at, next_action").eq("company_id", id).is("deleted_at", null).order("created_at")).data ?? [],
		enabled: !!id
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open: !!id,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-3xl max-h-[85vh] overflow-y-auto",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: company?.name ?? "…" }) }), !company ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-5 w-40" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-full" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-3/4" })
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-2 md:grid-cols-2 text-sm",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Responsável",
								value: company.responsible
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Status / Etapa",
								value: stageLabel(company.funnel_stage)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "WhatsApp",
								value: company.whatsapp ?? company.phone
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "E-mail",
								value: company.email
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Cidade",
								value: company.city
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Segmento",
								value: company.segment
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Colaboradores",
								value: company.employees
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Último contato",
								value: formatDateTime(company.last_contact_at)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Próxima ação",
								value: company.next_action
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Próx. reunião",
								value: formatDate(company.next_meeting)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Renovação",
								value: formatDate(company.renewal)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
								label: "Contatos vinculados",
								value: company.contacts_count
							})
						]
					}),
					company.diagnosis && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
						label: "Diagnóstico",
						value: company.diagnosis,
						block: true
					}),
					company.notes && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Info$1, {
						label: "Observações",
						value: company.notes,
						block: true
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs font-semibold uppercase text-muted-foreground mb-2",
						children: [
							"Contatos vinculados (",
							contacts.length,
							")"
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border divide-y",
						children: [contacts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-3 text-xs text-muted-foreground",
							children: "Nenhum contato vinculado."
						}), contacts.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/crm/$id",
							params: { id: c.id },
							className: "flex items-center justify-between p-3 text-sm hover:bg-muted/30",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: c.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-xs text-muted-foreground",
								children: [
									c.whatsapp ?? "—",
									" · ",
									c.email ?? "—"
								]
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								children: stageLabel(c.funnel_stage)
							})]
						}, c.id))]
					})] })
				]
			})]
		})
	});
}
function Info$1({ label, value, block }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: block ? "" : "",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-[10px] uppercase tracking-wide text-muted-foreground",
			children: label
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: block ? "text-sm whitespace-pre-wrap" : "text-sm",
			children: value == null || value === "" ? "—" : String(value)
		})]
	});
}
function NewCompanyDialog({ open, onOpenChange, onSaved }) {
	const [form, setForm] = (0, import_react.useState)({});
	const upd = (k) => (e) => setForm({
		...form,
		[k]: e?.target?.value ?? e
	});
	async function save() {
		if (!form.name) return toast.error("Nome é obrigatório");
		const { error } = await supabase.from("companies").insert(form);
		if (error) return toast.error(error.message);
		toast.success("Empresa criada");
		onOpenChange(false);
		setForm({});
		onSaved();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Nova Empresa"] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl max-h-[85vh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Nova empresa" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 md:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Nome *",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.name ?? "",
								onChange: upd("name")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Responsável",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.responsible ?? "",
								onChange: upd("responsible")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "WhatsApp",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.whatsapp ?? "",
								onChange: upd("whatsapp")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "E-mail",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.email ?? "",
								onChange: upd("email")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Segmento",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.segment ?? "",
								onChange: upd("segment")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Cidade",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.city ?? "",
								onChange: upd("city")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Nº colaboradores",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								value: form.employees ?? "",
								onChange: upd("employees")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Renovação",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: form.renewal ?? "",
								onChange: upd("renewal")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Diagnóstico",
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 2,
								value: form.diagnosis ?? "",
								onChange: upd("diagnosis")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Fld, {
							label: "Observações",
							className: "md:col-span-2",
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
					onClick: () => onOpenChange(false),
					children: "Cancelar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: save,
					children: "Salvar"
				})] })
			]
		})]
	});
}
function Fld({ label, children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs",
			children: label
		}), children]
	});
}
//#endregion
export { Empresas as component };
