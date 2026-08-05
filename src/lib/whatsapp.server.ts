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
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
  graphVersion: string;
  defaultTemplateName: string;
  defaultTemplateLang: string;
};

/**
 * Credenciais da Meta SEMPRE por workspace. Número e token nunca caem em
 * variável de ambiente global — isso evitaria o isolamento entre empresas.
 */
export async function loadMetaConfig(workspaceId: string): Promise<MetaConfig> {
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

export async function metaConfiguredAsync(workspaceId: string) {
  const cfg = await loadMetaConfig(workspaceId);
  return Boolean(cfg.phoneNumberId && cfg.accessToken);
}

import { normalizePhoneNumber } from "./phone";

function normalizePhone(raw: string) {
  // Meta espera E.164 sem "+" — reutiliza o normalizador global (adiciona 55).
  return normalizePhoneNumber(raw);
}

export async function sendWhatsappText(workspaceId: string, to: string, body: string): Promise<MetaSendResult> {
  try {
    const cfg = await loadMetaConfig(workspaceId);
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
): Promise<MetaSendResult> {
  const cfg = await loadMetaConfig(workspaceId);
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
): Promise<boolean> {
  const cfg = workspaceId ? await loadMetaConfig(workspaceId) : null;
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