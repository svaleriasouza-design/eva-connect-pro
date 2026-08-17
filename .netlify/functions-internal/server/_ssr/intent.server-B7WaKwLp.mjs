//#region node_modules/.nitro/vite/services/ssr/assets/intent.server-B7WaKwLp.js
async function classifyLeadIntent(text) {
	const t = (text ?? "").trim();
	if (!t) return {
		intent: "outro",
		source: "default"
	};
	const { isExplicitOptOut, looksLikeInternalHandoff } = await import("./optout-8SOkuOwY.mjs");
	if (isExplicitOptOut(t)) return {
		intent: "opt_out",
		source: "heuristic",
		reason: "Padrão explícito de recusa/remoção"
	};
	if (looksLikeInternalHandoff(t)) return {
		intent: "handoff_interno",
		source: "heuristic",
		reason: "Encaminhamento interno detectado"
	};
	const key = process.env.LOVABLE_API_KEY;
	if (!key) return {
		intent: "outro",
		source: "default"
	};
	try {
		const { createLovableAiGatewayProvider } = await import("./ai-gateway.server-DeOvIXyQ.mjs");
		const { generateText } = await import("../_libs/ai.mjs").then((n) => n.t);
		const { text: out } = await generateText({
			model: createLovableAiGatewayProvider(key)("google/gemini-2.5-flash"),
			system: `Você classifica a intenção de uma mensagem de WhatsApp de um lead B2B que recebeu uma abordagem comercial.
Responda APENAS com uma destas palavras:

OPT_OUT — o lead recusa ou quer sair da lista, mesmo de forma indireta ou educada.
Exemplos: "não precisamos", "não temos interesse no momento", "pode me tirar da lista", "não me manda mais mensagem", "já temos fornecedor", "obrigado, mas não", "não é do nosso interesse", "sem interesse".

HANDOFF — o lead está levando o assunto adiante internamente ou vai retornar (SINAL POSITIVO).
Exemplos: "vou encaminhar para o pessoal dessa área", "vou repassar para o responsável", "vamos avaliar internamente", "te dou um retorno".

OUTRO — qualquer outra coisa: dúvida, pedido de informação, agendamento, "não tenho tempo agora", "depois falamos", silêncio, saudação, agradecimento simples.

Atenção: "não tenho tempo agora", "estou em reunião", "depois falamos" NÃO são OPT_OUT.
Na dúvida entre OPT_OUT e OUTRO, escolha OPT_OUT somente se houver recusa clara do assunto/produto.`,
			messages: [{
				role: "user",
				content: t.slice(0, 1500)
			}]
		});
		const clean = (out ?? "").trim().toUpperCase();
		if (clean.startsWith("OPT_OUT")) return {
			intent: "opt_out",
			source: "ai",
			reason: "Recusa identificada pela IA"
		};
		if (clean.startsWith("HANDOFF")) return {
			intent: "handoff_interno",
			source: "ai",
			reason: "Encaminhamento interno identificado pela IA"
		};
		return {
			intent: "outro",
			source: "ai"
		};
	} catch {
		return {
			intent: "outro",
			source: "default"
		};
	}
}
//#endregion
export { classifyLeadIntent };
