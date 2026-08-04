// Escopo multi-tenant para código server-only (usa service role e por isso
// NÃO passa por RLS). Toda consulta feita por aqui é obrigatoriamente
// filtrada por workspace_id, garantindo isolamento total entre empresas.

type AnyDb = any;

async function admin(): Promise<AnyDb> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as AnyDb;
}

function withWs(rows: any, workspaceId: string) {
  const add = (r: any) => ({ ...r, workspace_id: workspaceId });
  return Array.isArray(rows) ? rows.map(add) : add(rows);
}

export type WsDb = {
  from(table: string): {
    select: (...args: any[]) => any;
    insert: (rows: any, opts?: any) => any;
    upsert: (rows: any, opts?: any) => any;
    update: (patch: any, opts?: any) => any;
    delete: (opts?: any) => any;
  };
};

/** Cliente admin escopado a um workspace. */
export async function wsDb(workspaceId: string): Promise<WsDb> {
  if (!workspaceId) throw new Error("workspaceId obrigatório (isolamento multi-tenant).");
  const db = await admin();
  return {
    from(table: string) {
      return {
        select: (...args: any[]) => db.from(table).select(...args).eq("workspace_id", workspaceId),
        insert: (rows: any, opts?: any) => db.from(table).insert(withWs(rows, workspaceId), opts),
        upsert: (rows: any, opts?: any) => db.from(table).upsert(withWs(rows, workspaceId), opts),
        update: (patch: any, opts?: any) => db.from(table).update(patch, opts).eq("workspace_id", workspaceId),
        delete: (opts?: any) => db.from(table).delete(opts).eq("workspace_id", workspaceId),
      };
    },
  };
}

/** Workspace do usuário autenticado (usa o client com RLS do próprio usuário). */
export async function currentWorkspaceId(supabase: any): Promise<string> {
  const { data, error } = await supabase.rpc("current_workspace_id");
  if (error) throw new Error(`Não foi possível identificar seu workspace: ${error.message}`);
  if (!data) throw new Error("Seu usuário ainda não possui um workspace.");
  return data as string;
}

/** Resolve o workspace a partir do número da Meta que recebeu a mensagem. */
export async function workspaceIdForPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  if (!phoneNumberId) return null;
  const db = await admin();
  const { data } = await db
    .from("meta_wa_settings")
    .select("workspace_id")
    .eq("phone_number_id", phoneNumberId)
    .maybeSingle();
  return ((data as any)?.workspace_id as string | undefined) ?? null;
}

/** Resolve o workspace pelo verify token (handshake do webhook da Meta). */
export async function workspaceIdForVerifyToken(token: string): Promise<string | null> {
  if (!token) return null;
  const db = await admin();
  const { data } = await db
    .from("meta_wa_settings")
    .select("workspace_id")
    .eq("verify_token", token)
    .maybeSingle();
  return ((data as any)?.workspace_id as string | undefined) ?? null;
}

/** Workspace legado (o mais antigo) — usado como fallback do webhook. */
export async function legacyWorkspaceId(): Promise<string | null> {
  const db = await admin();
  const { data } = await db
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return ((data as any)?.id as string | undefined) ?? null;
}

export type CadenceRuntimeSettings = {
  workspace_id: string;
  morning_time: string;
  afternoon_time: string;
  batch_size: number;
  timezone: string;
  weekdays_only: boolean;
  automation_enabled: boolean;
  last_morning_run_at: string | null;
  last_afternoon_run_at: string | null;
};

/** Todas as configurações de cadência (uma por workspace) — usado pelo cron. */
export async function listCadenceSettings(): Promise<CadenceRuntimeSettings[]> {
  const db = await admin();
  const { data } = await db.from("cadence_settings").select("*");
  return (data ?? []) as CadenceRuntimeSettings[];
}

/** Todos os workspaces (para rodinhas globais como lembretes de reunião). */
export async function listWorkspaceIds(): Promise<string[]> {
  const db = await admin();
  const { data } = await db.from("workspaces").select("id");
  return ((data ?? []) as any[]).map((w) => w.id as string);
}
