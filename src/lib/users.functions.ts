import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "operador", "leitor"]),
});

export const getMyAccessFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getRolesFor, displayNameFor } = await import("./users.server");
    const roles = await getRolesFor(context.userId);
    const email = ((context.claims as any)?.email as string | undefined) ?? "";
    return {
      userId: context.userId,
      email,
      name: await displayNameFor(context.userId, email),
      roles,
      isAdmin: roles.includes("admin"),
      canSend: roles.includes("admin") || roles.includes("operador"),
    };
  });

export const listUsersFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { requireRole, listUsersWithRoles } = await import("./users.server");
    await requireRole(context.userId, ["admin"]);
    return listUsersWithRoles();
  });

export const setUserRoleFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => roleSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole, setUserRole } = await import("./users.server");
    await requireRole(context.userId, ["admin"]);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    await setUserRole(data.userId, data.role);
    return { ok: true as const };
  });
