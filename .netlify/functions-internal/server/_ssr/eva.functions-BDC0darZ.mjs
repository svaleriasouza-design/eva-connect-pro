import { n as createServerFn } from "./server-tob7IPQL.mjs";
import { t as requireSupabaseAuth } from "./auth-middleware-C7ixY5gc.mjs";
import { a as objectType, i as numberType, n as booleanType, o as stringType, r as enumType, t as arrayType } from "../_libs/zod.mjs";
import { Y as tool } from "../_libs/@ai-sdk/gateway+[...].mjs";
import { createLovableAiGatewayProvider } from "./ai-gateway.server-DeOvIXyQ.mjs";
import { t as createServerRpc } from "./createServerRpc-C2U8M-2i.mjs";
import { n as generateText, r as isStepCount } from "../_libs/ai.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/eva.functions-BDC0darZ.js
var EvaInput = objectType({
	messages: arrayType(objectType({
		role: enumType([
			"user",
			"assistant",
			"system"
		]),
		content: stringType()
	})),
	context: stringType().optional()
});
var askEva_createServerFn_handler = createServerRpc({
	id: "0fd248d3eb34769dd299fc88a91d2af388020dc1390e8b4c400374b1bc2d82d4",
	name: "askEva",
	filename: "src/lib/eva.functions.ts"
}, (opts) => askEva.__executeServer(opts));
var askEva = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((raw) => EvaInput.parse(raw)).handler(askEva_createServerFn_handler, async ({ data, context }) => {
	const key = process.env.LOVABLE_API_KEY;
	if (!key) throw new Error("LOVABLE_API_KEY não configurado");
	const model = createLovableAiGatewayProvider(key)("google/gemini-3.6-flash");
	const { loadWorkspace } = await import("./workspace.server-VbM9IL_r.mjs");
	const { currentWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	const wid = await currentWorkspaceId(context.supabase);
	const ws = await loadWorkspace(wid);
	const d = await import("./eva-data.server-CkHrVQn1.mjs");
	const tools = {
		resumo_crm: tool({
			description: "Visão geral do CRM: total de contatos, distribuição por etapa do funil, status, leads em cadência e opt-outs.",
			inputSchema: objectType({}),
			execute: async () => d.crmOverview(wid)
		}),
		buscar_contatos: tool({
			description: "Lista contatos/leads do CRM. Todos os parâmetros são opcionais: search (nome/empresa/whatsapp), funnelStage (etapa) e limit.",
			inputSchema: objectType({
				search: stringType().nullish().optional(),
				funnelStage: stringType().nullish().optional(),
				limit: numberType().nullish().optional()
			}),
			execute: async (a) => d.listContacts(wid, a ?? {})
		}),
		empresas: tool({
			description: "Empresas do workspace: total cadastrado, quantas já foram contatadas, quantas não foram, e uma amostra com etapa, cidade e último contato. Não exige parâmetros — chame com {}.",
			inputSchema: objectType({
				search: stringType().nullish().optional(),
				limit: numberType().nullish().optional()
			}),
			execute: async (a) => d.companiesOverview(wid, a ?? {})
		}),
		agenda: tool({
			description: "Reuniões e eventos agendados a partir de hoje (inclui reuniões de hoje, link do Meet e status). Parâmetro days é opcional (padrão 7).",
			inputSchema: objectType({ days: numberType().nullish().optional() }),
			execute: async (a) => d.agenda(wid, a ?? {})
		}),
		resumo_cadencia: tool({
			description: "Configuração da cadência automática, passos (Dia 1 a 5), leads ativos por dia, mensagens enviadas e respostas de hoje.",
			inputSchema: objectType({}),
			execute: async () => d.cadenceSummary(wid)
		}),
		mensagens_recentes: tool({
			description: "Histórico recente de mensagens de WhatsApp (enviadas, recebidas, falhas).",
			inputSchema: objectType({
				days: numberType().nullish().optional(),
				limit: numberType().nullish().optional(),
				onlyFailed: booleanType().nullish().optional()
			}),
			execute: async (a) => d.recentMessages(wid, a ?? {})
		}),
		tarefas: tool({
			description: "Tarefas em aberto do workspace com prioridade e prazo.",
			inputSchema: objectType({}),
			execute: async () => d.tasksOverview(wid)
		}),
		prioridades: tool({
			description: "Clientes/leads que devem ser priorizados hoje: ações atrasadas e leads quentes do funil. Não exige parâmetros — chame com {} (limit é opcional, padrão 15).",
			inputSchema: objectType({ limit: numberType().nullish().optional() }),
			execute: async (a) => d.priorityContacts(wid, a ?? {})
		}),
		resumo_semana: tool({
			description: "Resumo comercial dos últimos 7 dias: envios, respostas, taxa de resposta, novos leads, reuniões e funil.",
			inputSchema: objectType({}),
			execute: async () => d.weeklySummary(wid)
		})
	};
	const owner = ws.owner_name || "a equipe";
	const system = `Você é a EVA, uma assistente executiva com IA especializada em prospecção comercial B2B, gestão de clientes e agendamento de reuniões de ${ws.name}.
Fale em português do Brasil, de forma clara, elegante e profissional.
Você ajuda ${owner} a: responder mensagens, sugerir respostas de WhatsApp, criar propostas e apresentações, escrever e-mails, resumir conversas, organizar agenda, criar tarefas, lembrar follow-ups, identificar clientes esquecidos, preparar reuniões e tirar dúvidas sobre ${ws.name}.

ACESSO A DADOS REAIS: você tem ferramentas que leem o banco de dados deste workspace (CRM/contatos, empresas, cadências e mensagens, agenda/reuniões, tarefas). Sempre que a pergunta envolver números, nomes, reuniões, status de cadência ou prioridades, CHAME as ferramentas antes de responder — nunca invente dados e nunca diga que não tem acesso ao banco.
Ao apresentar resultados, use resumos curtos e tabelas em markdown com os dados reais, informando quantidades e datas no formato brasileiro (dd/mm/aaaa hh:mm). Se uma consulta voltar vazia, diga explicitamente que não há registros.
Quando fizer sentido, sugira uma "Próxima Melhor Ação" concreta (ex.: "Enviar mensagem do Dia 3", "Ligar", "Agendar reunião", "Enviar proposta", "Reativar lead", "Mover para Perdido").
Hoje é ${(/* @__PURE__ */ new Date()).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).
${data.context ? `\nContexto adicional:\n${data.context}` : ""}`;
	const { text } = await generateText({
		model,
		system,
		tools,
		stopWhen: isStepCount(8),
		messages: data.messages.filter((m) => m.role !== "system")
	});
	return { text: text || "Não consegui gerar uma resposta agora. Pode reformular a pergunta?" };
});
//#endregion
export { askEva_createServerFn_handler };
