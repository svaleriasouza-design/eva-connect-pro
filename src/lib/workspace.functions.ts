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
  .handler(async () => {
    const { loadWorkspace } = await import("./workspace.server");
    return loadWorkspace();
  });

export const saveWorkspaceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./users.server");
    await requireRole(context.userId, ["admin"]);
    const { saveWorkspace } = await import("./workspace.server");
    return saveWorkspace(data);
  });
