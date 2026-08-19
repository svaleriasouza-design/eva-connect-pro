import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const envSchema = z.object({ environment: z.enum(["sandbox", "live"]) });

export const getPlatformStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getPlatformAccess } = await import("./platform.server");
    const row = await getPlatformAccess(context.userId);
    return {
      isPlatformAdmin: row.is_platform_admin,
      vip: row.vip,
      trialEndsAt: row.trial_ends_at,
      revoked: row.access_revoked,
    };
  });

export const listPlatformUsersFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => envSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin, listPlatformUsers } = await import("./platform.server");
    await requirePlatformAdmin(context.userId);
    return listPlatformUsers(data.environment);
  });

const trialSchema = z.object({ userId: z.string().uuid(), days: z.number().int().min(1).max(365) });

export const grantTrialFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => trialSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin, updatePlatformAccess } = await import("./platform.server");
    await requirePlatformAdmin(context.userId);
    const ends = new Date(Date.now() + data.days * 24 * 60 * 60 * 1000).toISOString();
    await updatePlatformAccess(data.userId, { trial_ends_at: ends, access_revoked: false });
    return { ok: true as const, trialEndsAt: ends };
  });

const userSchema = z.object({ userId: z.string().uuid() });

export const grantVipFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin, updatePlatformAccess } = await import("./platform.server");
    await requirePlatformAdmin(context.userId);
    await updatePlatformAccess(data.userId, { vip: true, access_revoked: false });
    return { ok: true as const };
  });

export const revokeAccessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => userSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin, updatePlatformAccess, getPlatformAccess } = await import("./platform.server");
    await requirePlatformAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("Você não pode revogar seu próprio acesso.");
    const target = await getPlatformAccess(data.userId);
    if (target.is_platform_admin) throw new Error("Remova o perfil de administradora antes de revogar o acesso.");
    await updatePlatformAccess(data.userId, { vip: false, trial_ends_at: null, access_revoked: true });
    return { ok: true as const };
  });

const adminSchema = z.object({ userId: z.string().uuid(), isAdmin: z.boolean() });

export const setPlatformAdminFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => adminSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { requirePlatformAdmin, updatePlatformAccess } = await import("./platform.server");
    await requirePlatformAdmin(context.userId);
    if (data.userId === context.userId && !data.isAdmin) {
      throw new Error("Você não pode remover seu próprio perfil de administradora.");
    }
    await updatePlatformAccess(data.userId, { is_platform_admin: data.isAdmin, access_revoked: false });
    return { ok: true as const };
  });
