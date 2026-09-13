// Conexão da Google Agenda por usuária (server-only).
// Cada usuária autoriza a própria conta Google; a credencial fica cifrada em
// public.google_calendar_connections, sempre lida no servidor pelo id da usuária.

import { decryptConnectionKey, encryptConnectionKey } from "./connection-key-crypto.server";

export const GOOGLE_CALENDAR_CONNECTOR_ID = "google_calendar";
export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

const TABLE = "google_calendar_connections";

async function admin(): Promise<any> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export function clientApiKey(): string {
  const key = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
  if (!key) throw new Error("Conector do Google Agenda não configurado no projeto.");
  return key;
}

export type CalendarConnection = {
  id: string;
  workspaceId: string;
  userId: string;
  connectionKey: string;
  googleEmail: string | null;
  calendarId: string;
  reconnectRequired: boolean;
};

function mapRow(row: any): CalendarConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    connectionKey: decryptConnectionKey(row.connection_key_ciphertext),
    googleEmail: row.google_email ?? null,
    calendarId: row.calendar_id ?? "primary",
    reconnectRequired: Boolean(row.reconnect_required),
  };
}

/** Conexão da própria usuária (nunca de outra). */
export async function getConnectionForUser(userId: string): Promise<CalendarConnection | null> {
  if (!userId) return null;
  const db = await admin();
  const { data, error } = await db.from(TABLE).select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

/**
 * Conexão usada em automações (webhook/robô), quando não há ninguém logado:
 * a agenda da dona do workspace; se ela não conectou, a conexão mais recente
 * daquele workspace. Nunca cruza workspaces.
 */
export async function getConnectionForWorkspace(workspaceId: string): Promise<CalendarConnection | null> {
  if (!workspaceId) return null;
  const db = await admin();
  const { data: ws } = await db.from("workspaces").select("owner_user_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as any)?.owner_user_id as string | undefined;
  if (ownerId) {
    const { data: own } = await db
      .from(TABLE)
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("user_id", ownerId)
      .maybeSingle();
    if (own) return mapRow(own);
  }
  const { data } = await db
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapRow(data) : null;
}

/** Resolve a agenda a usar: a da usuária logada; senão a do workspace. */
export async function resolveConnection(ctx: {
  workspaceId: string;
  userId?: string | null;
}): Promise<CalendarConnection | null> {
  if (ctx.userId) {
    const mine = await getConnectionForUser(ctx.userId);
    if (mine && mine.workspaceId === ctx.workspaceId) return mine;
  }
  return getConnectionForWorkspace(ctx.workspaceId);
}

export async function saveConnection(opts: {
  workspaceId: string;
  userId: string;
  connectionKey: string;
  googleEmail?: string | null;
}): Promise<void> {
  const db = await admin();
  const { error } = await db.from(TABLE).upsert(
    {
      workspace_id: opts.workspaceId,
      user_id: opts.userId,
      connection_key_ciphertext: encryptConnectionKey(opts.connectionKey),
      google_email: opts.googleEmail ?? null,
      reconnect_required: false,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export async function setGoogleEmail(userId: string, email: string | null): Promise<void> {
  if (!email) return;
  const db = await admin();
  await db.from(TABLE).update({ google_email: email }).eq("user_id", userId);
}

export async function markReconnectRequired(userId: string): Promise<void> {
  const db = await admin();
  await db.from(TABLE).update({ reconnect_required: true }).eq("user_id", userId);
}

export async function deleteConnection(userId: string): Promise<void> {
  const db = await admin();
  await db.from(TABLE).delete().eq("user_id", userId);
}
