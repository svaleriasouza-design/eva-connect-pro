import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
const gw = createOpenAICompatible({ name:"lovable", baseURL:"https://ai.gateway.lovable.dev/v1", supportsStructuredOutputs:false, headers:{"Lovable-API-Key":process.env.LOVABLE_API_KEY!}});
const tools = {
  agenda: tool({ description:"reuniões a partir de hoje", inputSchema: z.object({days:z.number().nullable()}), execute: async () => ({reunioes_hoje:2, hoje:[{title:"Call ACME",starts_at:"2026-08-11T14:00:00Z"}]}) }),
  resumo_crm: tool({ description:"visão geral CRM", inputSchema: z.object({}), execute: async () => ({total: 20000, por_etapa:{novo_lead:19000}}) }),
};
const r = await generateText({ model: gw("google/gemini-2.5-flash"), system:"Você é a EVA. Use as ferramentas.", tools, stopWhen: stepCountIs(6), messages:[{role:"user",content:"Tenho reuniões hoje?"}]});
console.log("TEXT:", JSON.stringify(r.text));
console.log("steps:", r.steps.length, r.steps.map(s=>s.finishReason));
