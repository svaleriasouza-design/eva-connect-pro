import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { n as useServerFn, t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { C as Save, D as PlugZap, G as Eye, I as LoaderCircle, J as Copy, K as EyeOff, Q as CircleCheck, X as CircleX, b as Send, g as Shuffle, ot as CalendarCheck } from "../_libs/lucide-react.mjs";
import { a as objectType, o as stringType } from "../_libs/zod.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as useWorkspace, t as saveWorkspaceFn } from "./use-workspace-n7F-1Rfj.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as suggestSlotsFn, n as getCalendarStatusFn } from "./calendar.functions-6CDk9ktk.mjs";
import { t as normalizePhoneNumber } from "./phone-06k09EE6.mjs";
import { i as useAccess } from "./use-access-DH-CD7hW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/configuracoes-c6I-xccc.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var saveSchema = objectType({
	phone_number_id: stringType().trim().max(64).optional().nullable(),
	access_token: stringType().trim().max(4096).optional().nullable(),
	app_secret: stringType().trim().max(512).optional().nullable(),
	verify_token: stringType().trim().max(256).optional().nullable(),
	graph_version: stringType().trim().max(16).optional().nullable(),
	default_template_name: stringType().trim().max(128).optional().nullable(),
	default_template_lang: stringType().trim().max(16).optional().nullable()
});
var testSendSchema = objectType({
	to: stringType().min(6),
	body: stringType().min(1).max(1e3)
});
var getMetaSettingsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("43a4c05023f0de8b4662cd5d6c17472e7376515bb40b6a2dcb29512f3c5313d9"));
var saveMetaSettingsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => saveSchema.parse(data)).handler(createSsrRpc("744770ddce0ae6952190a7da68e93cb4fb4398938fe502890d51243ceb16b841"));
var testMetaConnectionFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("e9244bf2cfc50d7b14327d925a4b0a8c42baefd4601a231223c1388aed4b4ce0"));
var sendTestMessageFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((data) => {
	const parsed = testSendSchema.safeParse(data);
	if (!parsed.success) return {
		__invalid: true,
		error: parsed.error.issues[0]?.message ?? "Dados inválidos."
	};
	return parsed.data;
}).handler(createSsrRpc("ea08e9a2a1628a1e6e6401fde41ed4b328e88234049a33771375ad287996676d"));
function GoogleCalendarCard() {
	const statusFn = useServerFn(getCalendarStatusFn);
	const slotsFn = useServerFn(suggestSlotsFn);
	const [slots, setSlots] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const { data, isLoading, refetch } = useQuery({
		queryKey: ["calendar-status"],
		queryFn: () => statusFn()
	});
	async function testSlots() {
		setLoading(true);
		try {
			const res = await slotsFn({ data: { duration: 30 } });
			if (res.ok) {
				setSlots(res.slots);
				toast.success(`${res.slots.length} horário(s) livre(s) encontrados`);
			} else toast.error(res.error);
		} finally {
			setLoading(false);
		}
	}
	const connected = Boolean(data && data.connected);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
		className: "flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CalendarCheck, { className: "h-4 w-4" }), " Google Calendar"]
	}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-3 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : connected ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4 text-destructive" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: isLoading ? "Verificando conexão…" : connected ? `Conectado · agenda "${data.calendar}"` : data?.error ?? "Não conectado" })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Com a agenda conectada, a EVA consulta a disponibilidade em tempo real, cria eventos com Google Meet, envia o convite por e-mail e mantém Agenda, CRM e Histórico sincronizados."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "outline",
					onClick: () => refetch(),
					children: "Revalidar conexão"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: testSlots,
					disabled: loading || !connected,
					children: [loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-3 w-3 animate-spin" }), " Testar disponibilidade"]
				})]
			}),
			slots && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-md border p-3 text-xs",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "font-medium mb-1",
					children: "Próximos horários livres (30 min)"
				}), slots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-muted-foreground",
					children: "Nenhum horário livre nos próximos 7 dias úteis."
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "space-y-0.5",
					children: slots.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: new Intl.DateTimeFormat("pt-BR", {
						timeZone: "America/Sao_Paulo",
						weekday: "long",
						day: "2-digit",
						month: "2-digit",
						hour: "2-digit",
						minute: "2-digit"
					}).format(new Date(s)) }, s))
				})]
			})
		]
	})] });
}
function WorkspaceCard() {
	const { workspace, loading } = useWorkspace();
	const { isAdmin } = useAccess();
	const qc = useQueryClient();
	const save = useServerFn(saveWorkspaceFn);
	const [name, setName] = (0, import_react.useState)("");
	const [tagline, setTagline] = (0, import_react.useState)("");
	const [owner, setOwner] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!loading) {
			setName(workspace.name);
			setTagline(workspace.tagline);
			setOwner(workspace.owner_name);
		}
	}, [
		loading,
		workspace.name,
		workspace.tagline,
		workspace.owner_name
	]);
	async function onSave() {
		if (name.trim().length < 2) {
			toast.error("Informe um nome de workspace válido.");
			return;
		}
		setSaving(true);
		try {
			const res = await save({ data: {
				name: name.trim(),
				tagline: tagline.trim(),
				owner_name: owner.trim()
			} });
			if (!res.ok) throw new Error(res.error ?? "Falha ao salvar.");
			await qc.invalidateQueries({ queryKey: ["workspace"] });
			toast.success("Nome do workspace atualizado.");
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Identidade do workspace" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
		className: "space-y-4 text-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ws-name",
						children: "Nome do Workspace"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "ws-name",
						value: name,
						onChange: (e) => setName(e.target.value),
						disabled: !isAdmin,
						placeholder: "Ex.: Minha Empresa"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Aparece no cabeçalho, menu lateral, dashboard, título do navegador e nas mensagens da EVA."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 md:grid-cols-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ws-tagline",
						children: "Subtítulo"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "ws-tagline",
						value: tagline,
						onChange: (e) => setTagline(e.target.value),
						disabled: !isAdmin,
						placeholder: "Assistente Executiva"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ws-owner",
						children: "Responsável"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "ws-owner",
						value: owner,
						onChange: (e) => setOwner(e.target.value),
						disabled: !isAdmin,
						placeholder: "Nome de quem usa a EVA"
					})]
				})]
			}),
			!isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground",
				children: "Somente administradores podem alterar estes dados."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				onClick: onSave,
				disabled: !isAdmin || saving,
				className: "gap-2",
				children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), " Salvar"]
			})
		]
	})] });
}
var EMPTY = {
	phone_number_id: "",
	access_token: "",
	app_secret: "",
	verify_token: "",
	graph_version: "v21.0",
	default_template_name: "hello_world",
	default_template_lang: "en_US"
};
function randomToken(len = 32) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = new Uint8Array(len);
	crypto.getRandomValues(bytes);
	let out = "";
	for (let i = 0; i < len; i++) out += alphabet[bytes[i] % 62];
	return out;
}
function Configs() {
	const qc = useQueryClient();
	const getFn = useServerFn(getMetaSettingsFn);
	const saveFn = useServerFn(saveMetaSettingsFn);
	const testFn = useServerFn(testMetaConnectionFn);
	const sendTestFn = useServerFn(sendTestMessageFn);
	const { data, isLoading } = useQuery({
		queryKey: ["meta-settings"],
		queryFn: () => getFn()
	});
	const [form, setForm] = (0, import_react.useState)(EMPTY);
	const [show, setShow] = (0, import_react.useState)({
		access: false,
		secret: false
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [testing, setTesting] = (0, import_react.useState)(false);
	const [testTo, setTestTo] = (0, import_react.useState)("");
	const [testBody, setTestBody] = (0, import_react.useState)("Mensagem de teste da EVA · Meta Cloud API ✅");
	const [sendingTest, setSendingTest] = (0, import_react.useState)(false);
	const [lastTest, setLastTest] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (data) setForm({
			phone_number_id: data.phone_number_id || "",
			access_token: data.access_token || "",
			app_secret: data.app_secret || "",
			verify_token: data.verify_token || "",
			graph_version: data.graph_version || "v21.0",
			default_template_name: data.default_template_name || "hello_world",
			default_template_lang: data.default_template_lang || "en_US"
		});
	}, [data]);
	const origin = typeof window === "undefined" ? "" : window.location.origin;
	const webhookUrl = !origin || origin.includes("id-preview") || origin.includes("localhost") || origin.includes("127.0.0.1") ? "https://eva-connect-pro.lovable.app/api/public/meta/webhook" : `${origin}/api/public/meta/webhook`;
	const status = (0, import_react.useMemo)(() => ({
		phone: form.phone_number_id.trim().length > 0,
		access: form.access_token.trim().length > 0,
		secret: form.app_secret.trim().length > 0,
		verify: form.verify_token.trim().length > 0
	}), [form]);
	function set(k, v) {
		setForm((f) => ({
			...f,
			[k]: v
		}));
	}
	async function copy(v) {
		await navigator.clipboard.writeText(v);
		toast.success("Copiado");
	}
	async function onSave() {
		setSaving(true);
		const res = await saveFn({ data: form });
		setSaving(false);
		if (res.ok) {
			toast.success("Configurações salvas");
			qc.invalidateQueries({ queryKey: ["meta-settings"] });
			qc.invalidateQueries({ queryKey: ["meta-config"] });
		} else toast.error(res.error || "Falha ao salvar");
	}
	async function onTest() {
		setTesting(true);
		const res = await testFn();
		setTesting(false);
		if (res.ok) toast.success(`Conexão OK · ${res.name ?? ""} ${res.phone ? `(${res.phone})` : ""}`.trim());
		else toast.error(res.error || "Falha no teste");
	}
	async function onSendTest() {
		setSendingTest(true);
		try {
			let res = null;
			try {
				res = await sendTestFn({ data: {
					to: testTo,
					body: testBody
				} });
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				setLastTest({
					ok: false,
					info: `Erro de rede/servidor: ${msg}`
				});
				toast.error(`Erro de rede/servidor: ${msg}`);
				return;
			}
			if (res?.ok) {
				setLastTest({
					ok: true,
					info: `Enviado para ${res?.to ?? "—"} · ID ${res?.messageId ?? "—"}`
				});
				toast.success("Mensagem de teste enviada");
			} else {
				const info = res?.error || "Falha no envio";
				setLastTest({
					ok: false,
					info
				});
				toast.error(info);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			setLastTest({
				ok: false,
				info: `Exceção: ${msg}`
			});
			toast.error(`Exceção: ${msg}`);
		} finally {
			setSendingTest(false);
		}
	}
	const testToNormalized = (0, import_react.useMemo)(() => normalizePhoneNumber(testTo), [testTo]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-3xl space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold",
				children: "Configurações"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted-foreground",
				children: "Credenciais e integrações."
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WorkspaceCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleCalendarCard, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "WhatsApp — Meta Cloud API" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border p-3 space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-medium",
							children: "Status da integração"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "space-y-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
									ok: status.phone,
									label: "ID do Número de Telefone"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
									ok: status.access,
									label: "Token de Acesso Permanente"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
									ok: status.secret,
									label: "App Secret (validação de assinatura)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusLine, {
									ok: status.verify,
									label: "Token de Verificação do Webhook"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "text-xs text-muted-foreground pl-6",
									children: ["Graph API: ", form.graph_version || "v21.0"]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-md border p-3 space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium",
								children: "URL do Webhook (colar no painel Meta)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", {
									className: "flex-1 rounded bg-muted px-2 py-1 text-xs break-all",
									children: webhookUrl
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									size: "sm",
									variant: "outline",
									onClick: () => copy(webhookUrl),
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" })
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: [
									"No painel Meta → Configuração do WhatsApp → Webhook, use esta URL e o mesmo Token de Verificação abaixo. Assine o campo ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "messages" }),
									"."
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "phone",
									children: "ID do Número de Telefone"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "phone",
									name: "phone-eva",
									autoComplete: "off",
									autoCorrect: "off",
									spellCheck: false,
									"data-1p-ignore": true,
									"data-lpignore": "true",
									placeholder: "Ex.: 1234567890",
									value: form.phone_number_id,
									onChange: (e) => set("phone_number_id", e.target.value),
									disabled: isLoading
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "access",
									children: "Token de Acesso Permanente"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "access",
										name: "access-eva",
										autoComplete: "new-password",
										autoCorrect: "off",
										spellCheck: false,
										"data-1p-ignore": true,
										"data-lpignore": "true",
										type: show.access ? "text" : "password",
										placeholder: "EAAG...",
										value: form.access_token,
										onChange: (e) => set("access_token", e.target.value),
										disabled: isLoading
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "outline",
										size: "icon",
										onClick: () => setShow((s) => ({
											...s,
											access: !s.access
										})),
										children: show.access ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "secret",
									children: "App Secret"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "secret",
										name: "secret-eva",
										autoComplete: "new-password",
										autoCorrect: "off",
										spellCheck: false,
										"data-1p-ignore": true,
										"data-lpignore": "true",
										type: show.secret ? "text" : "password",
										placeholder: "App Secret do app Meta",
										value: form.app_secret,
										onChange: (e) => set("app_secret", e.target.value),
										disabled: isLoading
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
										type: "button",
										variant: "outline",
										size: "icon",
										onClick: () => setShow((s) => ({
											...s,
											secret: !s.secret
										})),
										children: show.secret ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "verify",
									children: "Token de Verificação do Webhook"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											id: "verify",
											name: "verify-eva",
											autoComplete: "off",
											autoCorrect: "off",
											spellCheck: false,
											"data-1p-ignore": true,
											"data-lpignore": "true",
											placeholder: "String que você define",
											value: form.verify_token,
											onChange: (e) => set("verify_token", e.target.value),
											disabled: isLoading
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
											type: "button",
											variant: "outline",
											onClick: () => set("verify_token", randomToken(32)),
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shuffle, { className: "mr-1 h-4 w-4" }), " Gerar"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											type: "button",
											variant: "outline",
											size: "icon",
											onClick: () => copy(form.verify_token),
											disabled: !form.verify_token,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" })
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "ver",
									children: "Versão da Graph API"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "ver",
									placeholder: "v21.0",
									value: form.graph_version,
									onChange: (e) => set("graph_version", e.target.value),
									disabled: isLoading
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "tplname",
										children: "Template padrão (janela de 24h fechada)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										id: "tplname",
										placeholder: "hello_world",
										value: form.default_template_name,
										onChange: (e) => set("default_template_name", e.target.value),
										disabled: isLoading
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "Nome exato de um template aprovado na Meta. É usado automaticamente quando o contato não respondeu nas últimas 24h."
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "tpllang",
									children: "Idioma do template"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "tpllang",
									placeholder: "en_US ou pt_BR",
									value: form.default_template_lang,
									onChange: (e) => set("default_template_lang", e.target.value),
									disabled: isLoading
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: onSave,
							disabled: saving || isLoading,
							children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-2 h-4 w-4" }), "Salvar configurações"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							onClick: onTest,
							disabled: testing || isLoading || !status.phone || !status.access,
							children: [testing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PlugZap, { className: "mr-2 h-4 w-4" }), "Testar conexão"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Salve primeiro para que o teste use os valores atualizados. As credenciais ficam armazenadas no backend do app e nunca são expostas no frontend."
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Diagnóstico Meta · Enviar mensagem de teste" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-3 text-sm",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "Envia uma mensagem real via Meta Cloud API para validar credenciais, normalização de número (DDI 55 automático) e roteamento. Nenhum navegador é aberto."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-3 md:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "test-to",
									children: "Número (com DDD)"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "test-to",
									placeholder: "11 99999-9999",
									value: testTo,
									onChange: (e) => setTestTo(e.target.value)
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "text-[11px] text-muted-foreground",
									children: ["Enviaremos para: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: testToNormalized || "—" })]
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "test-body",
								children: "Mensagem"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								id: "test-body",
								value: testBody,
								onChange: (e) => setTestBody(e.target.value)
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: onSendTest,
							disabled: sendingTest || !testToNormalized || !testBody.trim(),
							children: [sendingTest ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "mr-2 h-4 w-4" }), "Enviar mensagem de teste"]
						}), lastTest && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: `text-xs ${lastTest.ok ? "text-green-600" : "text-destructive"}`,
							children: [lastTest.ok ? "✅ " : "⚠ ", lastTest.info]
						})]
					})
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Sobre a EVA" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "text-sm text-muted-foreground space-y-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "EVA responde em português, aprende com o contexto do CRM e sugere a Próxima Melhor Ação em cada ficha de cliente." }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Powered by Lovable AI · Gemini 2.5 Flash." })]
			})] })
		]
	});
}
function StatusLine({ ok, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
		className: "flex items-center gap-2",
		children: [ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 text-green-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, { className: "h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: ok ? "" : "text-muted-foreground",
			children: label
		})]
	});
}
//#endregion
export { Configs as component };
