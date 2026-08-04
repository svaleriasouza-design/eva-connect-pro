import { createServerFn } from "@tanstack/react-start";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";
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
    const ws = await loadWorkspace(await currentWorkspaceId(context.supabase));
    const owner = ws.owner_name || "a equipe";
    const system = `Você é a EVA, uma assistente executiva com IA especializada em prospecção comercial B2B, gestão de clientes e agendamento de reuniões de ${ws.name}.
Fale em português do Brasil, de forma clara, elegante e profissional.
Você ajuda ${owner} a: responder mensagens, sugerir respostas de WhatsApp, criar propostas e apresentações, escrever e-mails, resumir conversas, organizar agenda, criar tarefas, lembrar follow-ups, identificar clientes esquecidos, preparar reuniões e tirar dúvidas sobre ${ws.name}.
Quando fizer sentido, sugira uma "Próxima Melhor Ação" concreta (ex.: "Enviar mensagem do Dia 3", "Ligar", "Agendar reunião", "Enviar proposta", "Reativar lead", "Mover para Perdido").
${data.context ? `\nContexto adicional:\n${data.context}` : ""}`;

    const { text } = await generateText({
      model,
      system,
      messages: data.messages.filter((m) => m.role !== "system"),
    });
    return { text };
  });