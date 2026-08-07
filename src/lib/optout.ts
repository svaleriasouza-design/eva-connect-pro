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
  // Pedidos de remoção da lista (formas indiretas e educadas)
  /(pode|poderia|favor|por favor)?\s*(me\s+)?(tir(a|ar|e)|retir(a|ar|e)|exclu(a|ir)|remov(a|er)|apagar?)\s*(o\s+meu\s+contato|meu\s+contato|me)?\s*(da|de)\s*(sua\s+)?(lista|base|mailing|cadastro)/i,
  /(tira|tire|tirar)\s+(eu|meu n[úu]mero|esse n[úu]mero|meu contato)\s*(da lista)?/i,
  /(n[ãa]o|nao)\s+precisa(mos|remos)?\b(?!\s*(se preocupar|de nada|se incomodar))/i,
  /(n[ãa]o|nao)\s+(temos|tenho|h[áa])\s+(interesse|necessidade|demanda)/i,
  /(n[ãa]o|nao)\s+(é|e)\s+(do\s+)?(nosso|meu)\s+interesse/i,
  /(sem|nenhum)\s+interesse\b/i,
  /n[ãa]o\s+(temos|tenho)\s+interesse\s+(no momento|por (ora|enquanto)|agora)/i,
  /j[áa]\s+(temos|tenho|trabalhamos com|possu[íi]mos)\s+(fornecedor|parceiro|empresa|solu[çc][ãa]o|consultoria)/i,
  /(n[ãa]o|nao)\s+(vamos|iremos|pretendemos)\s+(seguir|contratar|prosseguir|dar sequ[êe]ncia)/i,
  /(agradecemos|obrigad[oa]).{0,40}(mas|por[ée]m).{0,40}(n[ãa]o|declin)/i,
  /(descarta|descartar|declinar|declino)\s+(a\s+)?(proposta|contato|oferta)/i,
  /^\s*(n[ãa]o|nao)\s*(quero|obrigad[oa])?[.!]*\s*$/i,
  /(n[ãa]o|nao)\s+quero\b(?!\s+(perder|deixar|atrapalhar))/i,
];

/** true apenas quando o cliente pediu, de forma explícita, para parar de receber mensagens. */
export function isExplicitOptOut(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return OPT_OUT_PATTERNS.some((re) => re.test(t));
}

/**
 * Sinais de que o lead está levando o assunto internamente (encaminhando para
 * outra pessoa, time, setor ou diretoria). É SINAL DE INTERESSE — a EVA deve
 * manter a conversa ativa, nunca se despedir.
 */
const HANDOFF_PATTERNS: RegExp[] = [
  /(vou|irei|vamos|iremos|posso)\s+(encaminhar|repassar|passar|enviar|levar|compartilhar|mostrar|apresentar)/i,
  /(encaminhei|repassei|passei|enviei|falei)\s+(para|pro|pra|ao|com)\s+/i,
  /(encaminhar|repassar|passar)\s+(para|pro|pra|ao)\s+(o\s+)?(pessoal|time|setor|[áa]rea|respons[áa]vel|equipe|dire[çt]|s[óo]cio|gestor|diretoria|compras|rh|financeiro)/i,
  /(vou|vamos)\s+(avaliar|analisar|verificar|conversar|alinhar|discutir)\s*(internamente|com (o|a) (time|equipe|pessoal|respons[áa]vel|dire[çt]|s[óo]cio))?/i,
  /(quem cuida|respons[áa]vel por|pessoa (certa|respons[áa]vel))/i,
  /(vou|vamos)\s+(retornar|dar um retorno|te dar um retorno|voltar a falar)/i,
  /(em an[áa]lise|est[áa] em an[áa]lise|levar para a reuni[ãa]o interna)/i,
];

/** true quando o lead sinalizou encaminhamento/avaliação interna (avanço, não recusa). */
export function looksLikeInternalHandoff(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  if (isExplicitOptOut(t)) return false;
  return HANDOFF_PATTERNS.some((re) => re.test(t));
}

/** Cortesias de fechamento de turno que NÃO são recusa ("desde já agradeço"). */
export function isPoliteAcknowledgement(text: string): boolean {
  const t = (text ?? "").trim();
  if (!t || isExplicitOptOut(t)) return false;
  return /^(desde j[áa]\s+)?(muito\s+)?(obrigad[oa]|agrade[çc]o|grato|grata|valeu|ok|combinado|perfeito|[óo]timo)\b/i.test(t) ||
    /agrade[çc]o (a|pela) (colabora[çc][ãa]o|aten[çc][ãa]o|disponibilidade)/i.test(t);
}

const FAREWELL_PATTERNS: RegExp[] = [
  /n[ãa]o\s+(vou|irei)\s+(mais\s+)?(incomodar|perturbar|insistir)/i,
  /n[ãa]o\s+(te\s+)?incomodo\s+mais/i,
  /(fico|estou|permane[çc]o)\s+[àa]\s+disposi[çc][ãa]o.*(caso|se)\s+(um dia|algum dia|precisar|fizer sentido)/i,
  /respeito sua decis[ãa]o/i,
  /agrade[çc]o o retorno.*(n[ãa]o vou|encerr)/i,
  /desejo (muito )?sucesso/i,
  /(fico|estou)\s+[àa]\s+disposi[çc][ãa]o\s*[.!]*\s*$/i,
  /agrade[çc]o (o|seu) retorno/i,
];

/** Heurística: a resposta gerada parece uma despedida/encerramento de conversa. */
export function looksLikeFarewell(reply: string): boolean {
  const t = (reply ?? "").trim();
  if (!t) return false;
  return FAREWELL_PATTERNS.some((re) => re.test(t));
}
