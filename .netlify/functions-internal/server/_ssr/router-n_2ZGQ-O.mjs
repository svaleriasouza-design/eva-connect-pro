import { i as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { R as redirect, _ as createRootRouteWithContext, b as useRouter, g as createFileRoute, h as lazyRouteComponent, l as Scripts, m as Outlet, p as createRouter, u as HeadContent, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime, r as ORIGENS, t as FUNNEL_STAGES } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { E as Plus, F as Loader, q as Download, s as Upload, u as Trash2, x as Search } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-Bk9pEsHD.mjs";
import { t as Checkbox } from "./checkbox-kt6FvQcE.mjs";
import { t as Progress } from "./progress-DOIEKRJF.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { n as QueryClientProvider, r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast, t as Toaster } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { t as normalizePhoneNumber } from "./phone-06k09EE6.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, d as deleteContactsByFilterFn, f as deleteContactsFn, i as AlertDialogContent, l as AlertDialogTrigger, n as AlertDialogAction, o as AlertDialogFooter, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./imports.functions-BHwH6ZNV.mjs";
import { a as pickField, c as WhatsAppQuickSend, i as normalizeCompanyName, n as ensureCompanies, o as readRowsFromFile, r as isSupportedImportFile, s as validateLeadHeaders, t as ImportBatchesCard } from "./import-batches-card-BMBArryj.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-n_2ZGQ-O.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-BaUducAs.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$20 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "EVA IA — Assistente executiva" },
			{
				name: "description",
				content: "EVA IA: CRM, funil, agenda e assistente de IA para prospecção comercial B2B do programa Bio Impact."
			},
			{
				name: "author",
				content: "Bio Impact"
			},
			{
				property: "og:title",
				content: "EVA IA — Assistente executiva"
			},
			{
				property: "og:description",
				content: "EVA IA: CRM, funil, agenda e assistente de IA para prospecção comercial B2B do programa Bio Impact."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "EVA IA — Assistente executiva"
			},
			{
				name: "twitter:description",
				content: "EVA IA: CRM, funil, agenda e assistente de IA para prospecção comercial B2B do programa Bio Impact."
			},
			{
				property: "og:image",
				content: "https://storage.googleapis.com/gpt-engineer-file-uploads/62A8XdVDl9X5fKDusPUCWaN1yPt1/social-images/social-1783544026031-Gemini_Generated_Image_j5pfx7j5pfx7j5pf.webp"
			},
			{
				name: "twitter:image",
				content: "https://storage.googleapis.com/gpt-engineer-file-uploads/62A8XdVDl9X5fKDusPUCWaN1yPt1/social-images/social-1783544026031-Gemini_Generated_Image_j5pfx7j5pfx7j5pf.webp"
			}
		],
		links: [{
			rel: "stylesheet",
			href: styles_default
		}]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$20.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, {
			richColors: true,
			position: "top-right"
		})]
	});
}
var $$splitComponentImporter$17 = () => import("./route-CRiN7-Vo.mjs");
var Route$19 = createFileRoute("/_authenticated")({
	ssr: false,
	beforeLoad: async () => {
		const { data, error } = await supabase.auth.getUser();
		if (error || !data.user) throw redirect({ to: "/auth" });
		return { user: data.user };
	},
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
var $$splitComponentImporter$16 = () => import("./auth-KtlYjVa0.mjs");
var Route$18 = createFileRoute("/auth")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$16, "component"),
	head: () => ({ meta: [
		{ title: "Entrar ou criar conta · EVA IA" },
		{
			name: "description",
			content: "Acesse a central comercial EVA IA ou crie sua conta para começar a prospectar com a assistente executiva."
		},
		{
			property: "og:title",
			content: "Entrar ou criar conta · EVA IA"
		},
		{
			property: "og:description",
			content: "Acesse a central comercial EVA IA ou crie sua conta em poucos segundos."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] })
});
var $$splitComponentImporter$15 = () => import("./politica-0UGFF-zD.mjs");
var Route$17 = createFileRoute("/politica")({
	head: () => ({ meta: [
		{ title: "Política de Privacidade e Termos — EVA ASSISTENTE" },
		{
			name: "description",
			content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE."
		},
		{
			property: "og:title",
			content: "Política de Privacidade e Termos — EVA ASSISTENTE"
		},
		{
			property: "og:description",
			content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		},
		{
			name: "twitter:title",
			content: "Política de Privacidade e Termos — EVA ASSISTENTE"
		},
		{
			name: "twitter:description",
			content: "Política de Privacidade, Termos de Serviço e instruções de exclusão de dados do aplicativo EVA ASSISTENTE."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./reset-password-BKIzF4sa.mjs");
var Route$16 = createFileRoute("/reset-password")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$14, "component"),
	head: () => ({ meta: [
		{ title: "Definir nova senha · EVA IA" },
		{
			name: "description",
			content: "Crie uma nova senha segura para voltar a acessar sua central comercial EVA IA."
		},
		{
			property: "og:title",
			content: "Definir nova senha · EVA IA"
		},
		{
			property: "og:description",
			content: "Redefina sua senha de acesso à EVA IA em poucos segundos."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] })
});
var $$splitComponentImporter$13 = () => import("../_authenticated-yOCtP-C2.mjs");
var Route$15 = createFileRoute("/_authenticated/")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./agenda-HMBMLXNB.mjs");
var Route$14 = createFileRoute("/_authenticated/agenda")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
var $$splitComponentImporter$11 = () => import("./cadencias-CB2dBxNZ.mjs");
var Route$13 = createFileRoute("/_authenticated/cadencias")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
var $$splitComponentImporter$10 = () => import("./configuracoes-c6I-xccc.mjs");
var Route$12 = createFileRoute("/_authenticated/configuracoes")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
var $$splitComponentImporter$9 = () => import("./crm-Dh7w1tqd.mjs");
var Route$11 = createFileRoute("/_authenticated/crm")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
function CrmList() {
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [stage, setStage] = (0, import_react.useState)("all");
	const [batch, setBatch] = (0, import_react.useState)("all");
	const [importing, setImporting] = (0, import_react.useState)(false);
	const [importProgress, setImportProgress] = (0, import_react.useState)({
		done: 0,
		total: 0,
		inserted: 0,
		skipped: 0
	});
	const [page, setPage] = (0, import_react.useState)(0);
	const PAGE_SIZE = 200;
	const [selected, setSelected] = (0, import_react.useState)([]);
	const [deleting, setDeleting] = (0, import_react.useState)(false);
	const deleteContacts = useServerFn(deleteContactsFn);
	const deleteContactsByFilter = useServerFn(deleteContactsByFilterFn);
	const { data: batchOptions = [] } = useQuery({
		queryKey: ["import-batch-options"],
		queryFn: async () => {
			const { data } = await supabase.from("import_batches").select("id, file_name, created_at, inserted_rows").is("deleted_at", null).order("created_at", { ascending: false }).limit(30);
			return data ?? [];
		}
	});
	const { data: total = 0 } = useQuery({
		queryKey: [
			"contacts-count",
			q,
			stage,
			batch
		],
		queryFn: async () => {
			let query = supabase.from("contacts").select("id", {
				count: "exact",
				head: true
			}).is("deleted_at", null);
			if (stage !== "all") query = query.eq("funnel_stage", stage);
			if (batch === "none") query = query.is("import_batch_id", null);
			else if (batch !== "all") query = query.eq("import_batch_id", batch);
			if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,company_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
			const { count } = await query;
			return count ?? 0;
		}
	});
	const { data: contacts = [], isLoading } = useQuery({
		queryKey: [
			"contacts-page",
			q,
			stage,
			batch,
			page
		],
		queryFn: async () => {
			let query = supabase.from("contacts").select("id, name, company_name, whatsapp, funnel_stage, last_contact_at, created_at, import_batch_id").is("deleted_at", null).order("created_at", { ascending: false }).range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
			if (stage !== "all") query = query.eq("funnel_stage", stage);
			if (batch === "none") query = query.is("import_batch_id", null);
			else if (batch !== "all") query = query.eq("import_batch_id", batch);
			if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,company_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
			const { data } = await query;
			return data ?? [];
		},
		placeholderData: (prev) => prev
	});
	const filtered = contacts;
	const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const allOnPageSelected = filtered.length > 0 && filtered.every((c) => selected.includes(c.id));
	function toggleOne(id) {
		setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
	}
	function toggleAllOnPage() {
		const ids = filtered.map((c) => c.id);
		setSelected((s) => allOnPageSelected ? s.filter((x) => !ids.includes(x)) : Array.from(/* @__PURE__ */ new Set([...s, ...ids])));
	}
	async function removeSelected() {
		setDeleting(true);
		try {
			const res = await deleteContacts({ data: { ids: selected } });
			setSelected([]);
			await invalidateAfterDelete();
			toast.success(`${(res?.removed ?? 0).toLocaleString("pt-BR")} contato(s) excluído(s).`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível excluir os contatos.");
		} finally {
			setDeleting(false);
		}
	}
	async function removeAllFiltered() {
		setDeleting(true);
		try {
			const res = await deleteContactsByFilter({ data: {
				q,
				stage,
				batch
			} });
			setSelected([]);
			await invalidateAfterDelete();
			toast.success(`${(res?.removed ?? 0).toLocaleString("pt-BR")} contato(s) excluído(s).`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível excluir os contatos.");
		} finally {
			setDeleting(false);
		}
	}
	/** Invalida todas as queries relacionadas a contatos após uma exclusão. */
	async function invalidateAfterDelete() {
		await Promise.all([
			qc.invalidateQueries({ queryKey: ["contacts"] }),
			qc.invalidateQueries({ queryKey: ["contacts-page"] }),
			qc.invalidateQueries({ queryKey: ["contacts-count"] }),
			qc.invalidateQueries({ queryKey: ["contacts-min"] }),
			qc.invalidateQueries({ queryKey: ["companies"] }),
			qc.invalidateQueries({ queryKey: ["companies-page"] }),
			qc.invalidateQueries({ queryKey: ["companies-count"] }),
			qc.invalidateQueries({ queryKey: ["company-contacts"] }),
			qc.invalidateQueries({ queryKey: ["company-detail"] }),
			qc.invalidateQueries({ queryKey: ["funil-por-etapa"] }),
			qc.invalidateQueries({ queryKey: ["funnel"] }),
			qc.invalidateQueries({ queryKey: ["dashboard"] }),
			qc.invalidateQueries({ queryKey: ["dashboard-central"] }),
			qc.invalidateQueries({ queryKey: ["activities"] }),
			qc.invalidateQueries({ queryKey: ["all-activities"] }),
			qc.invalidateQueries({ queryKey: ["events"] }),
			qc.invalidateQueries({ queryKey: ["tasks"] }),
			qc.invalidateQueries({ queryKey: ["saturday-requests"] }),
			qc.invalidateQueries({ queryKey: ["cadence-stats"] }),
			qc.invalidateQueries({ queryKey: ["cadence-due"] }),
			qc.invalidateQueries({ queryKey: ["cadence-due-count"] }),
			qc.invalidateQueries({ queryKey: ["wa-contacts"] }),
			qc.invalidateQueries({ queryKey: ["wa-recent-acts"] }),
			qc.invalidateQueries({ queryKey: ["hist-contacts"] }),
			qc.invalidateQueries({ queryKey: ["import-batches"] }),
			qc.invalidateQueries({ queryKey: ["import-batch-options"] })
		]);
	}
	async function importCsv(file) {
		const finish = (msg, isError = false) => {
			setImporting(false);
			setImportProgress({
				done: 0,
				total: 0,
				inserted: 0,
				skipped: 0
			});
			if (msg) (isError ? toast.error : toast.success)(msg);
		};
		if (!file) return toast.error("Nenhum arquivo selecionado.");
		if (!isSupportedImportFile(file)) return toast.error("Formato não aceito. Envie uma planilha Excel (.xlsx) ou um arquivo CSV (.csv).");
		setImporting(true);
		setImportProgress({
			done: 0,
			total: 0,
			inserted: 0,
			skipped: 0
		});
		try {
			let rows = [];
			let headers = [];
			try {
				const read = await readRowsFromFile(file);
				rows = read.rows;
				headers = read.headers;
			} catch (e) {
				return finish(`Não foi possível ler o arquivo: ${e?.message ?? "formato inválido ou arquivo corrompido"}.`, true);
			}
			if (rows.length === 0) return finish("O arquivo está vazio ou sem linhas de dados. Verifique se a primeira linha contém os nomes das colunas.", true);
			const headerProblem = validateLeadHeaders(headers.length ? headers : Object.keys(rows[0] ?? {}));
			if (headerProblem) return finish(headerProblem, true);
			const mapped = rows.map((r) => {
				if (!r || typeof r !== "object") return null;
				const nomeFantasia = pickField(r, ["Nome Fantasia", "nome_fantasia"]);
				const razaoSocial = pickField(r, [
					"Razao Social",
					"Razão Social",
					"razao_social"
				]);
				const name = nomeFantasia || razaoSocial || pickField(r, [
					"name",
					"nome",
					"contato"
				]);
				const rawWhatsapp = pickField(r, [
					"Telefone1 Completo",
					"telefone1_completo",
					"WhatsApp",
					"whatsapp",
					"celular"
				]);
				const whatsapp = normalizePhoneNumber(rawWhatsapp) || null;
				const email = pickField(r, [
					"E-mail",
					"Email",
					"email"
				]);
				if (!whatsapp && !email) return null;
				const contactName = name || "Sem nome";
				const companyName = razaoSocial || pickField(r, ["company", "empresa"]) || contactName;
				return {
					name: contactName,
					phone: whatsapp || normalizePhoneNumber(pickField(r, [
						"Telefone",
						"phone",
						"telefone"
					])) || null,
					whatsapp,
					email,
					company_name: companyName,
					city: pickField(r, ["Cidade", "city"]),
					funnel_stage: "novo_lead"
				};
			}).filter((r) => r !== null);
			if (mapped.length === 0) return finish(`Lemos ${rows.length.toLocaleString("pt-BR")} linhas, mas nenhuma tinha WhatsApp/telefone ou e-mail válidos. Confira as colunas de contato da planilha.`, true);
			const { data: authData } = await supabase.auth.getUser();
			const { data: batchRow, error: batchErr } = await supabase.from("import_batches").insert({
				file_name: file.name,
				total_rows: rows.length,
				inserted_rows: 0,
				created_by: authData?.user?.id ?? null,
				created_by_name: (authData?.user?.user_metadata)?.full_name ?? authData?.user?.email ?? null
			}).select("id").single();
			if (batchErr) return finish(`Não foi possível registrar a importação: ${batchErr.message}`, true);
			const batchId = batchRow.id;
			const companyExtras = {};
			mapped.forEach((r) => {
				const norm = normalizeCompanyName(r.company_name);
				if (!companyExtras[norm]) companyExtras[norm] = {
					city: r.city,
					phone: r.phone,
					email: r.email
				};
			});
			const companyMap = await ensureCompanies(mapped.map((r) => r.company_name), companyExtras, batchId);
			const withCompany = mapped.map((r) => ({
				...r,
				company_id: companyMap.get(normalizeCompanyName(r.company_name)) ?? null,
				import_batch_id: batchId
			}));
			const BATCH = 500;
			setImportProgress({
				done: 0,
				total: withCompany.length,
				inserted: 0,
				skipped: 0
			});
			let inserted = 0;
			let skipped = 0;
			for (let i = 0; i < withCompany.length; i += BATCH) {
				const batch = withCompany.slice(i, i + BATCH);
				try {
					const { error } = await supabase.from("contacts").insert(batch);
					if (error) {
						console.error("Batch insert error:", error);
						for (const row of batch) try {
							const { error: rowErr } = await supabase.from("contacts").insert(row);
							if (rowErr) skipped += 1;
							else inserted += 1;
						} catch (e) {
							console.error("Row insert exception:", e);
							skipped += 1;
						}
					} else inserted += batch.length;
				} catch (e) {
					console.error("Batch exception:", e);
					skipped += batch.length;
				}
				setImportProgress({
					done: Math.min(i + BATCH, withCompany.length),
					total: withCompany.length,
					inserted,
					skipped
				});
			}
			await supabase.from("import_batches").update({ inserted_rows: inserted }).eq("id", batchId);
			qc.invalidateQueries({ queryKey: ["contacts"] });
			qc.invalidateQueries({ queryKey: ["contacts-page"] });
			qc.invalidateQueries({ queryKey: ["contacts-count"] });
			qc.invalidateQueries({ queryKey: ["import-batches"] });
			qc.invalidateQueries({ queryKey: ["import-batch-options"] });
			qc.invalidateQueries({ queryKey: ["companies"] });
			finish(`${inserted} contatos importados${skipped ? ` · ${skipped} ignorados` : ""}`);
		} catch (e) {
			console.error("Import error:", e);
			finish(`Erro na importação: ${e?.message ?? "erro desconhecido"}`, true);
		}
	}
	function exportCsv() {
		const headers = [
			"name",
			"company_name",
			"whatsapp",
			"email",
			"funnel_stage",
			"city",
			"created_at",
			"import_batch_id"
		];
		const csv = [headers.join(",")].concat(filtered.map((c) => headers.map((h) => JSON.stringify(c[h] ?? "")).join(","))).join("\n");
		const blob = new Blob([csv], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "contatos.csv";
		a.click();
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "CRM"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: [total.toLocaleString("pt-BR"), " contatos"]
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "cursor-pointer",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "file",
								accept: ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
								className: "hidden",
								disabled: importing,
								onChange: (e) => {
									const f = e.target.files?.[0];
									if (f) importCsv(f);
									e.target.value = "";
								}
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								variant: "outline",
								asChild: true,
								disabled: importing,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "mr-2 h-4 w-4" }),
									" ",
									importing ? "Importando…" : "Importar planilha (.xlsx ou .csv)"
								] })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: exportCsv,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "mr-2 h-4 w-4" }), " Exportar"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NewContactDialog, {})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Aceitamos planilhas do Excel/Google Sheets (",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ".xlsx" }),
					") e arquivos ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ".csv" }),
					" — não é preciso converter nada. No CSV, o separador (vírgula ou ponto e vírgula) e os acentos são detectados automaticamente. Colunas necessárias, em qualquer ordem: um nome (Nome Fantasia, Razão Social ou Nome) e um contato (WhatsApp, Telefone ou E-mail)."
				]
			}),
			importing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-4 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "font-medium",
							children: [
								"Importando: ",
								importProgress.done.toLocaleString("pt-BR"),
								" de",
								" ",
								(importProgress.total || 0).toLocaleString("pt-BR"),
								" contatos…"
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-muted-foreground",
							children: [
								importProgress.total ? Math.round(importProgress.done / importProgress.total * 100) : 0,
								"%",
								importProgress.inserted ? ` · ${importProgress.inserted.toLocaleString("pt-BR")} inseridos` : "",
								importProgress.skipped ? ` · ${importProgress.skipped.toLocaleString("pt-BR")} ignorados` : ""
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Progress, { value: importProgress.total ? importProgress.done / importProgress.total * 100 : 0 }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Não feche esta aba — o envio continua em lotes de 500 até concluir."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportBatchesCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex-1 min-w-[200px]",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: q,
							onChange: (e) => {
								setPage(0);
								setQ(e.target.value);
							},
							placeholder: "Buscar por nome, empresa, e-mail…",
							className: "pl-9"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: stage,
						onValueChange: (v) => {
							setPage(0);
							setStage(v);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-[220px]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: "all",
							children: "Todas as etapas"
						}), FUNNEL_STAGES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
							value: s.key,
							children: s.label
						}, s.key))] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: batch,
						onValueChange: (v) => {
							setPage(0);
							setBatch(v);
						},
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
							className: "w-[280px]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "all",
								children: "Todas as importações"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "none",
								children: "Cadastrados manualmente / WhatsApp"
							}),
							batchOptions.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem, {
								value: b.id,
								children: [
									b.file_name,
									" · ",
									formatDateTime(b.created_at)
								]
							}, b.id))
						] })]
					})
				]
			}),
			total > 0 && selected.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm text-muted-foreground",
					children: [
						"Filtro atual: ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-foreground",
							children: total.toLocaleString("pt-BR")
						}),
						" contato(s). Dá para excluir tudo de uma vez, sem precisar marcar página por página."
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "destructive",
						size: "sm",
						disabled: deleting,
						className: "gap-2",
						children: [
							deleting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loader, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }),
							"Excluir todos do filtro (",
							total.toLocaleString("pt-BR"),
							")"
						]
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
					"Excluir ",
					total.toLocaleString("pt-BR"),
					" contato(s) do filtro atual?"
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
					"Você está prestes a excluir ",
					total.toLocaleString("pt-BR"),
					" contato(s) e seus registros relacionados (atividades, agendamentos, pedidos de sábado). Eventos e tarefas permanecem, mas serão desvinculados dos contatos. As empresas não são excluídas. Esta ação não pode ser desfeita. Deseja continuar?"
				] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancelar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					onClick: removeAllFiltered,
					children: "Excluir tudo"
				})] })] })] })]
			}),
			selected.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex flex-wrap items-center justify-between gap-3 p-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: selected.length.toLocaleString("pt-BR") }), " contato(s) selecionado(s)"]
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
							children: [deleting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loader, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), "Excluir selecionados"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
						"Excluir ",
						selected.length,
						" contato(s)?"
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "Os contatos selecionados e seus registros relacionados (atividades, agendamentos, pedidos de sábado) serão excluídos permanentemente. Eventos e tarefas permanecem, mas serão desvinculados. As empresas não são excluídas. Esta ação não pode ser desfeita." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancelar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
						onClick: removeSelected,
						children: "Excluir"
					})] })] })] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
				className: "overflow-hidden",
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
									"aria-label": "Selecionar todos"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Nome"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Empresa"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "WhatsApp"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Etapa"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Importado em"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3",
								children: "Último contato"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "p-3" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tbody", { children: [
						isLoading && filtered.length === 0 && Array.from({ length: 12 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
							className: "border-t",
							children: Array.from({ length: 8 }).map((__, j) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-4 w-24" })
							}, j))
						}, i)),
						filtered.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
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
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 font-medium",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/crm/$id",
										params: { id: c.id },
										className: "hover:text-primary",
										children: c.name
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-muted-foreground",
									children: c.company_name ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-muted-foreground",
									children: c.whatsapp ?? "—"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
										variant: "secondary",
										children: FUNNEL_STAGES.find((s) => s.key === c.funnel_stage)?.label ?? c.funnel_stage
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-xs text-muted-foreground",
									children: formatDateTime(c.created_at)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-xs text-muted-foreground",
									children: formatDateTime(c.last_contact_at)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									className: "p-3 text-right",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WhatsAppQuickSend, {
										contactId: c.id,
										to: c.whatsapp,
										contactName: c.name
									})
								})
							]
						}, c.id)),
						!isLoading && filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
							colSpan: 8,
							className: "p-8 text-center text-muted-foreground",
							children: [
								"Nenhum contato encontrado com estes filtros. Crie um clicando em ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "Novo Cliente" }),
								"."
							]
						}) })
					] })]
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
			})
		]
	});
}
function NewContactDialog() {
	const qc = useQueryClient();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [form, setForm] = (0, import_react.useState)({ funnel_stage: "novo_lead" });
	async function save() {
		if (!form.name) return toast.error("Nome é obrigatório");
		const { error } = await supabase.from("contacts").insert(form);
		if (error) return toast.error(error.message);
		toast.success("Contato criado");
		setOpen(false);
		setForm({ funnel_stage: "novo_lead" });
		qc.invalidateQueries({ queryKey: ["contacts"] });
	}
	const upd = (k) => (e) => setForm({
		...form,
		[k]: e?.target?.value ?? e
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Novo Cliente"] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-2xl max-h-[85vh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Novo cliente" }) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 md:grid-cols-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nome *",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.name ?? "",
								onChange: upd("name")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Empresa",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.company_name ?? "",
								onChange: upd("company_name")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "WhatsApp",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.whatsapp ?? "",
								onChange: upd("whatsapp")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Telefone",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.phone ?? "",
								onChange: upd("phone")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "E-mail",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.email ?? "",
								onChange: upd("email")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Instagram",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.instagram ?? "",
								onChange: upd("instagram")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Cidade",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.city ?? "",
								onChange: upd("city")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Data de nascimento",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "date",
								value: form.birthdate ?? "",
								onChange: upd("birthdate")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Profissão",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.profession ?? "",
								onChange: upd("profession")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Filhos",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.children ?? "",
								onChange: upd("children")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Origem",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.origin ?? "",
								onValueChange: (v) => setForm({
									...form,
									origin: v
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Selecione…" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: ORIGENS.map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: o,
									children: o
								}, o)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Etapa do funil",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								value: form.funnel_stage,
								onValueChange: (v) => setForm({
									...form,
									funnel_stage: v
								}),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: FUNNEL_STAGES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: s.key,
									children: s.label
								}, s.key)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Serviço de interesse",
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: form.service_interest ?? "",
								onChange: upd("service_interest")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Objetivo",
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 2,
								value: form.goal ?? "",
								onChange: upd("goal")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Dor principal",
							className: "md:col-span-2",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 2,
								value: form.main_pain ?? "",
								onChange: upd("main_pain")
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
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
					onClick: () => setOpen(false),
					children: "Cancelar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: save,
					children: "Salvar"
				})] })
			]
		})]
	});
}
function Field({ label, children, className = "" }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `space-y-1.5 ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
			className: "text-xs",
			children: label
		}), children]
	});
}
var $$splitComponentImporter$8 = () => import("./empresas-CWrBCPg2.mjs");
var Route$10 = createFileRoute("/_authenticated/empresas")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
var $$splitComponentImporter$7 = () => import("./eva-D3jkIM0s.mjs");
var Route$9 = createFileRoute("/_authenticated/eva")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
var $$splitComponentImporter$6 = () => import("./funil-BwuBKJMe.mjs");
var Route$8 = createFileRoute("/_authenticated/funil")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
var $$splitComponentImporter$5 = () => import("./historico-CirpEn8r.mjs");
var Route$7 = createFileRoute("/_authenticated/historico")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
var $$splitComponentImporter$4 = () => import("./tarefas-B_3selXV.mjs");
var Route$6 = createFileRoute("/_authenticated/tarefas")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
var $$splitComponentImporter$3 = () => import("./usuarios-DCgjPEvn.mjs");
var Route$5 = createFileRoute("/_authenticated/usuarios")({
	component: lazyRouteComponent($$splitComponentImporter$3, "component"),
	head: () => ({ meta: [
		{ title: "Usuários e permissões · EVA IA" },
		{
			name: "description",
			content: "Gerencie quem acessa a EVA IA e o nível de permissão de cada pessoa da equipe."
		},
		{
			property: "og:title",
			content: "Usuários e permissões · EVA IA"
		},
		{
			property: "og:description",
			content: "Controle de acesso por usuário na central comercial EVA IA."
		},
		{
			property: "og:type",
			content: "website"
		},
		{
			name: "twitter:card",
			content: "summary"
		}
	] })
});
var $$splitComponentImporter$2 = () => import("./whatsapp-cXf-DtdJ.mjs");
var Route$4 = createFileRoute("/_authenticated/whatsapp")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
var $$splitComponentImporter$1 = () => import("./crm.index-CUxvcwi1.mjs");
var Route$3 = createFileRoute("/_authenticated/crm/")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./crm._id-CeY4n0U7.mjs");
var Route$2 = createFileRoute("/_authenticated/crm/$id")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
function pickSlot(settings) {
	const tz = settings.timezone || "America/Sao_Paulo";
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		weekday: "short",
		hour12: false
	}).formatToParts(/* @__PURE__ */ new Date());
	const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
	const nowMinutes = Number(get("hour")) * 60 + Number(get("minute"));
	const today = `${get("year")}-${get("month")}-${get("day")}`;
	const weekday = get("weekday");
	if (settings.weekdays_only && (weekday === "Sat" || weekday === "Sun")) return {
		slot: null,
		reason: "weekend"
	};
	const toMinutes = (hhmm) => {
		const [h, m] = (hhmm ?? "09:00").split(":");
		return Number(h) * 60 + Number(m ?? 0);
	};
	const sameLocalDay = (iso) => {
		if (!iso) return false;
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: tz,
			year: "numeric",
			month: "2-digit",
			day: "2-digit"
		}).format(new Date(iso)) === today;
	};
	const morning = toMinutes(settings.morning_time);
	const afternoon = toMinutes(settings.afternoon_time);
	const windowMin = 60;
	if (nowMinutes >= morning && nowMinutes < morning + windowMin && !sameLocalDay(settings.last_morning_run_at)) return {
		slot: "morning",
		reason: "ok"
	};
	if (nowMinutes >= afternoon && nowMinutes < afternoon + windowMin && !sameLocalDay(settings.last_afternoon_run_at)) return {
		slot: "afternoon",
		reason: "ok"
	};
	return {
		slot: null,
		reason: "out_of_window"
	};
}
var Route$1 = createFileRoute("/api/public/hooks/cadence-run")({ server: { handlers: { POST: async ({ request }) => {
	const apikey = request.headers.get("apikey");
	const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
	if (expected && apikey !== expected) return new Response(JSON.stringify({ error: "unauthorized" }), {
		status: 401,
		headers: { "content-type": "application/json" }
	});
	const { listCadenceSettings } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const { runCadenceBatch } = await import("./cadence-runner.server-BNvRE-Rw.mjs");
	const { runMeetingReminders } = await import("./scheduling.server-D_Wsh8N5.mjs");
	const all = await listCadenceSettings();
	const results = [];
	for (const settings of all) {
		const wid = settings.workspace_id;
		const entry = { workspaceId: wid };
		try {
			entry.reminders = await runMeetingReminders(wid);
		} catch (err) {
			entry.reminders_error = err instanceof Error ? err.message : String(err);
		}
		if (!settings.automation_enabled) {
			entry.skipped = "automation_disabled";
			results.push(entry);
			continue;
		}
		const { slot, reason } = pickSlot(settings);
		if (!slot) {
			entry.skipped = reason;
			results.push(entry);
			continue;
		}
		try {
			entry.run = await runCadenceBatch(wid, slot, settings.batch_size ?? 10);
		} catch (err) {
			entry.error = err instanceof Error ? err.message : String(err);
		}
		results.push(entry);
	}
	return Response.json({
		ok: true,
		workspaces: results.length,
		results
	});
} } } });
var Route = createFileRoute("/api/public/meta/webhook")({ server: { handlers: {
	GET: async ({ request }) => {
		const url = new URL(request.url);
		const mode = url.searchParams.get("hub.mode");
		const token = url.searchParams.get("hub.verify_token");
		const challenge = url.searchParams.get("hub.challenge");
		const { workspaceIdForVerifyToken } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
		const envToken = process.env.META_WA_VERIFY_TOKEN || "";
		const wsMatch = token ? await workspaceIdForVerifyToken(token) : null;
		if (mode === "subscribe" && Boolean(token) && (Boolean(wsMatch) || envToken && token === envToken) && challenge) return new Response(challenge, {
			status: 200,
			headers: { "content-type": "text/plain" }
		});
		return new Response("forbidden", { status: 403 });
	},
	POST: async ({ request }) => {
		const rawBody = await request.text();
		const signature = request.headers.get("x-hub-signature-256");
		let payload;
		try {
			payload = JSON.parse(rawBody);
		} catch {
			return new Response("invalid json", { status: 400 });
		}
		const { workspaceIdForPhoneNumberId, legacyWorkspaceId, wsDb } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
		const phoneNumberId = payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? "";
		const workspaceId = await workspaceIdForPhoneNumberId(String(phoneNumberId)) ?? await legacyWorkspaceId();
		if (!workspaceId) {
			console.warn("[webhook] nenhum workspace para phone_number_id", phoneNumberId);
			return new Response("ok", { status: 200 });
		}
		const { verifyMetaSignature } = await import("./whatsapp.server-Bx4h-P3h.mjs").then((n) => n.i).then((n) => n.i);
		const okSig = await verifyMetaSignature(workspaceId, rawBody, signature);
		if (signature && !okSig) return new Response("invalid signature", { status: 401 });
		const supabaseAdmin = await wsDb(workspaceId);
		const { findContactByPhone, logInbound } = await import("./messaging.server-Czbp4TxB.mjs");
		const { normalizePhoneNumber } = await import("./phone-06k09EE6.mjs").then((n) => n.n).then((n) => n.n);
		const now = (/* @__PURE__ */ new Date()).toISOString();
		console.log("[webhook] payload recebido");
		const debug = [];
		try {
			const entries = payload?.entry ?? [];
			for (const entry of entries) {
				const changes = entry?.changes ?? [];
				for (const change of changes) {
					const value = change?.value ?? {};
					const statuses = value?.statuses ?? [];
					for (const s of statuses) {
						const externalId = s?.id;
						const status = String(s?.status ?? "").toUpperCase();
						if (!externalId || !status) continue;
						console.log(`[webhook:status] ${externalId} -> ${status}`);
						await supabaseAdmin.from("activities").update({
							status,
							status_updated_at: now
						}).eq("external_id", externalId);
					}
					const messages = value?.messages ?? [];
					for (const m of messages) {
						const from = normalizePhoneNumber(String(m?.from ?? ""));
						const humanText = m?.text?.body ?? m?.button?.text ?? m?.interactive?.button_reply?.title ?? m?.interactive?.list_reply?.title;
						let text = humanText ?? `[${m?.type ?? "mensagem"}]`;
						let meaningful = Boolean(humanText && humanText.trim());
						const externalId = m?.id;
						let transcribed = false;
						const mediaId = m?.audio?.id ?? m?.voice?.id ?? (m?.type === "audio" ? m?.audio?.id : void 0);
						if ((m?.type === "audio" || m?.type === "voice") && mediaId) try {
							const { transcribeMetaAudio } = await import("./transcribe.server-iNcS7qer.mjs");
							const tr = await transcribeMetaAudio(workspaceId, String(mediaId));
							if (tr.ok && tr.text) {
								text = tr.text;
								transcribed = true;
								meaningful = true;
								debug.push(`audio_transcrito=${tr.text.length}`);
							} else {
								text = "[áudio recebido — não foi possível transcrever]";
								debug.push(`audio_erro=${tr.error ?? "desconhecido"}`);
								console.error("[webhook:audio] transcrição falhou", tr.error);
							}
						} catch (err) {
							text = "[áudio recebido — não foi possível transcrever]";
							debug.push(`audio_exception=${err instanceof Error ? err.message : String(err)}`);
						}
						console.log(`[webhook:in] from=${from} externalId=${externalId ?? "-"}`);
						let contact = await findContactByPhone(workspaceId, from);
						if (!contact && from) {
							const displayName = value?.contacts?.[0]?.profile?.name || `Contato novo · ${from}`;
							const { data: created } = await supabaseAdmin.from("contacts").insert({
								name: displayName,
								whatsapp: from,
								phone: from,
								funnel_stage: "novo_lead",
								status: "ativo",
								origin: "WhatsApp (entrada)",
								last_contact_at: now
							}).select("id, name, whatsapp, phone, cadence_active, cadence_day").maybeSingle();
							contact = created ?? void 0;
							console.log(`[webhook:in] contato criado automaticamente id=${contact?.id ?? "-"}`);
						}
						await logInbound({
							workspaceId,
							contactId: contact?.id ?? null,
							from,
							text: transcribed ? `🎤 Áudio transcrito: ${text}` : text,
							externalId,
							...transcribed ? { title: "Áudio recebido (transcrito)" } : {},
							...meaningful ? {} : {
								status: "UNSUPPORTED",
								title: "Mensagem não suportada (ignorada)"
							}
						});
						if (meaningful && contact?.id && contact.cadence_active) {
							await supabaseAdmin.from("contacts").update({ cadence_active: false }).eq("id", contact.id);
							await supabaseAdmin.from("activities").insert({
								contact_id: contact.id,
								kind: "cadence_stop",
								title: "Saiu da cadência (respondeu)",
								content: "Contato respondeu — cadência interrompida automaticamente."
							});
							console.log(`[webhook:in] cadência interrompida contact=${contact.id}`);
						}
						if (meaningful && contact?.id) try {
							const { routeInbound } = await import("./inbound-router.server-CBoGV8ym.mjs");
							const status = await routeInbound({
								workspaceId,
								contactId: contact.id,
								contactName: contact.name ?? "",
								phone: from,
								incomingText: text,
								cadenceDay: contact.cadence_day ?? 1,
								inboundActivityId: externalId
							});
							debug.push(`route=${status}`);
						} catch (err) {
							console.error("[eva inbound] failed", err);
							debug.push(`route_exception=${err instanceof Error ? err.message : String(err)}`);
						}
					}
				}
			}
		} catch (err) {
			console.error("[meta webhook] processing error", err);
			debug.push(`processing_error=${err instanceof Error ? err.message : String(err)}`);
		}
		if (request.headers.get("x-eva-debug") === "1") return new Response(JSON.stringify({
			ok: true,
			debug
		}), {
			status: 200,
			headers: { "content-type": "application/json" }
		});
		return new Response("ok", { status: 200 });
	}
} } });
var AuthenticatedRouteRoute = Route$19.update({
	id: "/_authenticated",
	getParentRoute: () => Route$20
});
var AuthRoute = Route$18.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$20
});
var PoliticaRoute = Route$17.update({
	id: "/politica",
	path: "/politica",
	getParentRoute: () => Route$20
});
var ResetPasswordRoute = Route$16.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => Route$20
});
var AuthenticatedIndexRoute = Route$15.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedAgendaRoute = Route$14.update({
	id: "/agenda",
	path: "/agenda",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCadenciasRoute = Route$13.update({
	id: "/cadencias",
	path: "/cadencias",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedConfiguracoesRoute = Route$12.update({
	id: "/configuracoes",
	path: "/configuracoes",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCrmRoute = Route$11.update({
	id: "/crm",
	path: "/crm",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedEmpresasRoute = Route$10.update({
	id: "/empresas",
	path: "/empresas",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedEvaRoute = Route$9.update({
	id: "/eva",
	path: "/eva",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedFunilRoute = Route$8.update({
	id: "/funil",
	path: "/funil",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedHistoricoRoute = Route$7.update({
	id: "/historico",
	path: "/historico",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedTarefasRoute = Route$6.update({
	id: "/tarefas",
	path: "/tarefas",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedUsuariosRoute = Route$5.update({
	id: "/usuarios",
	path: "/usuarios",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedWhatsappRoute = Route$4.update({
	id: "/whatsapp",
	path: "/whatsapp",
	getParentRoute: () => AuthenticatedRouteRoute
});
var AuthenticatedCrmIndexRoute = Route$3.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthenticatedCrmRoute
});
var AuthenticatedCrmIdRoute = Route$2.update({
	id: "/$id",
	path: "/$id",
	getParentRoute: () => AuthenticatedCrmRoute
});
var ApiPublicHooksCadenceRunRoute = Route$1.update({
	id: "/api/public/hooks/cadence-run",
	path: "/api/public/hooks/cadence-run",
	getParentRoute: () => Route$20
});
var ApiPublicMetaWebhookRoute = Route.update({
	id: "/api/public/meta/webhook",
	path: "/api/public/meta/webhook",
	getParentRoute: () => Route$20
});
var AuthenticatedCrmRouteChildren = {
	AuthenticatedCrmIdRoute,
	AuthenticatedCrmIndexRoute
};
var AuthenticatedRouteRouteChildren = {
	AuthenticatedAgendaRoute,
	AuthenticatedCadenciasRoute,
	AuthenticatedConfiguracoesRoute,
	AuthenticatedCrmRoute: AuthenticatedCrmRoute._addFileChildren(AuthenticatedCrmRouteChildren),
	AuthenticatedEmpresasRoute,
	AuthenticatedEvaRoute,
	AuthenticatedFunilRoute,
	AuthenticatedHistoricoRoute,
	AuthenticatedTarefasRoute,
	AuthenticatedUsuariosRoute,
	AuthenticatedWhatsappRoute,
	AuthenticatedIndexRoute
};
var rootRouteChildren = {
	AuthenticatedRouteRoute: AuthenticatedRouteRoute._addFileChildren(AuthenticatedRouteRouteChildren),
	AuthRoute,
	PoliticaRoute,
	ResetPasswordRoute,
	ApiPublicHooksCadenceRunRoute,
	ApiPublicMetaWebhookRoute
};
var routeTree = Route$20._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient();
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { Route$19 as i, Route$2 as n, CrmList as r, router_exports as t };
