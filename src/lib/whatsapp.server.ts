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

function graphBase() {
  const v = process.env.META_WA_GRAPH_VERSION || "v21.0";
  return `https://graph.facebook.com/${v}`;
}

export function metaConfigured() {
  return Boolean(process.env.META_WA_PHONE_NUMBER_ID && process.env.META_WA_ACCESS_TOKEN);
}

function normalizePhone(raw: string) {
  // Meta espera E.164 sem "+"
  return String(raw).replace(/\D/g, "");
}

export async function sendWhatsappText(to: string, body: string): Promise<MetaSendResult> {
  const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
  }
  const url = `${graphBase()}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhone(to),
    type: "text",
    text: { preview_url: false, body },
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string; code?: number };
    };
    if (!res.ok || json.error) {
      return {
        ok: false,
        error: json.error?.message || `HTTP ${res.status}`,
        raw: json,
      };
    }
    return { ok: true, messageId: json.messages?.[0]?.id, raw: json };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendWhatsappTemplate(
  to: string,
  templateName: string,
  languageCode = "pt_BR",
  bodyParams: string[] = [],
): Promise<MetaSendResult> {
  const phoneId = process.env.META_WA_PHONE_NUMBER_ID;
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!phoneId || !token) {
    return { ok: false, error: "Credenciais Meta Cloud API não configuradas." };
  }
  const url = `${graphBase()}/${phoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: normalizePhone(to),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: bodyParams.length
        ? [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ]
        : undefined,
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message?: string };
  };
  if (!res.ok || json.error) {
    return { ok: false, error: json.error?.message || `HTTP ${res.status}`, raw: json };
  }
  return { ok: true, messageId: json.messages?.[0]?.id, raw: json };
}

// HMAC-SHA256 do corpo bruto usando META_WA_APP_SECRET.
// Meta envia o header `X-Hub-Signature-256: sha256=<hex>`.
export async function verifyMetaSignature(rawBody: string, headerValue: string | null): Promise<boolean> {
  const secret = process.env.META_WA_APP_SECRET;
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