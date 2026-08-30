// Meta Cloud API (WhatsApp Business) — server-only helpers.
// Configure these secrets when ready:
//   META_WA_PHONE_NUMBER_ID   -> ID do número (não é o número em si)
//   META_WA_ACCESS_TOKEN      -> Token permanente do System User
//   META_WA_VERIFY_TOKEN      -> String qualquer, você define e cola no painel
//   META_WA_APP_SECRET        -> App Secret (para validar X-Hub-Signature-256)
//   META_WA_GRAPH_VERSION     -> opcional, default v21.0

export type MetaSendResult = {
  ok: boolean;
  messageId?: string;
  error?: string;
  raw?: unknown;
};

export type MetaConfig = {
  /** id do registro em whatsapp_numbers (null quando vier da config legada). */
  numberId: string | null;
  label: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
  defaultTemplateName: string;
  defaultTemplateLang: string;
};

/**
 * Credenciais da Meta SEMPRE por workspace E por número.
 * Ordem: whatsapp_numbers (multi-número) -> meta_wa_settings (config legada).
 * Nada vem de variável de ambiente global (isolamento entre empresas).
 */
export async function loadMetaConfig(workspaceId: string, numberId?: string | null): Promise<MetaConfig> {
  try {
    const { resolveSendNumber } = await import("./wa-numbers.server");
    const n = await resolveSendNumber(workspaceId, numberId ?? null);
    if (n) {
      return {
        numberId: n.id,
        label: n.label || "",
        phoneNumberId: n.phone_number_id || "",
        accessToken: n.access_token || "",
        appSecret: n.app_secret || "",
        verifyToken: n.verify_token || "",
        graphVersion: n.graph_version || "v21.0",
        defaultTemplateName: n.default_template_name || "hello_world",
        defaultTemplateLang: n.default_template_lang || "en_US",
      };
    }
  } catch (err) {
    console.error("[meta:config] falha ao resolver número, usando config legada", err);
  }
  let row: any = {};
  try {
    const { wsDb } = await import("./workspace-scope.server");
    const db = await wsDb(workspaceId);
    const { data } = await db
      .from("meta_wa_settings")
      .select("phone_number_id, access_token, app_secret, verify_token, graph_version, default_template_name, default_template_lang")
      .maybeSingle();
    row = data ?? {};
  } catch {
    row = {};
  }
  return {
    numberId: null,
    label: "Configuração legada",
    phoneNumberId: row.phone_number_id || "",
    accessToken: row.access_token || "",
    // Nada de fallback em variável de ambiente: credenciais são sempre do
    // workspace, senão uma empresa herdaria o segredo/token de outra.
    appSecret: row.app_secret || "",
    verifyToken: row.verify_token || "",
    graphVersion: row.graph_version || "v21.0",
    defaultTemplateName: row.default_template_name || "hello_world",
    defaultTemplateLang: row.default_template_lang || "en_US",
  };
}

export async function metaConfiguredAsync(workspaceId: string, numberId?: string | null) {
  const cfg = await loadMetaConfig(workspaceId, numberId);
  return Boolean(cfg.phoneNumberId && cfg.accessToken);
}

import { normalizePhoneNumber } from "./phone";

function normalizePhone(raw: string) {
  // Meta espera E.164 sem "+" — reutiliza o normalizador global (adiciona 55).
  return normalizePhoneNumber(raw);
}

export async function sendWhatsappText(
  workspaceId: string,
  to: string,
  body: string,
  numberId?: string | null,
): Promise<MetaSendResult> {
  try {
    const cfg = await loadMetaConfig(workspaceId, numberId);
    const phoneId = cfg?.phoneNumberId;
    const token = cfg?.accessToken;
    if (!phoneId || !token) {
      return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
    }
    const url = `https://graph.facebook.com/${cfg?.graphVersion ?? "v21.0"}/${phoneId}/messages`;
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizePhone(to ?? ""),
      type: "text",
      text: { preview_url: false, body: body ?? "" },
    };
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (netErr) {
      return {
        ok: false,
        error: `Falha de rede ao contatar Graph API: ${netErr instanceof Error ? netErr.message : String(netErr)}`,
      };
    }
    const rawText = await res.text().catch(() => "");
    let json: any = null;
    if (rawText) {
      try {
        json = JSON.parse(rawText);
      } catch {
        json = null;
      }
    }
    if (!res.ok || json?.error) {
      const metaMsg = json?.error?.message;
      const metaCode = json?.error?.code;
      const metaSub = json?.error?.error_subcode;
      const metaType = json?.error?.type;
      const parts = [
        metaMsg ? `${metaMsg}` : `HTTP ${res.status}`,
        metaCode != null ? `code ${metaCode}` : null,
        metaSub != null ? `subcode ${metaSub}` : null,
        metaType ? `type ${metaType}` : null,
      ].filter(Boolean);
      return {
        ok: false,
        error: parts.join(" · "),
        raw: json ?? rawText,
      };
    }
    return { ok: true, messageId: json?.messages?.[0]?.id, raw: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendWhatsappTemplate(
  workspaceId: string,
  to: string,
  templateName: string,
  languageCode = "pt_BR",
  bodyParams: string[] = [],
  numberId?: string | null,
): Promise<MetaSendResult> {
  const cfg = await loadMetaConfig(workspaceId, numberId);
  const phoneId = cfg.phoneNumberId;
  const token = cfg.accessToken;
  if (!phoneId || !token) {
    return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
  }
  const url = `https://graph.facebook.com/${cfg.graphVersion}/${phoneId}/messages`;
  const name = (templateName ?? "").trim().toLowerCase();
  const payload: any = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "template",
    template: {
      name,
      language: { code: languageCode },
    },
  };
  // Template estático (sem {{1}}): envia apenas name + language, sem "components".
  if (bodyParams.length) {
    payload.template.components = [
      { type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) },
    ];
  }
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    return { ok: false, error: `Falha de rede ao contatar Graph API: ${netErr instanceof Error ? netErr.message : String(netErr)}` };
  }
  const rawText = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }
  if (!res.ok || json?.error) {
    const parts = [
      json?.error?.message ? String(json.error.message) : `HTTP ${res.status}`,
      json?.error?.code != null ? `code ${json.error.code}` : null,
      json?.error?.error_subcode != null ? `subcode ${json.error.error_subcode}` : null,
      `template ${name} (${languageCode})`,
    ].filter(Boolean);
    return { ok: false, error: parts.join(" · "), raw: json ?? rawText };
  }
  return { ok: true, messageId: json?.messages?.[0]?.id, raw: json };
}

// HMAC-SHA256 do corpo bruto usando META_WA_APP_SECRET.
// Meta envia o header `X-Hub-Signature-256: sha256=<hex>`.
export async function verifyMetaSignature(
  workspaceId: string | null,
  rawBody: string,
  headerValue: string | null,
  numberId?: string | null,
): Promise<boolean> {
  const cfg = workspaceId ? await loadMetaConfig(workspaceId, numberId) : null;
  const secret = cfg?.appSecret || process.env.META_WA_APP_SECRET || "";
  if (!secret) return false;
  if (!headerValue) return false;
  const provided = headerValue.startsWith("sha256=") ? headerValue.slice(7) : headerValue;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}
// ---------------------------------------------------------------------------
// Envio de ÁUDIO (voz) — Meta Cloud API
// 1) sobe o arquivo em /media (multipart) e recebe um media id;
// 2) envia a mensagem type=audio com esse id.
// ---------------------------------------------------------------------------

/** Formatos de áudio aceitos pela Meta Cloud API e a extensão correspondente. */
const META_AUDIO_TYPES: Record<string, string> = {
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/amr": "amr",
};

/** Detecta o container real pelos magic bytes — evita enviar WebM renomeado. */
function sniffAudioContainer(bytes: Uint8Array): string | null {
  const s = (i: number, str: string) =>
    str.split("").every((ch, k) => bytes[i + k] === ch.charCodeAt(0));
  if (bytes.length < 12) return null;
  if (s(0, "OggS")) return "audio/ogg";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "audio/webm";
  if (s(4, "ftyp")) return "audio/mp4";
  if (s(0, "ID3") || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (s(0, "#!AMR")) return "audio/amr";
  return null;
}

export async function uploadMetaAudio(
  workspaceId: string,
  bytes: Uint8Array,
  mime: string,
  numberId?: string | null,
): Promise<{ ok: boolean; mediaId?: string; error?: string; raw?: unknown }> {
  const cfg = await loadMetaConfig(workspaceId, numberId);
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
  }

  const declared = (mime || "").split(";")[0].toLowerCase();
  const sniffed = sniffAudioContainer(bytes);
  if (sniffed === "audio/webm") {
    return {
      ok: false,
      error:
        "Áudio em WebM: a Meta não aceita esse container. A gravação precisa ser convertida para OGG/Opus antes do envio.",
    };
  }
  // O tipo real manda: um .m4a que na verdade é OGG (ou vice-versa) é recusado.
  const effective = sniffed && META_AUDIO_TYPES[sniffed] ? sniffed : declared;
  const ext = META_AUDIO_TYPES[effective];
  if (!ext) {
    return { ok: false, error: `Formato de áudio não aceito pela Meta: ${effective || "desconhecido"}.` };
  }

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", effective);
  form.append("file", new Blob([bytes as unknown as BlobPart], { type: effective }), `audio.${ext}`);
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/media`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}` },
      body: form,
    });
    const rawText = await res.text().catch(() => "");
    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }
    // Log da resposta BRUTA do /media: é aqui que a Meta devolve o código real.
    console.log(
      `[meta:media:upload] status=${res.status} declared=${declared} sniffed=${sniffed ?? "?"} sent=${effective} bytes=${bytes.length} raw=${rawText.slice(0, 1200)}`,
    );
    if (!res.ok || !json?.id) {
      const parts = [
        json?.error?.message ? String(json.error.message) : `HTTP ${res.status} ao subir áudio na Meta`,
        json?.error?.code != null ? `code ${json.error.code}` : null,
        json?.error?.error_subcode != null ? `subcode ${json.error.error_subcode}` : null,
        json?.error?.error_data?.details ? String(json.error.error_data.details) : null,
        `type ${effective}`,
      ].filter(Boolean);
      return { ok: false, error: parts.join(" · "), raw: json ?? rawText };
    }
    return { ok: true, mediaId: String(json.id), raw: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendWhatsappAudio(
  workspaceId: string,
  to: string,
  mediaId: string,
  numberId?: string | null,
): Promise<MetaSendResult> {
  const cfg = await loadMetaConfig(workspaceId, numberId);
  if (!cfg.phoneNumberId || !cfg.accessToken) {
    return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: normalizePhone(to ?? ""),
        type: "audio",
        audio: { id: mediaId },
      }),
    });
    const rawText = await res.text().catch(() => "");
    let json: any = null;
    try {
      json = rawText ? JSON.parse(rawText) : null;
    } catch {
      json = null;
    }
    if (!res.ok || json?.error) {
      return { ok: false, error: json?.error?.message ?? `HTTP ${res.status}`, raw: json ?? rawText };
    }
    return { ok: true, messageId: json?.messages?.[0]?.id, raw: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
