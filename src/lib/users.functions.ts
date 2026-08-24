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
    const { data: ws } = await context.supabase
      .from("workspaces")
      .select("owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle();
    const ownerUserId = ((ws as any)?.owner_user_id ?? null) as string | null;
    return {
      workspaceId,
      userId: context.userId,
      email,
      name,
      roles,
      isAdmin: roles.includes("admin"),
      canSend: roles.includes("admin") || roles.includes("operador"),
      ownerUserId,
      isOwner: ownerUserId === context.userId,
    };
  });


export const getWorkspaceOwnerFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await wid(context);
    const { data } = await context.supabase
      .from("workspaces")
      .select("owner_user_id")
      .eq("id", workspaceId)
      .maybeSingle();
    return { workspaceId, ownerUserId: ((data as any)?.owner_user_id ?? null) as string | null };
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

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().max(80).optional(),
  role: z.enum(["admin", "operador", "leitor"]),
});

/** Cria um usuário adicional já dentro do workspace do proprietário. */
export const createWorkspaceUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./users.server");
    const workspaceId = await wid(context);
    await requireRole(context.userId, ["admin"], workspaceId, context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const { data: existing } = await sb
      .from("profiles")
      .select("id, email, full_name")
      .ilike("email", data.email)
      .maybeSingle();

    if (existing) {
      const { data: rolesRows } = await sb
        .from("user_roles")
        .select("workspace_id")
        .eq("user_id", existing.id);
      const rows = (rolesRows ?? []) as { workspace_id: string }[];
      if (rows.some((r) => r.workspace_id === workspaceId)) {
        throw new Error("Este usuário já está no seu workspace.");
      }
      if (rows.length > 0) {
        throw new Error("Este e-mail já pertence a outra conta da EVA. Cada login pertence a um único workspace.");
      }
      const { error } = await sb
        .from("user_roles")
        .insert({ user_id: existing.id, role: data.role, workspace_id: workspaceId });
      if (error) throw new Error(error.message);
      return { ok: true as const, name: existing.full_name || existing.email };
    }

    const { data: created, error: createError } = await sb.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName || data.email.split("@")[0],
        invited_workspace_id: workspaceId,
        invited_role: data.role,
      },
    });
    if (createError) throw new Error(createError.message);

    const newId = created?.user?.id as string | undefined;
    if (!newId) throw new Error("Não foi possível criar o usuário.");

    // Garante o vínculo mesmo que a trigger não tenha aplicado o convite.
    const { data: roleRows } = await sb.from("user_roles").select("workspace_id").eq("user_id", newId);
    if (!((roleRows ?? []) as any[]).length) {
      await sb.from("user_roles").insert({ user_id: newId, role: data.role, workspace_id: workspaceId });
    }
    return { ok: true as const, name: data.fullName || data.email };
  });

/** Exclui definitivamente um usuário adicional da plataforma. Nenhum dado do workspace é apagado. */
export const deleteWorkspaceUserFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./users.server");
    const workspaceId = await wid(context);
    await requireRole(context.userId, ["admin"], workspaceId, context.supabase);

    if (data.userId === context.userId) {
      throw new Error("Você não pode excluir seu próprio usuário.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb = supabaseAdmin as any;

    const { data: ws } = await sb.from("workspaces").select("owner_user_id").eq("id", workspaceId).maybeSingle();
    const ownerUserId = (ws as any)?.owner_user_id ?? null;
    if (ownerUserId !== context.userId) {
      throw new Error("Somente o proprietário do workspace pode excluir usuários.");
    }
    if (data.userId === ownerUserId) {
      throw new Error("O proprietário do workspace não pode ser excluído.");
    }

    const { data: member } = await sb
      .from("user_roles")
      .select("user_id")
      .eq("user_id", data.userId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!member) throw new Error("Este usuário não pertence ao seu workspace.");

    await sb.from("user_roles").delete().eq("user_id", data.userId).eq("workspace_id", workspaceId);

    const { error } = await sb.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);

    return { ok: true as const };
  });
