// Helpers server-only para papéis de acesso.
export type AppRole = "admin" | "operador" | "leitor";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function getRolesFor(userId: string): Promise<AppRole[]> {
  const db = await admin();
  const { data } = await db.from("user_roles").select("role").eq("user_id", userId);
  return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
}

export async function requireRole(userId: string, allowed: AppRole[]) {
  const roles = await getRolesFor(userId);
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

export async function listUsersWithRoles() {
  const db = await admin();
  const [{ data: profiles }, { data: roles }] = await Promise.all([
    db.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: true }),
    db.from("user_roles").select("user_id, role"),
  ]);
  const byUser = new Map<string, AppRole[]>();
  for (const r of (roles ?? []) as { user_id: string; role: AppRole }[]) {
    byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r.role]);
  }
  return ((profiles ?? []) as any[]).map((p) => ({
    id: p.id as string,
    email: (p.email ?? "") as string,
    full_name: (p.full_name ?? "") as string,
    created_at: p.created_at as string,
    roles: byUser.get(p.id) ?? [],
  }));
}

export async function setUserRole(userId: string, role: AppRole) {
  const db = await admin();
  await db.from("user_roles").delete().eq("user_id", userId);
  const { error } = await db.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
}
