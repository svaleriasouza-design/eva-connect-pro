//#region node_modules/.nitro/vite/services/ssr/assets/optout-8SOkuOwY.js
var OPT_OUT_PATTERNS = [
	/\b(n[ãa]o|nao)\s+(quero|desejo|tenho)\s+(receber|mais)/i,
	/\bpode\s+me\s+(tirar|remover)\s+(da\s+)?lista/i,
	/\btire[-\s]me\s+(da\s+)?lista/i,
	/\b(n[ãa]o|nao)\s+me\s+(mande|envie)\s+mais/i,
	/\bpare\s+de\s+me\s+(mandar|enviar|chamar)/i,
	/\b(n[ãa]o|nao)\s+(temos|tenho|tem)\s+interesse/i,
	/\bsem\s+interesse/i,
	/\b(n[ãa]o|nao)\s+[ée]\h*\s+(do\s+nosso|da\s+nossa)\s+interesse/i,
	/\bj[áa]\s+temos\s+(fornecedor|parceiro|solu[çc][ãa]o)/i,
	/\bobrigad[oa],?\s+mas\s+(n[ãa]o|nao)/i,
	/\bn[ãa]o\s+precisamos/i,
	/\bdescadastrar/i,
	/\bunsubscribe/i,
	/\bstop\b/i,
	/\bsair\s+da\s+lista/i
];
var FAREWELL_PATTERNS = [
	/\bobrigad[oa]\s+(pelo\s+)?(retorno|contato|aten[çc][ãa]o)/i,
	/\bdesej[oa]\s+(sucesso|boa\s+sorte|tudo\s+de\s+bom)/i,
	/\b(n[ãa]o|nao)\s+vou\s+(mais\s+)?(incomodar|chamar|mandar)/i,
	/\bdeixo\s+(voc[êe]|vc)\s+(em\s+)?paz/i,
	/\bencerr(ando|ei)\s+(meu\s+)?contato/i,
	/\bpor\s+enquanto\s+[ée]\h*\s+s[óo]\s+isso/i,
	/\bvou\s+encerrar/i,
	/\bqualquer\s+coisa\s+(me\s+)?(chame|chama|avise)/i
];
var HANDOFF_PATTERNS = [
	/\b(vou|vou\s+repassar|encaminhar)\s+(para|ao)\s+(o\s+)?(pessoal|respons[áa]vel|time|equipe|gestor|chefe|diretor|supervisor|coordenador)/i,
	/\bvou\s+(levar|repasse|repassar)\s+(internamente|para\s+o\s+time)/i,
	/\bvamos\s+(avaliar|analisar|discutir)\s+internamente/i,
	/\b(te\s+)?(dou|deixo|devolvo)\s+(um\s+)?retorno/i,
	/\bvolto\s+a\s+(falar|contatar|chamar)/i,
	/\bdepois\s+(eu|n[óo]s)\s+(falo|falamos|retomo)/i,
	/\bvou\s+ver\s+(com|junto\s+a)\s+(o\s+)?(time|equipe|chefe|gestor)/i
];
function isExplicitOptOut(text) {
	const t = (text ?? "").trim();
	if (!t) return false;
	return OPT_OUT_PATTERNS.some((re) => re.test(t));
}
function looksLikeFarewell(text) {
	const t = (text ?? "").trim();
	if (!t) return false;
	return FAREWELL_PATTERNS.some((re) => re.test(t));
}
function looksLikeInternalHandoff(text) {
	const t = (text ?? "").trim();
	if (!t) return false;
	return HANDOFF_PATTERNS.some((re) => re.test(t));
}
//#endregion
export { isExplicitOptOut, looksLikeFarewell, looksLikeInternalHandoff };
