import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { n as useServerFn } from "./createSsrRpc-DR8GA9yC.mjs";
import { a as formatDateTime } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { F as Loader, a as UserPlus, r as Users, v as ShieldCheck } from "../_libs/lucide-react.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-Bk9pEsHD.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { i as useAccess, n as listUsersFn, r as setUserRoleFn, t as addUserToWorkspaceFn } from "./use-access-DH-CD7hW.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/usuarios-DCgjPEvn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ROLE_LABEL = {
	admin: "Administrador",
	operador: "Operador",
	leitor: "Leitor"
};
var ROLE_HELP = {
	admin: "Acesso total, inclusive configurações e gestão de usuários.",
	operador: "Pode enviar mensagens, editar CRM, agenda e cadências.",
	leitor: "Somente visualiza — não envia mensagens nem altera dados."
};
function UsuariosPage() {
	const qc = useQueryClient();
	const { isAdmin, loading, access } = useAccess();
	const listFn = useServerFn(listUsersFn);
	const setRoleFn = useServerFn(setUserRoleFn);
	const addUserFn = useServerFn(addUserToWorkspaceFn);
	const [addOpen, setAddOpen] = (0, import_react.useState)(false);
	const [addEmail, setAddEmail] = (0, import_react.useState)("");
	const [addRole, setAddRole] = (0, import_react.useState)("operador");
	const [adding, setAdding] = (0, import_react.useState)(false);
	const { data: users = [], isLoading } = useQuery({
		queryKey: ["users-roles"],
		queryFn: () => listFn(),
		enabled: isAdmin
	});
	async function changeRole(userId, role) {
		try {
			await setRoleFn({ data: {
				userId,
				role
			} });
			toast.success("Permissão atualizada");
			qc.invalidateQueries({ queryKey: ["users-roles"] });
			qc.invalidateQueries({ queryKey: ["my-access"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível alterar a permissão");
		}
	}
	async function addUser() {
		setAdding(true);
		try {
			const res = await addUserFn({ data: {
				email: addEmail,
				role: addRole
			} });
			toast.success(`${res?.name ?? "Usuário"} adicionado ao workspace.`);
			setAddOpen(false);
			setAddEmail("");
			setAddRole("operador");
			qc.invalidateQueries({ queryKey: ["users-roles"] });
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Não foi possível adicionar o usuário.");
		} finally {
			setAdding(false);
		}
	}
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-2 p-6 text-sm text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loader, { className: "h-4 w-4 animate-spin" }), " Carregando…"]
	});
	if (!isAdmin) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			className: "max-w-lg p-6 text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-2 flex items-center gap-2 font-medium",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-4 w-4 text-primary" }), " Acesso restrito"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-muted-foreground",
				children: [
					"Somente administradores podem gerenciar usuários. Seu nível atual: ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: ROLE_LABEL[access?.roles[0] ?? "leitor"] }),
					"."
				]
			})]
		})
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "max-w-4xl space-y-4 p-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "flex items-center gap-2 text-2xl font-semibold",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-5 w-5 text-primary" }), " Usuários e permissões"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: "Adicione membros da equipe e defina o nível de acesso de cada pessoa."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
					open: addOpen,
					onOpenChange: setAddOpen,
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							className: "gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserPlus, { className: "h-4 w-4" }), " Adicionar usuário"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "Adicionar usuário ao workspace" }) }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "A pessoa precisa ter se cadastrado na EVA primeiro. Informe o e-mail usado no cadastro para adicioná-la ao seu workspace."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										className: "text-xs",
										children: "E-mail do usuário"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: "email",
										value: addEmail,
										onChange: (e) => setAddEmail(e.target.value),
										placeholder: "pessoa@empresa.com"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										className: "text-xs",
										children: "Permissão"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
										value: addRole,
										onValueChange: setAddRole,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "admin",
												children: "Administrador"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "operador",
												children: "Operador"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
												value: "leitor",
												children: "Leitor"
											})
										] })]
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "outline",
							onClick: () => setAddOpen(false),
							children: "Cancelar"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							onClick: addUser,
							disabled: adding || !addEmail,
							children: [adding && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Loader, { className: "mr-2 h-4 w-4 animate-spin" }), "Adicionar"]
						})] })
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-2 md:grid-cols-3",
				children: [
					"admin",
					"operador",
					"leitor"
				].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: "p-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-medium",
						children: ROLE_LABEL[r]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground",
						children: ROLE_HELP[r]
					})]
				}, r))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "divide-y",
				children: [
					isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-6 text-sm text-muted-foreground",
						children: "Carregando usuários…"
					}),
					!isLoading && users.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "p-6 text-sm text-muted-foreground",
						children: "Nenhum usuário ainda. Adicione alguém ao seu workspace."
					}),
					users.map((u) => {
						const role = u.roles?.[0] ?? "leitor";
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center gap-3 p-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
									children: (u.full_name || u.email || "?").slice(0, 2).toUpperCase()
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "truncate text-sm font-medium",
										children: u.full_name || u.email
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "truncate text-xs text-muted-foreground",
										children: [
											u.email,
											" · desde ",
											formatDateTime(u.created_at)
										]
									})]
								}),
								u.id === access?.userId && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: "secondary",
									className: "text-[10px]",
									children: "você"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: role,
									onValueChange: (v) => changeRole(u.id, v),
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
										className: "w-[180px]",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "admin",
											children: "Administrador"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "operador",
											children: "Operador"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
											value: "leitor",
											children: "Leitor"
										})
									] })]
								})
							]
						}, u.id);
					})
				]
			})
		]
	});
}
//#endregion
export { UsuariosPage as component };
