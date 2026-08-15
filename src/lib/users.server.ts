// Helpers server-only para papéis de acesso — sempre escopados ao workspace.

export type AppRole = "admin" | "operador" | "leitor";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function getRolesFor(
  userId: string,
  workspaceId: string,
  supabase?: any,
): Promise<AppRole[]> {
  if (supabase) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId);
    return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
  }
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await (supabaseAdmin as any)
    .from("user_roles")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
}

export async function requireRole(userId: string, allowed: AppRole[], workspaceId: string, supabase?: any) {
  const roles = await getRolesFor(userId, workspaceId, supabase);
  if (!roles.some((r) => allowed.includes(r))) {
    throw new Error("Acesso negado: seu usuário não tem permissão para esta ação.");
  }
  return roles;
}

export async function displayNameFor(userId: string, fallback: string): Promise<string> {
  const db = await admin();
  const { data } = await db.from("profiles").select("full_name, email").eq("id", userId).maybeSingle();
  const row = (data ?? null) as { full_name: string | null; email: string | null } | null;
  return (row?.full_name || row?.email || fallback || "usuário").trim();
}

/** Lista apenas os membros do workspace informado. Usa o cliente autenticado. */
export async function listUsersWithRoles(workspaceId: string, supabase?: any) {
  const sb = supabase ?? (await admin());
  const { data: roles } = await sb
    .from("user_roles")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId);
  const rows = (roles ?? []) as { user_id: string; role: AppRole; created_at: string }[];
  const ids = Array.from(new Set(rows.map((r) => r.user_id)));
  if (ids.length === 0) return [];
  const { data: profiles } = await sb
    .from("profiles")
    .select("id, email, full_name, created_at")
    .in("id", ids)
    .order("created_at", { ascending: true });
  const byUser = new Map<string, AppRole[]>();
  for (const r of rows) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
  return ((profiles ?? []) as any[]).map((p) => ({
    id: p.id as string,
    email: (p.email ?? "") as string,
    full_name: (p.full_name ?? "") as string,
    created_at: p.created_at as string,
    roles: byUser.get(p.id) ?? [],
  }));
}

export async function setUserRole(userId: string, role: AppRole, workspaceId: string, supabase?: any) {
  const sb = supabase ?? (await admin());
  const existing = await getRolesFor(userId, workspaceId, sb);
  if (existing.length === 0) {
    throw new Error("Este usuário não pertence ao seu workspace.");
  }
  await sb.from("user_roles").delete().eq("user_id", userId).eq("workspace_id", workspaceId);
  const { error } = await sb
    .from("user_roles")
    .insert({ user_id: userId, role, workspace_id: workspaceId });
  if (error) throw new Error(error.message);
}
