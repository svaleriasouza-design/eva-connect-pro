import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

export const listSaturdayRequestsFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { listPendingSaturdayRequests } = await import("./saturday.server");
    return listPendingSaturdayRequests(await wid(context));
  });

export const decideSaturdayRequestFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ requestId: z.string().uuid(), approve: z.boolean() }).parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { requireRole, displayNameFor } = await import("./users.server");
    await requireRole(context.userId, ["admin", "operador"], workspaceId);
    const email = ((context.claims as any)?.email as string | undefined) ?? "";
    const { decideSaturdayRequest } = await import("./saturday.server");
    return decideSaturdayRequest({
      workspaceId,
      requestId: data.requestId,
      approve: data.approve,
      userId: context.userId,
      userName: await displayNameFor(context.userId, email),
    });
  });
