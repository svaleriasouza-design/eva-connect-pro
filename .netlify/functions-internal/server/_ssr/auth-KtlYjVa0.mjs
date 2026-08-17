import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as CardTitle, i as CardHeader, n as CardContent, r as CardDescription, t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { G as Eye, I as LoaderCircle, K as EyeOff, h as Sparkles, nt as Check, t as X } from "../_libs/lucide-react.mjs";
import { t as Checkbox } from "./checkbox-kt6FvQcE.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { t as eva_logo_default } from "./eva-logo-DWVDrg9E.mjs";
import { n as passwordChecks, r as translateAuthError, t as isPasswordStrong } from "./auth-messages-UqrGqD3e.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-KtlYjVa0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AuthPage() {
	const navigate = useNavigate();
	const [mode, setMode] = (0, import_react.useState)("login");
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [fullName, setFullName] = (0, import_react.useState)("");
	const [remember, setRemember] = (0, import_react.useState)(true);
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const [passwordTouched, setPasswordTouched] = (0, import_react.useState)(false);
	const checks = passwordChecks(password);
	const strongEnough = isPasswordStrong(password);
	(0, import_react.useEffect)(() => {
		supabase.auth.getSession().then(({ data }) => {
			if (data.session) navigate({ to: "/" });
		});
	}, [navigate]);
	async function submit(e) {
		e.preventDefault();
		if (mode === "signup" && !strongEnough) {
			setPasswordTouched(true);
			toast.error("A senha ainda não atende a todos os requisitos abaixo.");
			return;
		}
		setLoading(true);
		try {
			if (mode === "login") {
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (error) throw error;
				if (!remember) sessionStorage.setItem("eva_no_persist", "1");
				toast.success("Bem-vinda, Valéria ✨");
				navigate({ to: "/" });
			} else if (mode === "signup") {
				const { data, error } = await supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: window.location.origin,
						data: { full_name: fullName.trim() || email.split("@")[0] }
					}
				});
				if (error) throw error;
				if (data.session) {
					toast.success("Conta criada. Bem-vinda ✨");
					navigate({ to: "/" });
				} else {
					toast.success("Conta criada. Você já pode entrar.");
					setMode("login");
				}
			} else {
				const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
				if (error) throw error;
				toast.success("Enviamos um e-mail com o link para redefinir sua senha.");
				setMode("login");
			}
		} catch (err) {
			toast.error(translateAuthError(err));
		} finally {
			setLoading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-gradient-to-br from-[color:var(--petrol)] to-[color:var(--petrol-dark,#0f2a35)] p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-6 flex flex-col items-center gap-2 text-white",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: eva_logo_default,
						alt: "EVA IA",
						width: 56,
						height: 56,
						className: "rounded-xl bg-white/10 p-2"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-2xl font-semibold tracking-tight",
						children: "EVA IA"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs uppercase tracking-[0.2em] text-white/60",
						children: "Bio Impact · Assistente Executiva"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardTitle, {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-[color:var(--gold)]" }),
					mode === "login" && "Entrar",
					mode === "signup" && "Criar conta",
					mode === "forgot" && "Recuperar senha"
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CardDescription, { children: [
				mode === "login" && "Acesse sua central comercial.",
				mode === "signup" && "Cadastre-se para acessar. Novos usuários entram como Leitor até um administrador liberar o envio.",
				mode === "forgot" && "Vamos enviar um link para o seu e-mail."
			] })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardContent, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: submit,
				className: "space-y-4",
				children: [
					mode === "signup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "fullName",
							children: "Nome completo"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "fullName",
							required: true,
							value: fullName,
							onChange: (e) => setFullName(e.target.value),
							maxLength: 120,
							autoComplete: "name",
							placeholder: "Como você quer ser chamada",
							onInvalid: (e) => e.currentTarget.setCustomValidity("Informe seu nome completo."),
							onInput: (e) => e.currentTarget.setCustomValidity("")
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
							htmlFor: "email",
							children: "E-mail"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							id: "email",
							type: "email",
							required: true,
							value: email,
							onChange: (e) => setEmail(e.target.value),
							autoComplete: "email",
							placeholder: "voce@empresa.com.br",
							onInvalid: (e) => e.currentTarget.setCustomValidity(e.currentTarget.value ? "Digite um e-mail válido, como voce@empresa.com.br." : "Informe seu e-mail."),
							onInput: (e) => e.currentTarget.setCustomValidity("")
						})]
					}),
					mode !== "forgot" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								htmlFor: "password",
								children: "Senha"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									id: "password",
									type: showPassword ? "text" : "password",
									required: true,
									className: "pr-10",
									value: password,
									onChange: (e) => {
										setPassword(e.target.value);
										setPasswordTouched(true);
									},
									autoComplete: mode === "login" ? "current-password" : "new-password",
									onInvalid: (e) => e.currentTarget.setCustomValidity("Informe sua senha."),
									onInput: (e) => e.currentTarget.setCustomValidity("")
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowPassword((v) => !v),
									className: "absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground",
									"aria-label": showPassword ? "Ocultar senha" : "Mostrar senha",
									children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
								})]
							}),
							mode === "signup" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-lg border bg-muted/40 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "mb-2 text-xs font-medium",
										children: "Sua senha deve conter:"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "space-y-1",
										children: checks.map((c) => {
											const state = !passwordTouched ? "idle" : c.ok ? "ok" : "missing";
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
												className: "flex items-center gap-2 text-xs " + (state === "ok" ? "text-emerald-600" : state === "missing" ? "text-destructive" : "text-muted-foreground"),
												children: [state === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 shrink-0" }) : state === "missing" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5 shrink-0" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: c.label })]
											}, c.id);
										})
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2 text-[11px] text-muted-foreground",
										children: "Evite senhas comuns (como “senha123” ou seu nome) — elas são recusadas por segurança."
									})
								]
							})
						]
					}),
					mode === "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between text-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
								checked: remember,
								onCheckedChange: (v) => setRemember(!!v)
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Permanecer conectado" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMode("forgot"),
							className: "text-primary hover:underline",
							children: "Esqueci minha senha"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "submit",
						className: "w-full",
						disabled: loading || mode === "signup" && !strongEnough,
						children: [
							loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }),
							mode === "login" && "Entrar",
							mode === "signup" && "Criar conta",
							mode === "forgot" && "Enviar link de recuperação"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-center text-xs text-muted-foreground",
						children: mode === "login" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Ainda não tem conta? ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMode("signup"),
							className: "text-primary hover:underline",
							children: "Criar conta"
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setMode("login"),
							className: "text-primary hover:underline",
							children: "Voltar para o login"
						})
					})
				]
			}) })] })]
		})
	});
}
//#endregion
export { AuthPage as component };
