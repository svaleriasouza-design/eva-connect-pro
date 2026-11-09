// Camada de resolução dos NÚMEROS de WhatsApp de um workspace.
// Relação: 1 workspace -> N números (tabela public.whatsapp_numbers).
// Toda credencial fica aqui no backend; nunca vai para o frontend.

export type WaNumberRow = {
  id: string;
  workspace_id: string;
  label: string;
  display_phone: string | null;
  phone_number_id: string;
  waba_id: string | null;
  access_token: string | null;
  encrypted_access_token?: string | null;
  connection_source?: string;
  meta_app_id?: string | null;
  token_expires_at?: string | null;
  app_secret: string | null;
  verify_token: string | null;
  graph_version: string | null;
  default_template_name: string | null;
  default_template_lang: string | null;
  active: boolean;
  is_primary: boolean;
  connection_status: string | null;
  connection_error: string | null;
  last_checked_at: string | null;
  connected_at: string | null;
  created_at: string;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function hydrateNumber(n: WaNumberRow): Promise<WaNumberRow> {
  if (n.connection_source !== "embedded") return n;
  const { decryptMetaToken } = await import("./meta-token-crypto.server");
  const expectedApp = process.env["META_EMBEDDED_APP_ID"];
  if (!expectedApp || n.meta_app_id !== expectedApp) throw new Error("Aplicativo Meta da conexão não corresponde à configuração atual.");
  return { ...n, access_token: n.encrypted_access_token ? decryptMetaToken(n.encrypted_access_token, n.workspace_id, n.phone_number_id) : null,
    app_secret: process.env["META_EMBEDDED_APP_SECRET"] ?? null, verify_token: process.env["META_WA_VERIFY_TOKEN"] ?? null };
}

/** Todos os números do workspace (inclui inativos). */
export async function listWaNumbers(workspaceId: string): Promise<WaNumberRow[]> {
  const db = await admin();
  const { data } = await db
    .from("whatsapp_numbers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as WaNumberRow[];
}

/** Números ativos e utilizáveis para envio. */
export async function listActiveWaNumbers(workspaceId: string): Promise<WaNumberRow[]> {
  const numbers = (await listWaNumbers(workspaceId)).filter((n) => n.active && n.phone_number_id && (n.connection_source === "embedded" ? n.encrypted_access_token : n.access_token));
  return Promise.all(numbers.map(hydrateNumber));
}

/** Um número específico (validando o workspace). */
export async function getWaNumber(workspaceId: string, id: string): Promise<WaNumberRow | null> {
  const db = await admin();
  const { data } = await db
    .from("whatsapp_numbers")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("id", id)
    .maybeSingle();
  return data ? hydrateNumber(data as WaNumberRow) : null;
}

/**
 * Número que deve ser usado para enviar. Ordem:
 * 1) o número pedido explicitamente (se ativo);
 * 2) o número principal ativo do workspace;
 * 3) o primeiro número ativo.
 */
export async function resolveSendNumber(
  workspaceId: string,
  preferredId?: string | null,
): Promise<WaNumberRow | null> {
  const actives = await listActiveWaNumbers(workspaceId);
  if (preferredId) {
    const hit = actives.find((n) => n.id === preferredId);
    if (hit) return hit;
  }
  return actives.find((n) => n.is_primary) ?? actives[0] ?? null;
}

/** Identifica o número (e o workspace) a partir do phone_number_id do webhook da Meta. */
export async function waNumberByPhoneNumberId(phoneNumberId: string): Promise<WaNumberRow | null> {
  if (!phoneNumberId) return null;
  const db = await admin();
  // Ambiguous ownership must never select another company's credentials.
  const { data } = await db
    .from("whatsapp_numbers")
    .select("*")
    .eq("phone_number_id", String(phoneNumberId))
    .order("active", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(2);
  if (!data || data.length !== 1) return null;
  return hydrateNumber(data[0] as WaNumberRow);
}

/** Identifica o workspace pelo verify token de qualquer um dos números. */
export async function waNumberByVerifyToken(token: string): Promise<WaNumberRow | null> {
  if (!token) return null;
  const db = await admin();
  const { data } = await db
    .from("whatsapp_numbers")
    .select("*")
    .eq("verify_token", token)
    .limit(1);
  return ((data ?? [])[0] as WaNumberRow) ?? null;
}