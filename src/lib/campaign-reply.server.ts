// Resposta da EVA para conversas originadas de DISPAROS (campanhas).
//
// Regras:
//  - usa APENAS a instrução cadastrada no disparo que originou a conversa;
//  - não toca na cadência de 5 dias (não avança, não inicia, não encerra);
//  - se o disparo não tiver instrução nem áudio, retorna null e o fluxo atual da EVA segue;
//  - se o disparo tiver "áudio para resposta positiva", ele é enviado UMA vez
//    quando o lead demonstrar interesse.

import { sendAndLog } from "./messaging.server";

export type CampaignReplyContext = {
  campaignId: string;
  campaignName: string;
  instructions: string;
  positiveAudioPath?: string | null;
};

const POSITIVE_TAG = "[POSITIVO]";

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
    .select("id, name, ai_instructions, draft_config")
    .eq("id", c.origin_campaign_id)
    .maybeSingle();
  const camp = (campaign ?? null) as
    | { id: string; name: string; ai_instructions?: string | null; draft_config?: any }
    | null;
  if (!camp) return null;
  const instructions = (camp.ai_instructions ?? "").trim();
  const audioPath = (camp.draft_config?.positiveAudio?.path as string | undefined) ?? null;
  if (!instructions && !audioPath) return null;
  return {
    campaignId: camp.id,
    campaignName: camp.name,
    instructions: instructions || "Responda de forma cordial, breve e convide o lead a continuar a conversa.",
    positiveAudioPath: audioPath,
  };
}

async function sendPositiveAudio(params: {
  workspaceId: string;
  to: string;
  contactId: string;
  audioPath: string;
  campaign: CampaignReplyContext;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const title = `Áudio de resposta positiva (disparo: ${params.campaign.campaignName})`;
    // Envia só uma vez por contato/disparo.
    const { data: already } = await (supabaseAdmin as any)
      .from("activities")
      .select("id")
      .eq("contact_id", params.contactId)
      .eq("kind", "whatsapp_out")
      .eq("title", title)
      .eq("status", "SENT")
      .limit(1);
    if (already && already.length > 0) return;
    const dl = await supabaseAdmin.storage.from("whatsapp-audio").download(params.audioPath);
    if (dl.error || !dl.data) {
      console.error("[eva campaign-reply] áudio não encontrado", dl.error?.message);
      return;
    }
    const bytes = new Uint8Array(await dl.data.arrayBuffer());
    const ext = params.audioPath.split(".").pop()?.toLowerCase() ?? "ogg";
    const mime =
      ext === "mp3" ? "audio/mpeg" : ext === "m4a" || ext === "aac" ? "audio/mp4" : ext === "amr" ? "audio/amr" : "audio/ogg";
    const { sendAudioAndLog } = await import("./messaging.server");
    const res = await sendAudioAndLog({
      workspaceId: params.workspaceId,
      to: params.to,
      contactId: params.contactId,
      bytes,
      mime,
      storagePath: params.audioPath,
      title,
      tag: `eva-campaign-audio-${params.campaign.campaignId}`,
      sendMode: "eva",
    });
    if (!res.ok) console.warn("[eva campaign-reply] falha no áudio:", res.error);
  } catch (err) {
    console.error("[eva campaign-reply] erro ao enviar áudio", err);
  }
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
  const hasAudio = Boolean(params.campaign.positiveAudioPath);

  const system = `Você é a EVA, assistente de vendas de ${ws.owner_name ? `${ws.owner_name} — ` : ""}${ws.name}. Fala por WhatsApp, em português do Brasil.

Esta conversa começou com um DISPARO (campanha) chamado "${params.campaign.campaignName}".
Responda seguindo EXCLUSIVAMENTE as instruções abaixo, definidas para este disparo:
"""${params.campaign.instructions}"""

Regras gerais: mensagens curtas (1 a 3 linhas), humanas, sem textão e sem jargão. Nunca invente preço, prazo ou informação que não esteja nas instruções. O cliente pode ter enviado várias mensagens seguidas — responda tudo numa única mensagem coerente.
${hasAudio ? `\nSe o cliente demonstrou interesse/resposta POSITIVA (ex.: "quero saber mais", "tenho interesse", "sim", "como funciona", "pode mandar"), comece sua resposta exatamente com ${POSITIVE_TAG} e depois o texto. Um áudio será enviado logo após sua mensagem. Caso contrário, não use essa marcação.\n` : ""}
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
  const positive = reply.includes(POSITIVE_TAG);
  reply = reply.replace(POSITIVE_TAG, "").trim();
  if (!reply) return "error:ai_empty";

  const res = await sendAndLog({
    workspaceId: params.workspaceId,
    to: params.to,
    body: reply,
    contactId: params.contactId,
    title: `EVA respondeu (disparo: ${params.campaign.campaignName})`,
    tag: `eva-campaign-reply-${params.campaign.campaignId}`,
  });
  if (res.ok && positive && params.campaign.positiveAudioPath) {
    await sendPositiveAudio({
      workspaceId: params.workspaceId,
      to: params.to,
      contactId: params.contactId,
      audioPath: params.campaign.positiveAudioPath,
      campaign: params.campaign,
    });
  }
  return res.ok ? `sent:${res.messageId ?? ""}` : `send_failed:${res.error ?? ""}`;
}
