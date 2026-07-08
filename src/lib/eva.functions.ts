import { createServerFn } from "@tanstack/react-start";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";
import { z } from "zod";

const EvaInput = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
  context: z.string().optional(),
});

export const askEva = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => EvaInput.parse(raw))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurado");
    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-2.5-flash");
    const system = `Você é a EVA, uma assistente executiva com IA especializada em prospecção comercial B2B, gestão de clientes e agendamento de reuniões do programa Bio Impact.
Fale em português do Brasil, de forma clara, elegante e profissional.
Você ajuda a Valéria a: responder mensagens, sugerir respostas de WhatsApp, criar propostas e apresentações, escrever e-mails, resumir conversas, organizar agenda, criar tarefas, lembrar follow-ups, identificar clientes esquecidos, preparar reuniões, tirar dúvidas sobre Bio Impact e sobre terapia.
Quando fizer sentido, sugira uma "Próxima Melhor Ação" concreta (ex.: "Enviar mensagem do Dia 3", "Ligar", "Agendar reunião", "Enviar proposta", "Reativar lead", "Mover para Perdido").
${data.context ? `\nContexto adicional:\n${data.context}` : ""}`;

    const { text } = await generateText({
      model,
      messages: [{ role: "system", content: system }, ...data.messages],
    });
    return { text };
  });