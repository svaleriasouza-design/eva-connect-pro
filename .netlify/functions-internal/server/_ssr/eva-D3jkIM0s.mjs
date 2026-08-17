import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { b as Send, h as Sparkles } from "../_libs/lucide-react.mjs";
import { n as useWorkspace } from "./use-workspace-n7F-1Rfj.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Textarea } from "./textarea-kko37XEX.mjs";
import { t as askEva } from "./eva.functions-CEGVFw1L.mjs";
import { t as EvaMarkdown } from "./eva-markdown-DNx4dbdQ.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eva-D3jkIM0s.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function EvaPage() {
	const { workspace } = useWorkspace();
	const [messages, setMessages] = (0, import_react.useState)([{
		role: "assistant",
		content: "Olá. Estou pronta para te ajudar. Posso resumir conversas, criar propostas, escrever e-mails, preparar reuniões e sugerir a próxima melhor ação. O que você precisa agora?"
	}]);
	const [input, setInput] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const ask = useServerFn(askEva);
	async function send() {
		if (!input.trim() || loading) return;
		const next = [...messages, {
			role: "user",
			content: input.trim()
		}];
		setMessages(next);
		setInput("");
		setLoading(true);
		try {
			const res = await ask({ data: { messages: next } });
			setMessages([...next, {
				role: "assistant",
				content: res.text
			}]);
		} catch {
			toast.error("EVA falhou");
		} finally {
			setLoading(false);
		}
	}
	const suggestions = [
		"Qual o resumo da cadência?",
		"Tenho reuniões hoje?",
		"Quantas empresas foram contatadas?",
		"Resuma minha semana comercial",
		"Escreva um e-mail de follow-up após reunião",
		`Crie uma proposta para uma consultoria da ${workspace.name}`,
		"Quais clientes devo priorizar hoje?"
	];
	async function sendText(text) {
		if (loading) return;
		const next = [...messages, {
			role: "user",
			content: text
		}];
		setMessages(next);
		setInput("");
		setLoading(true);
		try {
			const res = await ask({ data: { messages: next } });
			setMessages([...next, {
				role: "assistant",
				content: res.text
			}]);
		} catch {
			toast.error("EVA falhou");
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 max-w-3xl mx-auto space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--petrol)] text-[color:var(--gold)]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-semibold",
					children: "EVA"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "text-sm text-muted-foreground",
					children: ["Assistente executiva com IA · ", workspace.name]
				})] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-2",
				children: suggestions.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => sendText(s),
					disabled: loading,
					className: "rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50",
					children: s
				}, s))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "p-4 space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto",
				children: [messages.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "ml-auto whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-muted"}`,
					children: m.role === "user" ? m.content : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EvaMarkdown, { children: m.content })
				}, i)), loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-xs text-muted-foreground",
					children: "EVA está pensando…"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-end gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
					value: input,
					onChange: (e) => setInput(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							send();
						}
					},
					placeholder: "Escreva para EVA…",
					rows: 2
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					onClick: send,
					disabled: loading,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" })
				})]
			})
		]
	});
}
//#endregion
export { EvaPage as component };
