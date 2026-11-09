import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function guard(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  const { requireRole } = await import("./users.server");
  const workspaceId = await currentWorkspaceId(context.supabase);
  await requireRole(context.userId, ["admin"], workspaceId, context.supabase);
  return workspaceId;
}

export const embeddedConfigFn = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  const { getRolesFor } = await import("./users.server");
  const workspaceId = await currentWorkspaceId(context.supabase);
  const roles = await getRolesFor(context.userId, workspaceId, context.supabase);
  const { embeddedConfig } = await import("./meta-embedded.server");
  const config = embeddedConfig();
  return { ready: config.ready, canConnect: roles.includes("admin"), appId: config.appId, configId: config.configId, graphVersion: config.graphVersion, flowVersion: 4 };
});

export const beginEmbeddedFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const workspaceId = await guard(context);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { beginEmbedded } = await import("./meta-embedded.server");
  return beginEmbedded(supabaseAdmin, context.userId, workspaceId);
});

export const finishEmbeddedFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attemptId: z.string().uuid(), code: z.string().min(10).max(8192), wabaId: z.string().regex(/^\d{3,64}$/), phoneNumberId: z.string().regex(/^\d{3,64}$/), pin: z.string().regex(/^\d{6}$/) }).parse(input))
  .handler(async ({ context, data }) => {
    const workspaceId = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { finishEmbedded } = await import("./meta-embedded.server");
    return finishEmbedded(supabaseAdmin, context.userId, workspaceId, data);
  });

export const cancelEmbeddedFn = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attemptId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const workspaceId = await guard(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("meta_embedded_attempts").update({ status: "cancelled" }).eq("id", data.attemptId).eq("workspace_id", workspaceId).eq("user_id", context.userId).eq("status", "pending");
    if (error) throw new Error("Não foi possível encerrar a tentativa.");
    return { ok: true };
  });