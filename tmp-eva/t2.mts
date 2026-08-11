import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
const gw = createOpenAICompatible({ name:"lovable", baseURL:"https://ai.gateway.lovable.dev/v1", supportsStructuredOutputs:false, headers:{"Lovable-API-Key":process.env.LOVABLE_API_KEY!}});
const tools = {
  empresas: tool({ description:"Empresas do workspace", inputSchema: z.object({search:z.string().nullish().optional(), limit:z.number().nullish().optional()}), execute: async (a) => { console.log("ARGS", JSON.stringify(a)); return {total_empresas:20544, empresas_contatadas:132}; } }),
};
const r = await generateText({ model: gw("google/gemini-2.5-flash"), system:"Você é a EVA. Use ferramentas.", tools, stopWhen: stepCountIs(6), messages:[{role:"user",content:"Quantas empresas foram contatadas?"}]});
console.log("TEXT:", r.text);
for (const s of r.steps) console.log(s.finishReason, JSON.stringify(s.content).slice(0,600));
