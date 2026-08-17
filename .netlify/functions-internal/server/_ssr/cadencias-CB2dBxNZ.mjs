import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { n as useServerFn, t as createSsrRpc } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, o as cn, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { A as Moon, C as Save, E as Plus, I as LoaderCircle, T as Rocket, f as Sun, h as Sparkles, p as SquareKanban, u as Trash2 } from "../_libs/lucide-react.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { t as Skeleton } from "./skeleton-D9W9wFsj.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cadencias-CB2dBxNZ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var getCadenceConfigFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("befeefa330923b71f17b6d70e947ba48bd2a2e2f7c1617800f1ca8e430c33d5f"));
var stepSchema = objectType({
	day: numberType().int().min(1).max(30),
	script: stringType().default(""),
	ai_instructions: stringType().default(""),
	active: booleanType().default(true)
});
var saveCadenceStepFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => stepSchema.parse(raw)).handler(createSsrRpc("6bc6281d96f26ca7147e63aba33a145b7f1c7bdb22a3df1683d3afc37da51195"));
var deleteCadenceStepFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({ day: numberType().int().min(1).max(30) }).parse(raw)).handler(createSsrRpc("724bda7c6aa35edbd00d31c5bcc7d8233387bce8db1df18d6d60a5a822accb80"));
var settingsSchema = objectType({
	morning_time: stringType().regex(/^\d{2}:\d{2}(:\d{2})?$/),
	afternoon_time: stringType().regex(/^\d{2}:\d{2}(:\d{2})?$/),
	batch_size: numberType().int().min(1).max(500),
	timezone: stringType().default("America/Sao_Paulo"),
	weekdays_only: booleanType(),
	auto_reply_enabled: booleanType(),
	automation_enabled: booleanType()
});
var saveCadenceSettingsFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => settingsSchema.parse(raw)).handler(createSsrRpc("168dee4f9e5f9e6d4a62bb4a7d4938976c3775c49917361360965ca4b3975e05"));
createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	contactIds: arrayType(stringType().uuid()).min(1).max(5e3),
	resetToDayZero: booleanType().default(true)
}).parse(raw)).handler(createSsrRpc("87a318cbd3cfe775436a72dde43ab3c4b3f442990fef43c6c88e027437152256"));
var startCadenceForAllEligibleFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("2e2f4112fbaec01d97a223c76b41d904f7a0c11541450410064109a0b94bdd62"));
var getCadenceStatsFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(createSsrRpc("32543015e2627274b96c4ef30b00d4507ee72b95119e19dbaf387508f5146ea4"));
var runCadenceNowFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => objectType({
	slot: enumType(["morning", "afternoon"]),
	batchSize: numberType().int().min(1).max(500).optional()
}).parse(raw)).handler(createSsrRpc("4946e41880276233dd51fa4ccefc805fe436b31f01e8b5dcff69ca2f4a4d9905"));
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var DEFAULT_SETTINGS = {
	morning_time: "09:00",
	afternoon_time: "15:00",
	batch_size: 10,
	timezone: "America/Sao_Paulo",
	weekdays_only: true,
	auto_reply_enabled: true,
	automation_enabled: false,
	last_morning_run_at: null,
	last_afternoon_run_at: null
};
function Cadencias() {
	const qc = useQueryClient();
	const getConfig = useServerFn(getCadenceConfigFn);
	const saveStep = useServerFn(saveCadenceStepFn);
	const deleteStep = useServerFn(deleteCadenceStepFn);
	const saveSettings = useServerFn(saveCadenceSettingsFn);
	const runNow = useServerFn(runCadenceNowFn);
	const startAll = useServerFn(startCadenceForAllEligibleFn);
	const getStats = useServerFn(getCadenceStatsFn);
	const { data, isLoading } = useQuery({
		queryKey: ["cadence-config"],
		queryFn: () => getConfig()
	});
	const { data: stats } = useQuery({
		queryKey: ["cadence-stats"],
		queryFn: () => getStats(),
		refetchInterval: 1e4
	});
	const [settings, setSettings] = (0, import_react.useState)(DEFAULT_SETTINGS);
	const [savingSettings, setSavingSettings] = (0, import_react.useState)(false);
	const [running, setRunning] = (0, import_react.useState)(null);
	const [starting, setStarting] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (data?.settings) setSettings({
			...DEFAULT_SETTINGS,
			...data.settings
		});
	}, [data?.settings]);
	const steps = (0, import_react.useMemo)(() => data?.steps ?? [], [data?.steps]);
	const nextDay = (steps.length ? Math.max(...steps.map((s) => s.day)) : 0) + 1;
	async function persistStep(step) {
		await saveStep({ data: step });
		await qc.invalidateQueries({ queryKey: ["cadence-config"] });
	}
	async function addDay() {
		const day = Math.min(30, nextDay);
		await persistStep({
			day,
			script: "",
			ai_instructions: "",
			active: true
		});
		toast.success(`Dia ${day} adicionado`);
	}
	async function removeDay(day) {
		if (!confirm(`Remover o Dia ${day}?`)) return;
		await deleteStep({ data: { day } });
		await qc.invalidateQueries({ queryKey: ["cadence-config"] });
		toast.success(`Dia ${day} removido`);
	}
	async function submitSettings() {
		await persistSettings(settings);
	}
	async function toggleAutomation(v) {
		const next = {
			...settings,
			automation_enabled: v
		};
		setSettings(next);
		if (!await persistSettings(next, v ? "Rotina automática ativada" : "Rotina automática pausada")) setSettings(settings);
	}
	async function persistSettings(value, message = "Configurações salvas") {
		setSavingSettings(true);
		try {
			const { last_morning_run_at, last_afternoon_run_at, ...payload } = value;
			await saveSettings({ data: payload });
			toast.success(message);
			await qc.invalidateQueries({ queryKey: ["cadence-config"] });
			return true;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao salvar");
			return false;
		} finally {
			setSavingSettings(false);
		}
	}
	async function triggerBatch(slot) {
		setRunning(slot);
		try {
			const res = await runNow({ data: { slot } });
			const label = slot === "morning" ? "manhã" : "tarde";
			if (res.attempted === 0) toast.warning(`Lote ${label}: nenhum contato elegível. Clique em "Iniciar cadência para todos os leads" para ativar os novos leads.`, { duration: 6e3 });
			else if (res.sent === 0) toast.error(`Lote ${label}: 0/${res.attempted} enviados · ${res.failed} falhas · ${res.skipped} pulados. ${res.errors[0] ?? ""}`, { duration: 8e3 });
			else toast.success(`Lote ${label}: ${res.sent}/${res.attempted} enviados · ${res.failed} falhas · ${res.skipped} pulados`);
			if (res.errors.length) console.warn("[cadence] errors", res.errors);
			await qc.invalidateQueries();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao rodar lote");
		} finally {
			setRunning(null);
		}
	}
	async function onStartAll() {
		if (!confirm(`Iniciar a cadência para todos os leads elegíveis (${stats?.eligible ?? "?"} contatos)? Isso ativa o disparo automático nos horários configurados.`)) return;
		setStarting(true);
		try {
			const res = await startAll({ data: void 0 });
			toast.success(`${res.activated} contatos entraram na cadência.`);
			await qc.invalidateQueries({ queryKey: ["cadence-stats"] });
			await qc.invalidateQueries();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao iniciar cadência");
		} finally {
			setStarting(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SquareKanban, { className: "h-6 w-6 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "Cadências"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Scripts por dia, respostas automáticas da EVA e disparos em lote (manhã/tarde)."
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-4 lg:grid-cols-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "lg:col-span-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
						className: "flex-row items-center justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
							className: "text-base",
							children: "Automação"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
							variant: settings.automation_enabled ? "default" : "secondary",
							children: settings.automation_enabled ? "Ativa" : "Pausada"
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
						className: "grid gap-4 md:grid-cols-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "md:col-span-2 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold",
												children: stats?.active ?? "…"
											}),
											" na cadência ·",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold",
												children: stats?.eligible ?? "…"
											}),
											" elegíveis ·",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold",
												children: stats?.blocked ?? "…"
											}),
											" bloqueados"
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										size: "sm",
										onClick: onStartAll,
										disabled: starting || (stats?.eligible ?? 0) === 0,
										children: [starting ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Rocket, { className: "mr-1 h-4 w-4" }), "Iniciar cadência para todos os leads elegíveis"]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Horário do lote da MANHÃ"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "time",
								value: settings.morning_time.slice(0, 5),
								onChange: (e) => setSettings({
									...settings,
									morning_time: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Horário do lote da TARDE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "time",
								value: settings.afternoon_time.slice(0, 5),
								onChange: (e) => setSettings({
									...settings,
									afternoon_time: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Tamanho do lote (contatos por disparo)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								type: "number",
								min: 1,
								max: 500,
								value: settings.batch_size,
								onChange: (e) => setSettings({
									...settings,
									batch_size: Math.max(1, Number(e.target.value) || 1)
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-xs",
								children: "Fuso horário"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: settings.timezone,
								onChange: (e) => setSettings({
									...settings,
									timezone: e.target.value
								})
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-md border p-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "Somente dias úteis"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "Pular sábado e domingo"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: settings.weekdays_only,
									onCheckedChange: (v) => setSettings({
										...settings,
										weekdays_only: v
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-md border p-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "EVA responde automaticamente"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "Usa as instruções cadastradas por dia"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: settings.auto_reply_enabled,
									onCheckedChange: (v) => setSettings({
										...settings,
										auto_reply_enabled: v
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-md border p-3 text-sm md:col-span-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-medium",
									children: "Ativar rotina automática"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-xs text-muted-foreground",
									children: "Dispara os lotes manhã/tarde nos horários configurados. A mudança é salva na hora."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
									checked: settings.automation_enabled,
									disabled: savingSettings,
									onCheckedChange: (v) => toggleAutomation(v)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 md:col-span-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										onClick: submitSettings,
										disabled: savingSettings,
										children: [savingSettings ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-2 h-4 w-4" }), "Salvar configurações"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "flex-1" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										onClick: () => triggerBatch("morning"),
										disabled: running !== null,
										children: [running === "morning" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "mr-2 h-4 w-4" }), "Rodar lote manhã agora"]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
										variant: "outline",
										onClick: () => triggerBatch("afternoon"),
										disabled: running !== null,
										children: [running === "afternoon" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "mr-2 h-4 w-4" }), "Rodar lote tarde agora"]
									})
								]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-base",
					children: "Como funciona"
				}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
					className: "text-sm text-muted-foreground space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "1. Configure os scripts de cada dia da cadência abaixo." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"2. Para cada dia, escreva as ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: "instruções" }),
							" que a EVA deve seguir ao responder o cliente (ex.: \"Se pedir preço, ofereça reunião\")."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
							"3. Ative um contato na cadência (botão \"Iniciar cadência\" no CRM). O sistema dispara ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: settings.batch_size }),
							" mensagens de manhã e ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { children: settings.batch_size }),
							" à tarde."
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "4. Quando o cliente responde, a EVA lê a instrução do dia atual e responde sozinha — a cadência para automaticamente." }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs",
							children: "Envio 100% via Meta Cloud API. Nenhuma janela do WhatsApp Web é aberta."
						})
					]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, {
				className: "flex-row items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, {
					className: "text-base",
					children: "Scripts e treinamento por dia"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: addDay,
					disabled: nextDay > 30,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-1 h-4 w-4" }),
						" Adicionar dia ",
						Math.min(30, nextDay)
					]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardContent, {
				className: "space-y-4",
				children: [
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-3",
						children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-32 w-full" }, i))
					}),
					!isLoading && steps.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground",
						children: "Nenhum dia cadastrado. Clique em \"Adicionar dia 1\" para começar."
					}),
					steps.map((step) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StepEditor, {
						step,
						onSave: persistStep,
						onDelete: () => removeDay(step.day)
					}, step.day))
				]
			})] })
		]
	});
}
function StepEditor({ step, onSave, onDelete }) {
	const [script, setScript] = (0, import_react.useState)(step.script);
	const [instructions, setInstructions] = (0, import_react.useState)(step.ai_instructions);
	const [active, setActive] = (0, import_react.useState)(step.active);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setScript(step.script);
		setInstructions(step.ai_instructions);
		setActive(step.active);
	}, [
		step.day,
		step.script,
		step.ai_instructions,
		step.active
	]);
	async function submit() {
		setSaving(true);
		try {
			await onSave({
				day: step.day,
				script,
				ai_instructions: instructions,
				active
			});
			toast.success(`Dia ${step.day} salvo`);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Falha ao salvar");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-lg border p-4 space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: active ? "default" : "secondary",
					children: ["Dia ", step.day]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "flex items-center gap-2 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
						checked: active,
						onCheckedChange: setActive
					}), " Ativo"]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					size: "sm",
					variant: "ghost",
					onClick: onDelete,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					onClick: submit,
					disabled: saving,
					children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-1 h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "mr-1 h-4 w-4" }), " Salvar"]
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid gap-3 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
					className: "text-xs",
					children: "Mensagem enviada neste dia"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					rows: 6,
					value: script,
					onChange: (e) => setScript(e.target.value),
					placeholder: "Use {{nome}} para o primeiro nome do contato…"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-1 text-[11px] text-muted-foreground",
					children: ["Variáveis: ", "{{nome}}"]
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
					className: "text-xs flex items-center gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 text-[color:var(--gold)]" }), " Instruções para a EVA responder"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					rows: 6,
					value: instructions,
					onChange: (e) => setInstructions(e.target.value),
					placeholder: "Ex.: Se o cliente perguntar preço, diga que enviaremos a proposta e proponha reunião de 15 min. Se pedir para não receber mais, encerre educadamente."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-1 text-[11px] text-muted-foreground",
					children: "A EVA usa estas regras quando o cliente responde neste dia."
				})
			] })]
		})]
	});
}
//#endregion
export { Cadencias as component };
