import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "operador", "leitor"]),
});

export const getMyAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRolesFor, displayNameFor } = await import("./users.server");
    const workspaceId = await wid(context);
    const roles = await getRolesFor(context.userId, workspaceId, context.supabase);
    const email = ((context.claims as any)?.email as string | undefined) ?? "";
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const row = (profile ?? null) as { full_name: string | null; email: string | null } | null;
    const name = (row?.full_name || row?.email || email || "usuário").trim();
    return {
      workspaceId,
      userId: context.userId,
      email,
      name,
      roles,
      isAdmin: roles.includes("admin"),
      canSend: roles.includes("admin") || roles.includes("operador"),
    };
  });

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole, listUsersWithRoles } = await import("./users.server");
    const workspaceId = await wid(context);
    await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
    return listUsersWithRoles(workspaceId, context.supabase);
  });

export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole, setUserRole } = await import("./users.server");
    const workspaceId = await wid(context);
    await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    await setUserRole(data.userId, data.role, workspaceId, context.supabase);
    return { ok: true as const };
  });

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "operador", "leitor"]),
});

/** Adiciona um usuário já cadastrado ao workspace do admin, com o papel escolhido. */
export const addUserToWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inviteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./users.server");
    const workspaceId = await wid(context);
    await requireRole(context.userId, ["admin"], workspaceId, context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    // Encontra o usuário pelo email em auth.users via profiles.
    const { data: profile } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", data.email)
      .maybeSingle();

    if (!profile) {
      throw new Error("Usuário não encontrado. Peça para a pessoa se cadastrar na EVA primeiro, depois adicione-a aqui.");
    }

    if (profile.id === context.userId) {
      throw new Error("Você já está neste workspace.");
    }

    // Verifica se já tem role no workspace.
    const { data: existing } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", profile.id)
      .eq("workspace_id", workspaceId);

    if (existing && existing.length > 0) {
      throw new Error("Este usuário já está no seu workspace.");
    }

    const { error } = await sb
      .from("user_roles")
      .insert({ user_id: profile.id, role: data.role, workspace_id: workspaceId });

    if (error) throw new Error(error.message);

    return { ok: true as const, name: profile.full_name || profile.email };
  });
