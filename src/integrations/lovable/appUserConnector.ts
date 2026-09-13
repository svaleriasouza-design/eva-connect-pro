/**
 * App User Connector helpers (server-only).
 *
 * Fluxo por usuária final com chave de conexão (`lovack_*`): cada usuária da EVA
 * autoriza a própria conta Google e a credencial dela é guardada cifrada no banco.
 *
 * NUNCA importe este arquivo em componentes/rotas do navegador — ele lê segredos
 * de `process.env`.
 */

function requireApiKey(): string {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("LOVABLE_API_KEY não configurada no servidor.");
  return key;
}

export interface AppUserOAuthAuthorizeParams {
  gatewayBaseUrl: string;
  connectorId: string;
  appUserId: string;
  clientAPIKey: string;
  returnUrl: string;
  credentialsConfiguration?: Record<string, unknown>;
  /** Chave já existente — usada apenas em reconexão. */
  connectionAPIKey?: string;
}

export async function authorizeAppUserOAuth(
  params: AppUserOAuthAuthorizeParams,
): Promise<{ authorizationUrl: string; sessionId: string }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${requireApiKey()}`,
    "Content-Type": "application/json",
    "X-Client-Api-Key": params.clientAPIKey,
  };
  if (params.connectionAPIKey) headers["X-Connection-Api-Key"] = params.connectionAPIKey;

  const res = await fetch(`${params.gatewayBaseUrl}/api/v1/app-users/oauth2/authorize`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      connector_id: params.connectorId,
      app_user_id: params.appUserId,
      return_url: params.returnUrl,
      credentials_configuration: params.credentialsConfiguration,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao iniciar autorização (${res.status}): ${text || res.statusText}`);
  let body: { authorization_url?: string; session_id?: string };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta inválida ao iniciar autorização: ${text.slice(0, 200)}`);
  }
  if (!body.authorization_url) throw new Error("Resposta sem authorization_url.");
  return { authorizationUrl: body.authorization_url, sessionId: body.session_id ?? "" };
}

export async function exchangeAppUserOAuthCode(
  gatewayBaseUrl: string,
  code: string,
): Promise<{ connectionAPIKey: string; connectorId: string }> {
  const res = await fetch(`${gatewayBaseUrl}/api/v1/app-users/oauth2/exchange`, {
    method: "POST",
    headers: { Authorization: `Bearer ${requireApiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Falha ao concluir autorização (${res.status}): ${text || res.statusText}`);
  let body: { api_key?: string; connector_id?: string };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta inválida ao concluir autorização: ${text.slice(0, 200)}`);
  }
  if (!body.api_key || !body.connector_id) throw new Error("Resposta de autorização incompleta.");
  return { connectionAPIKey: body.api_key, connectorId: body.connector_id };
}

export async function callAsAppUser(opts: {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
  path: string;
  init?: RequestInit;
  requiredScopes?: string[];
}): Promise<Response> {
  const normalizedPath = opts.path.startsWith("/") ? opts.path : `/${opts.path}`;
  const headers = new Headers(opts.init?.headers);
  headers.set("Authorization", `Bearer ${requireApiKey()}`);
  headers.set("X-Connection-Api-Key", opts.connectionAPIKey);
  if (opts.requiredScopes?.length) headers.set("X-Lovable-Required-Scopes", opts.requiredScopes.join(" "));
  return fetch(`${opts.gatewayBaseUrl}/${opts.connectorId}${normalizedPath}`, { ...opts.init, headers });
}

/** 401 com type "credential_*" = a usuária precisa reconectar a conta Google. */
export async function appUserReconnectRequired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  const body = (await res.clone().json().catch(() => null)) as { type?: unknown } | null;
  return typeof body?.type === "string" && body.type.startsWith("credential_");
}

export async function disconnectAppUser(opts: {
  gatewayBaseUrl: string;
  connectionAPIKey: string;
  connectorId: string;
}): Promise<void> {
  const res = await fetch(`${opts.gatewayBaseUrl}/api/v1/app-users/connection`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "X-Connection-Api-Key": opts.connectionAPIKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ connector_id: opts.connectorId }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao desconectar (${res.status}): ${text || res.statusText}`);
  }
}
