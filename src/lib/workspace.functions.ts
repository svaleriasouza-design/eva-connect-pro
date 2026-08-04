import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const saveSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(120).optional().nullable(),
  owner_name: z.string().trim().max(80).optional().nullable(),
});

export const getWorkspaceFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const { loadWorkspace } = await import("./workspace.server");
    return loadWorkspace(await currentWorkspaceId(context.supabase));
  });

export const saveWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { currentWorkspaceId } = await import("./workspace-scope.server");
    const wid = await currentWorkspaceId(context.supabase);
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin"], wid);
    const { saveWorkspace } = await import("./workspace.server");
    return saveWorkspace(wid, data);
  });
