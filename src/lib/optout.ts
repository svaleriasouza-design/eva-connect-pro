// Regras de encerramento da EVA: ela só se despede quando o cliente pede
// explicitamente para não receber mais mensagens.

const OPT_OUT_PATTERNS: RegExp[] = [
  /n[ãa]o\s+(quero|desejo|gostaria de)\s+(mais\s+)?(receber|nada)/i,
  /n[ãa]o\s+(me\s+)?(mande|envie|manda|envia|chame|chama|perturbe|incomode)\s*(mais)?/i,
  /par(e|a|em)\s+de\s+(me\s+)?(mandar|enviar|chamar|ligar|escrever)/i,
  /me\s+(remov(a|er)|descadastr(e|ar)|tir(e|ar))\s*(da lista|do seu contato|daqui)?/i,
  /sai(r)?\s+da\s+lista|descadastrar|cancelar\s+(o\s+)?recebimento/i,
  /\bnunca mais\b.*\b(mande|envie|escreva|chame)\b/i,
  /sem interesse.*(n[ãa]o|par(e|a))\s*(me)?\s*(mand|envi|cham)/i,
  /^(stop|sair|remover|descadastrar)$/i,
  /n[ãa]o\s+tenho\s+interesse.*n[ãa]o\s+(me\s+)?(chame|mande|envie)/i,
];

/** true apenas quando o cliente pediu, de forma explícita, para parar de receber mensagens. */
export function isExplicitOptOut(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return OPT_OUT_PATTERNS.some((re) => re.test(t));
}

const FAREWELL_PATTERNS: RegExp[] = [
  /n[ãa]o\s+(vou|irei)\s+(mais\s+)?(incomodar|perturbar|insistir)/i,
  /n[ãa]o\s+(te\s+)?incomodo\s+mais/i,
  /(fico|estou|permane[çc]o)\s+[àa]\s+disposi[çc][ãa]o.*(caso|se)\s+(um dia|algum dia|precisar|fizer sentido)/i,
  /respeito sua decis[ãa]o/i,
  /agrade[çc]o o retorno.*(n[ãa]o vou|encerr)/i,
  /desejo sucesso.*(at[ée] (mais|logo)|abra[çc]o)/i,
];

/** Heurística: a resposta gerada parece uma despedida/encerramento de conversa. */
export function looksLikeFarewell(reply: string): boolean {
  const t = (reply ?? "").trim();
  if (!t) return false;
  return FAREWELL_PATTERNS.some((re) => re.test(t));
}
