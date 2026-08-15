import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saveSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(120).optional().nullable(),
  owner_name: z.string().trim().max(80).optional().nullable(),
});

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

export const getWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadWorkspace } = await import("./workspace.server");
    return loadWorkspace(await wid(context), context.supabase);
  });

export const saveWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { getRolesFor } = await import("./users.server");
    const roles = await getRolesFor(context.userId, workspaceId, context.supabase);
    if (!roles.includes("admin")) {
      throw new Error("Acesso negado: somente administradores podem alterar estes dados.");
    }
    const { saveWorkspace } = await import("./workspace.server");
    return saveWorkspace(workspaceId, data, context.supabase);
  });
