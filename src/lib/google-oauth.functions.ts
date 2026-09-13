// Conexão da Google Agenda por usuária — funções chamadas pela tela de Configurações.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

function returnUrl(): string {
  const request = getRequest();
  if (!request) throw new Error("A conexão precisa ser iniciada pela tela da EVA.");
  const url = new URL(request.url);
  const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  const base = sandboxHost ? `https://${sandboxHost}` : url.origin;
  return new URL("/oauth/google-calendar/return", base).toString();
}

/** Inicia o consentimento oficial do Google para a usuária logada. */
export const startGoogleCalendarConnectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await wid(context);
    const {
      GATEWAY_BASE_URL,
      GOOGLE_CALENDAR_CONNECTOR_ID,
      GOOGLE_CALENDAR_SCOPES,
      clientApiKey,
      getConnectionForUser,
    } = await import("./google-connection.server");
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");

    const existing = await getConnectionForUser(context.userId);
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: GOOGLE_CALENDAR_CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey: clientApiKey(),
      returnUrl: returnUrl(),
      connectionAPIKey: existing?.connectionKey,
      credentialsConfiguration: { scopes: GOOGLE_CALENDAR_SCOPES },
    });
    void workspaceId;
    return { authorizationUrl };
  });

/** Conclui a conexão: troca o código único e guarda a credencial cifrada da usuária. */
export const completeGoogleCalendarConnectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ code: z.string().min(10) }).parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const {
      GATEWAY_BASE_URL,
      GOOGLE_CALENDAR_CONNECTOR_ID,
      saveConnection,
      setGoogleEmail,
    } = await import("./google-connection.server");
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (connectorId !== GOOGLE_CALENDAR_CONNECTOR_ID) {
      return { ok: false as const, error: "A autorização recebida não é do Google Agenda." };
    }
    await saveConnection({ workspaceId, userId: context.userId, connectionKey: connectionAPIKey });

    // Descobre o e-mail da conta conectada (só para mostrar na tela).
    const { listCalendars } = await import("./google-calendar.server");
    const res = await listCalendars({ workspaceId, userId: context.userId });
    if (res.ok) {
      const primary = res.data.items?.find((c) => c.primary) ?? res.data.items?.[0];
      await setGoogleEmail(context.userId, primary?.id ?? null);
    }
    return { ok: true as const };
  });

export const disconnectGoogleCalendarFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { GATEWAY_BASE_URL, GOOGLE_CALENDAR_CONNECTOR_ID, deleteConnection, getConnectionForUser } =
      await import("./google-connection.server");
    const conn = await getConnectionForUser(context.userId);
    if (!conn) return { ok: true as const };
    const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
    try {
      await disconnectAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey: conn.connectionKey,
        connectorId: GOOGLE_CALENDAR_CONNECTOR_ID,
      });
    } catch (err) {
      console.error("[google-calendar] disconnect", err);
    }
    await deleteConnection(context.userId);
    return { ok: true as const };
  });
