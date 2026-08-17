import { I as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as Markdown } from "../_libs/react-markdown+[...].mjs";
import { t as remarkGfm } from "../_libs/remark-gfm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eva-markdown-DNx4dbdQ.js
var import_jsx_runtime = require_jsx_runtime();
function EvaMarkdown({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-2 text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_li]:ml-4 [&_li]:list-disc [&_ol_li]:list-decimal [&_strong]:font-semibold",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Markdown, {
			remarkPlugins: [remarkGfm],
			components: {
				table: (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "overflow-x-auto",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
						className: "w-full border-collapse text-xs",
						...props
					})
				}),
				th: (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
					className: "border border-border bg-muted px-2 py-1 text-left font-medium",
					...props
				}),
				td: (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
					className: "border border-border px-2 py-1 align-top",
					...props
				}),
				p: (props) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "whitespace-pre-wrap",
					...props
				})
			},
			children
		})
	});
}
//#endregion
export { EvaMarkdown as t };
