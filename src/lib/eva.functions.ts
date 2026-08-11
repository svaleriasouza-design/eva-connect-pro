import { createServerFn } from "@tanstack/react-start";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EvaInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
  context: z.string().optional(),
});

export const askEva = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => EvaInput.parse(raw))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");
    const { loadWorkspace } = await import("./workspace.server");
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const wid = await currentWorkspaceId(context.supabase);
    const ws = await loadWorkspace(wid);
    const d = await import("./eva-data.server");

    const tools = {
      resumo_crm: tool({
        description: "Visão geral do CRM: total de contatos, distribuição por etapa do funil, status, leads em cadência e opt-outs.",
        inputSchema: z.object({}),
        execute: async () => d.crmOverview(wid),
      }),
      buscar_contatos: tool({
        description: "Lista contatos/leads do CRM. Use search para nome/empresa/whatsapp e funnelStage para filtrar a etapa do funil.",
        inputSchema: z.object({
          search: z.string().nullish().optional(),
          funnelStage: z.string().nullish().optional(),
          limit: z.number().nullish().optional(),
        }),
        execute: async (a) => d.listContacts(wid, a ?? {}),
      }),
      empresas: tool({
        description: "Empresas do workspace: total, quantas já foram contatadas e uma amostra com etapa, cidade e último contato.",
        inputSchema: z.object({ search: z.string().nullish().optional(), limit: z.number().nullish().optional() }),
        execute: async (a) => d.companiesOverview(wid, a ?? {}),
      }),
      agenda: tool({
        description: "Reuniões e eventos agendados a partir de hoje (inclui reuniões de hoje, link do Meet e status).",
        inputSchema: z.object({ days: z.number().nullish().optional() }),
        execute: async (a) => d.agenda(wid, a ?? {}),
      }),
      resumo_cadencia: tool({
        description: "Configuração da cadência automática, passos (Dia 1 a 5), leads ativos por dia, mensagens enviadas e respostas de hoje.",
        inputSchema: z.object({}),
        execute: async () => d.cadenceSummary(wid),
      }),
      mensagens_recentes: tool({
        description: "Histórico recente de mensagens de WhatsApp (enviadas, recebidas, falhas).",
        inputSchema: z.object({
          days: z.number().nullish().optional(),
          limit: z.number().nullish().optional(),
          onlyFailed: z.boolean().nullish().optional(),
        }),
        execute: async (a) => d.recentMessages(wid, a ?? {}),
      }),
      tarefas: tool({
        description: "Tarefas em aberto do workspace com prioridade e prazo.",
        inputSchema: z.object({}),
        execute: async () => d.tasksOverview(wid),
      }),
      prioridades: tool({
        description: "Clientes/leads que devem ser priorizados hoje: ações atrasadas e leads quentes do funil.",
        inputSchema: z.object({ limit: z.number().nullish().optional() }),
        execute: async (a) => d.priorityContacts(wid, a ?? {}),
      }),
      resumo_semana: tool({
        description: "Resumo comercial dos últimos 7 dias: envios, respostas, taxa de resposta, novos leads, reuniões e funil.",
        inputSchema: z.object({}),
        execute: async () => d.weeklySummary(wid),
      }),
    };

    const owner = ws.owner_name || "a equipe";
    const system = `Você é a EVA, uma assistente executiva com IA especializada em prospecção comercial B2B, gestão de clientes e agendamento de reuniões de ${ws.name}.
Fale em português do Brasil, de forma clara, elegante e profissional.
Você ajuda ${owner} a: responder mensagens, sugerir respostas de WhatsApp, criar propostas e apresentações, escrever e-mails, resumir conversas, organizar agenda, criar tarefas, lembrar follow-ups, identificar clientes esquecidos, preparar reuniões e tirar dúvidas sobre ${ws.name}.

ACESSO A DADOS REAIS: você tem ferramentas que leem o banco de dados deste workspace (CRM/contatos, empresas, cadências e mensagens, agenda/reuniões, tarefas). Sempre que a pergunta envolver números, nomes, reuniões, status de cadência ou prioridades, CHAME as ferramentas antes de responder — nunca invente dados e nunca diga que não tem acesso ao banco.
Ao apresentar resultados, use resumos curtos e tabelas em markdown com os dados reais, informando quantidades e datas no formato brasileiro (dd/mm/aaaa hh:mm). Se uma consulta voltar vazia, diga explicitamente que não há registros.
Quando fizer sentido, sugira uma "Próxima Melhor Ação" concreta (ex.: "Enviar mensagem do Dia 3", "Ligar", "Agendar reunião", "Enviar proposta", "Reativar lead", "Mover para Perdido").
Hoje é ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília).
${data.context ? `\nContexto adicional:\n${data.context}` : ""}`;

    const { text } = await generateText({
      model,
      system,
      tools,
      stopWhen: stepCountIs(8),
      messages: data.messages.filter((m) => m.role !== "system"),
    });
    return { text: text || "Não consegui gerar uma resposta agora. Pode reformular a pergunta?" };
  });
