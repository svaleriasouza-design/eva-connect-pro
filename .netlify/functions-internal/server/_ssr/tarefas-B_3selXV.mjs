import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as supabase } from "./client-l9Wso-f0.mjs";
import { a as formatDateTime } from "./db-DhO7Bl8s.mjs";
import { t as Card } from "./card-CtX3ithx.mjs";
import { t as Button } from "./button-BkEeRci-.mjs";
import { E as Plus, u as Trash2 } from "../_libs/lucide-react.mjs";
import { t as Checkbox } from "./checkbox-kt6FvQcE.mjs";
import { r as useQueryClient, t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Input } from "./input-B8Q2ztVi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tarefas-B_3selXV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Tarefas() {
	const qc = useQueryClient();
	const { data: tasks = [] } = useQuery({
		queryKey: ["tasks"],
		queryFn: async () => (await supabase.from("tasks").select("*").order("done").order("due_at", { nullsFirst: false })).data ?? []
	});
	const [title, setTitle] = (0, import_react.useState)("");
	const [due, setDue] = (0, import_react.useState)("");
	async function add() {
		if (!title.trim()) return;
		await supabase.from("tasks").insert({
			title,
			due_at: due ? new Date(due).toISOString() : null
		});
		setTitle("");
		setDue("");
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	async function toggle(id, done) {
		await supabase.from("tasks").update({ done: !done }).eq("id", id);
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	async function remove(id) {
		await supabase.from("tasks").delete().eq("id", id);
		qc.invalidateQueries({ queryKey: ["tasks"] });
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4 max-w-3xl",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "text-2xl font-semibold",
				children: "Tarefas"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-sm text-muted-foreground",
				children: [tasks.filter((t) => !t.done).length, " pendentes"]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
				className: "flex gap-2 p-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						placeholder: "Nova tarefa…",
						value: title,
						onChange: (e) => setTitle(e.target.value),
						onKeyDown: (e) => e.key === "Enter" && add()
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "datetime-local",
						value: due,
						onChange: (e) => setDue(e.target.value),
						className: "w-52"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						onClick: add,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [tasks.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
					className: `flex items-center gap-3 p-3 ${t.done ? "opacity-60" : ""}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
							checked: t.done,
							onCheckedChange: () => toggle(t.id, t.done)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `text-sm ${t.done ? "line-through text-muted-foreground" : ""}`,
								children: t.title
							}), t.due_at && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground",
								children: formatDateTime(t.due_at)
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							onClick: () => remove(t.id),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
						})
					]
				}, t.id)), tasks.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "text-sm text-muted-foreground",
					children: "Nenhuma tarefa."
				})]
			})
		]
	});
}
//#endregion
export { Tarefas as component };
