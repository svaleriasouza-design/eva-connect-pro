import { n as __exportAll } from "../_runtime.mjs";
import { t as __exportAll$1 } from "./rolldown-runtime-D7D4PA-g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/phone-06k09EE6.js
var phone_06k09EE6_exports = /* @__PURE__ */ __exportAll({
	n: () => phone_exports,
	t: () => normalizePhoneNumber
});
var phone_exports = /* @__PURE__ */ __exportAll$1({ normalizePhoneNumber: () => normalizePhoneNumber });
function normalizePhoneNumber(input) {
	if (!input) return "";
	let digits = String(input).replace(/\D/g, "");
	if (!digits) return "";
	digits = digits.replace(/^0+/, "");
	while (digits.startsWith("5555") && digits.length > 13) digits = digits.slice(2);
	if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
	if (digits.length === 10 || digits.length === 11) return "55" + digits;
	if (digits.length < 10) return "";
	if (digits.length <= 15) return digits;
	return "";
}
//#endregion
export { phone_06k09EE6_exports as n, normalizePhoneNumber as t };
