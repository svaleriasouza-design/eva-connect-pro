import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { I as LoaderCircle, M as MessageCircle, W as FileSpreadsheet, b as Send, c as Undo2, u as Trash2, w as RotateCcw } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-Bk9pEsHD.mjs";
import { t as sendWhatsappMessageFn } from "./whatsapp.functions-DiM6LUQl.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { i as useAccess } from "./use-access-DH-CD7hW.mjs";
import { a as AlertDialogDescription, c as AlertDialogTitle, g as undoImportFn, h as restoreImportFn, i as AlertDialogContent, l as AlertDialogTrigger, m as purgeImportFn, n as AlertDialogAction, o as AlertDialogFooter, p as listImportBatchesFn, r as AlertDialogCancel, s as AlertDialogHeader, t as AlertDialog } from "./imports.functions-BHwH6ZNV.mjs";
import { t as require_papaparse } from "../_libs/papaparse.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/whatsapp-quick-send-D5k4-kVS.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function WhatsAppQuickSend({ contactId, to, contactName, defaultBody, size = "sm", variant = "outline", label }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [body, setBody] = (0, import_react.useState)(defaultBody ?? "");
	const [sending, setSending] = (0, import_react.useState)(false);
	const send = useServerFn(sendWhatsappMessageFn);
	const qc = useQueryClient();
	const cleaned = (to ?? "").replace(/\D/g, "");
	async function submit() {
		if (!cleaned) {
			toast.error("Contato sem WhatsApp cadastrado.");
			return;
		}
		if (!body.trim()) return;
		setSending(true);
		try {
			const res = await send({ data: {
				contactId,
				to: cleaned,
				body: body.trim()
			} });
			if (res.ok) {
				toast.success("Enviado via Meta Cloud API.");
				setOpen(false);
				qc.invalidateQueries();
			} else toast.error(res.error ?? "Falha no envio");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha no envio");
		} finally {
			setSending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
		size,
		variant,
		disabled: !cleaned,
		onClick: (e) => {
			e.stopPropagation();
			setBody(defaultBody ?? "");
			setOpen(true);
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-3.5 w-3.5" }), label && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ml-1",
			children: label
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			onClick: (e) => e.stopPropagation(),
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Enviar WhatsApp" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogDescription, { children: [
					"Envio pelo servidor (Meta Cloud API)",
					contactName ? ` — ${contactName}` : "",
					".",
					cleaned && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "ml-1 text-xs",
						children: ["Nº: ", cleaned]
					})
				] })] }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					rows: 6,
					value: body,
					onChange: (e) => setBody(e.target.value),
					placeholder: "Digite a mensagem…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => setOpen(false),
					disabled: sending,
					children: "Cancelar"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: submit,
					disabled: sending || !body.trim(),
					children: [sending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "mr-2 h-4 w-4" }), "Enviar"]
				})] })
			]
		})
	})] });
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/import-batches-card-BMBArryj.js
var import_papaparse = /* @__PURE__ */ __toESM(require_papaparse());
/** Normaliza cabeçalhos para comparação tolerante (acentos, espaços, maiúsculas). */
function normalizeHeader(s) {
	return String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_\-.]+/g, "");
}
/** Lê um valor da linha aceitando vários nomes possíveis de coluna. */
function pickField(row, keys) {
	for (const k of keys) {
		const found = Object.keys(row).find((rk) => normalizeHeader(rk) === normalizeHeader(k));
		const v = found ? row[found] : void 0;
		if (v != null && String(v).trim()) return String(v).trim();
	}
	return null;
}
function detectDelimiter(sample) {
	const firstLine = sample.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
	const counts = {
		";": (firstLine.match(/;/g) ?? []).length,
		",": (firstLine.match(/,/g) ?? []).length,
		"	": (firstLine.match(/\t/g) ?? []).length,
		"|": (firstLine.match(/\|/g) ?? []).length
	};
	const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
	return best && best[1] > 0 ? best[0] : ",";
}
/** Decodifica o arquivo como UTF-8; se os acentos vierem quebrados, tenta Windows-1252. */
function decodeText(buffer) {
	const utf8 = new TextDecoder("utf-8").decode(buffer);
	if (utf8.includes("�")) try {
		return new TextDecoder("windows-1252").decode(buffer);
	} catch {
		return utf8;
	}
	return utf8;
}
function isSupportedImportFile(file) {
	return /\.(csv|txt|xlsx|xlsm|xls)$/i.test(file.name);
}
/**
* Lê planilhas .xlsx/.xls e arquivos .csv (com detecção automática do separador
* e da codificação) e devolve as linhas como objetos por cabeçalho.
*/
async function readRowsFromFile(file) {
	if (/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
		const XLSX = await import("../_libs/xlsx.mjs").then((n) => n.t);
		const buffer = await file.arrayBuffer();
		const wb = XLSX.read(buffer, { type: "array" });
		const sheetName = wb.SheetNames[0];
		if (!sheetName) throw new Error("A planilha não possui nenhuma aba com dados.");
		const sheet = wb.Sheets[sheetName];
		const rows = XLSX.utils.sheet_to_json(sheet, {
			defval: "",
			raw: false
		});
		return {
			rows,
			headers: rows[0] ? Object.keys(rows[0]) : []
		};
	}
	const text = decodeText(await file.arrayBuffer());
	const delimiter = detectDelimiter(text.slice(0, 5e3));
	const result = import_papaparse.default.parse(text, {
		header: true,
		skipEmptyLines: true,
		delimiter
	});
	return {
		rows: Array.isArray(result.data) ? result.data : [],
		headers: (result.meta?.fields ?? []).filter(Boolean)
	};
}
/**
* Valida se a planilha tem as colunas mínimas (nome e um contato).
* A ordem das colunas não importa — só a existência.
*/
function validateLeadHeaders(headers) {
	const norm = headers.map(normalizeHeader);
	const has = (...aliases) => aliases.some((a) => norm.includes(normalizeHeader(a)));
	const hasName = has("Nome Fantasia", "Razao Social", "Razão Social", "nome", "name", "contato", "empresa", "company");
	const hasContact = has("Telefone1 Completo", "WhatsApp", "whatsapp", "Telefone", "phone", "celular", "E-mail", "Email", "email");
	if (!hasName && !hasContact) return `Não encontramos as colunas esperadas. A planilha precisa ter uma coluna de nome (Nome Fantasia, Razão Social ou Nome) e uma de contato (WhatsApp, Telefone ou E-mail). Colunas encontradas: ${headers.slice(0, 12).join(", ") || "nenhuma"}.`;
	if (!hasName) return "Falta a coluna de nome. Inclua uma coluna chamada Nome Fantasia, Razão Social ou Nome.";
	if (!hasContact) return "Falta a coluna de contato. Inclua uma coluna chamada WhatsApp, Telefone ou E-mail.";
	return null;
}
/** Normaliza um nome de empresa para deduplicação (case/acentos/espaços). */
function normalizeCompanyName(name) {
	return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
/**
* Garante que exista uma empresa para cada nome informado.
* Retorna um mapa nomeNormalizado -> id.
*/
async function ensureCompanies(names, extras = {}, importBatchId) {
	const uniques = Array.from(new Map(names.filter((n) => n && n.trim()).map((n) => [normalizeCompanyName(n), n.trim()])).entries());
	if (uniques.length === 0) return /* @__PURE__ */ new Map();
	const { data: existing } = await supabase.from("companies").select("id, name");
	const map = /* @__PURE__ */ new Map();
	const existingByNorm = /* @__PURE__ */ new Map();
	(existing ?? []).forEach((c) => existingByNorm.set(normalizeCompanyName(c.name ?? ""), c.id));
	const toInsert = [];
	for (const [norm, original] of uniques) {
		const id = existingByNorm.get(norm);
		if (id) map.set(norm, id);
		else {
			const extra = extras[norm] ?? {};
			toInsert.push({
				name: original,
				...extra,
				import_batch_id: importBatchId ?? null
			});
		}
	}
	if (toInsert.length > 0) {
		const BATCH = 500;
		for (let i = 0; i < toInsert.length; i += BATCH) {
			const chunk = toInsert.slice(i, i + BATCH);
			const { data: inserted } = await supabase.from("companies").insert(chunk).select("id, name");
			(inserted ?? []).forEach((c) => map.set(normalizeCompanyName(c.name ?? ""), c.id));
		}
	}
	return map;
}
function ImportBatchesCard() {
	const qc = useQueryClient();
	const { isAdmin } = useAccess();
	const [busy, setBusy] = (0, import_react.useState)(null);
	const listBatches = useServerFn(listImportBatchesFn);
	const undoImport = useServerFn(undoImportFn);
	const restoreImport = useServerFn(restoreImportFn);
	const purgeImport = useServerFn(purgeImportFn);
	const { data: batches = [] } = useQuery({
		queryKey: ["import-batches"],
		queryFn: async () => await listBatches()
	});
	function refresh() {
		return Promise.all([
			qc.invalidateQueries({ queryKey: ["import-batches"] }),
			qc.invalidateQueries({ queryKey: ["contacts-page"] }),
			qc.invalidateQueries({ queryKey: ["contacts-count"] }),
			qc.invalidateQueries({ queryKey: ["companies"] }),
			qc.invalidateQueries({ queryKey: ["funnel"] }),
			qc.invalidateQueries({ queryKey: ["dashboard"] })
		]);
	}
	async function run(id, fn, msg) {
		setBusy(id);
		try {
			await fn();
			await refresh();
			toast.success(msg);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
		} finally {
			setBusy(null);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		className: "p-4 space-y-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 text-sm font-medium",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileSpreadsheet, { className: "h-4 w-4" }), " Listas importadas"]
			}),
			batches.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Nenhuma planilha importada por aqui ainda. Listas antigas (importadas antes deste recurso) e contatos de teste podem ser removidos pelo filtro de importação abaixo: selecione as linhas na tabela e use",
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Excluir selecionados" }),
					"."
				]
			}),
			batches.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					"Importou por engano? Use ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Desfazer importação" }),
					" — os leads e empresas do lote saem das telas na hora, mas ficam guardados e podem ser restaurados. A exclusão definitiva é um segundo passo."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "divide-y text-sm",
				children: batches.map((b) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex flex-wrap items-center justify-between gap-2 py-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 truncate font-medium",
							children: [b.file_name, b.deleted_at && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "secondary",
								children: "Desfeita"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground",
							children: [
								b.inserted_rows.toLocaleString("pt-BR"),
								" leads · importada em ",
								formatDateTime(b.created_at),
								b.created_by_name ? ` · por ${b.created_by_name}` : "",
								b.deleted_at ? ` · desfeita em ${formatDateTime(b.deleted_at)}` : ""
							]
						})]
					}), !isAdmin ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted-foreground",
						children: "Somente administradores gerenciam listas."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [busy === b.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin self-center" }), b.deleted_at ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							size: "sm",
							disabled: busy === b.id,
							className: "gap-2",
							onClick: () => run(b.id, () => restoreImport({ data: { batchId: b.id } }), "Importação restaurada."),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), " Restaurar"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "destructive",
								size: "sm",
								disabled: busy === b.id,
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), " Excluir definitivamente"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
							"Excluir “",
							b.file_name,
							"” para sempre?"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [
							"Serão apagados ",
							b.inserted_rows.toLocaleString("pt-BR"),
							" leads, as empresas criadas por esta importação e todo o histórico de mensagens ligado a eles. Não há como desfazer."
						] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancelar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
							onClick: () => run(b.id, () => purgeImport({ data: { batchId: b.id } }), "Importação excluída."),
							children: "Excluir definitivamente"
						})] })] })] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								disabled: busy === b.id,
								className: "gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Undo2, { className: "h-4 w-4" }), " Desfazer importação"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogTitle, { children: [
							"Desfazer “",
							b.file_name,
							"”?"
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogDescription, { children: [b.inserted_rows.toLocaleString("pt-BR"), " leads e as empresas deste lote sairão do CRM, funil e cadências. Nada é apagado: você pode restaurar depois nesta mesma lista."] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Cancelar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
							onClick: () => run(b.id, () => undoImport({ data: { batchId: b.id } }), "Importação desfeita."),
							children: "Desfazer"
						})] })] })] })]
					})]
				}, b.id))
			})
		]
	});
}
//#endregion
export { pickField as a, WhatsAppQuickSend as c, normalizeCompanyName as i, ensureCompanies as n, readRowsFromFile as o, isSupportedImportFile as r, validateLeadHeaders as s, ImportBatchesCard as t };
