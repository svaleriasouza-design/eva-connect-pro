// Resposta da EVA para conversas originadas de DISPAROS (campanhas).
//
// Regras:
//  - usa APENAS a instrução cadastrada no disparo que originou a conversa;
//  - não toca na cadência de 5 dias (não avança, não inicia, não encerra);
//  - se o disparo não tiver instrução, retorna null e o fluxo atual da EVA segue.

import { sendAndLog } from "./messaging.server";

export type CampaignReplyContext = {
  campaignId: string;
  campaignName: string;
  instructions: string;
};

/** Busca a instrução do disparo que originou a conversa deste contato. */
export async function loadCampaignReplyContext(
  db: any,
  contactId: string,
): Promise<CampaignReplyContext | null> {
  const { data: contact } = await db
    .from("contacts")
    .select("conversation_origin, origin_campaign_id")
    .eq("id", contactId)
    .maybeSingle();
  const c = (contact ?? {}) as { conversation_origin?: string | null; origin_campaign_id?: string | null };
  if (c.conversation_origin !== "disparo" || !c.origin_campaign_id) return null;

  const { data: campaign } = await db
    .from("campaigns")
    .select("id, name, ai_instructions")
    .eq("id", c.origin_campaign_id)
    .maybeSingle();
  const camp = (campaign ?? null) as { id: string; name: string; ai_instructions?: string | null } | null;
  const instructions = (camp?.ai_instructions ?? "").trim();
  if (!camp || !instructions) return null;
  return { campaignId: camp.id, campaignName: camp.name, instructions };
}

/** Gera e envia a resposta da EVA usando a instrução exclusiva do disparo. */
export async function replyWithCampaignInstructions(params: {
  workspaceId: string;
  contactId: string;
  contactName: string;
  to: string;
  incomingText: string;
  campaign: CampaignReplyContext;
}): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return "error:missing_api_key";

  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const { generateText } = await import("ai");
  const { loadWorkspace } = await import("./workspace.server");
  const gateway = createLovableAiGatewayProvider(key);
  const ws = await loadWorkspace(params.workspaceId);

  const system = `Você é a EVA, assistente de vendas de ${ws.owner_name ? `${ws.owner_name} — ` : ""}${ws.name}. Fala por WhatsApp, em português do Brasil.

Esta conversa começou com um DISPARO (campanha) chamado "${params.campaign.campaignName}".
Responda seguindo EXCLUSIVAMENTE as instruções abaixo, definidas para este disparo:
"""${params.campaign.instructions}"""

Regras gerais: mensagens curtas (1 a 3 linhas), humanas, sem textão e sem jargão. Nunca invente preço, prazo ou informação que não esteja nas instruções. O cliente pode ter enviado várias mensagens seguidas — responda tudo numa única mensagem coerente.

Responda APENAS com o texto da mensagem a ser enviada para ${params.contactName}.`;

  let reply = "";
  try {
    const { text } = await generateText({
      model: gateway("google/gemini-2.5-flash"),
      system,
      messages: [{ role: "user", content: params.incomingText || "(cliente respondeu)" }],
    });
    reply = (text ?? "").trim();
  } catch (err) {
    console.error("[eva campaign-reply] AI error", err);
    return `error:ai:${err instanceof Error ? err.message : String(err)}`;
  }
  if (!reply) return "error:ai_empty";

  const res = await sendAndLog({
    workspaceId: params.workspaceId,
    to: params.to,
    body: reply,
    contactId: params.contactId,
    title: `EVA respondeu (disparo: ${params.campaign.campaignName})`,
    tag: `eva-campaign-reply-${params.campaign.campaignId}`,
  });
  return res.ok ? `sent:${res.messageId ?? ""}` : `send_failed:${res.error ?? ""}`;
}
