import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { I as LoaderCircle, nt as Check, t as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as passwordChecks, r as translateAuthError, t as isPasswordStrong } from "./auth-messages-UqrGqD3e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-BKIzF4sa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ResetPage() {
	const navigate = useNavigate();
	const [password, setPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [touched, setTouched] = (0, import_react.useState)(false);
	const checks = passwordChecks(password);
	const strongEnough = isPasswordStrong(password);
	async function submit(e) {
		e.preventDefault();
		if (!strongEnough) {
			setTouched(true);
			toast.error("A senha ainda não atende a todos os requisitos abaixo.");
			return;
		}
		setLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;
			toast.success("Senha atualizada!");
			navigate({ to: "/" });
		} catch (err) {
			toast.error(translateAuthError(err, "Não foi possível atualizar a senha. Tente novamente."));
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardTitle, { children: "Definir nova senha" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "pwd",
							children: "Nova senha"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "pwd",
							type: "password",
							required: true,
							autoComplete: "new-password",
							value: password,
							onChange: (e) => {
								setPassword(e.target.value);
								setTouched(true);
							},
							onInvalid: (e) => e.currentTarget.setCustomValidity("Informe a nova senha."),
							onInput: (e) => e.currentTarget.setCustomValidity("")
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-lg border bg-muted/40 p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-2 text-xs font-medium",
								children: "Sua senha deve conter:"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-1",
								children: checks.map((c) => {
									const state = !touched ? "idle" : c.ok ? "ok" : "missing";
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
										className: "flex items-center gap-2 text-xs " + (state === "ok" ? "text-emerald-600" : state === "missing" ? "text-destructive" : "text-muted-foreground"),
										children: [state === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 shrink-0" }) : state === "missing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c.label })]
									}, c.id);
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					type: "submit",
					className: "w-full",
					disabled: loading || !strongEnough,
					children: [loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Salvar nova senha"]
				})]
			}) })]
		})
	});
}
//#endregion
export { ResetPage as component };
