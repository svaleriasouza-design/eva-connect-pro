// Helpers server-only da camada de plataforma (admin único, VIP, degustação).

export type PlatformAccessRow = {
  user_id: string;
  is_platform_admin: boolean;
  vip: boolean;
  trial_ends_at: string | null;
  access_revoked: boolean;
};

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export async function getPlatformAccess(userId: string): Promise<PlatformAccessRow> {
  const db = await admin();
  const { data } = await db
    .from("platform_access")
    .select("user_id, is_platform_admin, vip, trial_ends_at, access_revoked")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return data as PlatformAccessRow;
  await db.from("platform_access").insert({ user_id: userId });
  return { user_id: userId, is_platform_admin: false, vip: false, trial_ends_at: null, access_revoked: false };
}

export async function requirePlatformAdmin(userId: string) {
  const row = await getPlatformAccess(userId);
  if (!row.is_platform_admin) {
    throw new Error("Acesso restrito à administradora da plataforma.");
  }
  return row;
}

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  is_platform_admin: boolean;
  vip: boolean;
  trial_ends_at: string | null;
  access_revoked: boolean;
  subscription_status: string | null;
  current_period_end: string | null;
  hasAccess: boolean;
  accessLabel: string;
};

export async function listPlatformUsers(env: "sandbox" | "live"): Promise<AdminUserRow[]> {
  const db = await admin();
  const [{ data: profiles }, { data: access }, { data: subs }] = await Promise.all([
    db.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
    db.from("platform_access").select("user_id, is_platform_admin, vip, trial_ends_at, access_revoked"),
    db
      .from("subscriptions")
      .select("user_id, status, current_period_end, created_at")
      .eq("environment", env)
      .order("created_at", { ascending: false }),
  ]);

  const accessBy = new Map<string, PlatformAccessRow>();
  for (const a of (access ?? []) as PlatformAccessRow[]) accessBy.set(a.user_id, a);
  const subBy = new Map<string, { status: string; current_period_end: string | null }>();
  for (const s of (subs ?? []) as any[]) if (!subBy.has(s.user_id)) subBy.set(s.user_id, s);

  const now = Date.now();
  return ((profiles ?? []) as any[]).map((p) => {
    const a = accessBy.get(p.id) ?? {
      user_id: p.id,
      is_platform_admin: false,
      vip: false,
      trial_ends_at: null,
      access_revoked: false,
    };
    const sub = subBy.get(p.id) ?? null;
    const subEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const subActive =
      !!sub &&
      ((["active", "trialing", "past_due"].includes(sub.status) && (subEnd === null || subEnd > now)) ||
        (sub.status === "canceled" && subEnd !== null && subEnd > now));
    const trialActive = !!a.trial_ends_at && new Date(a.trial_ends_at).getTime() > now;

    let hasAccess: boolean;
    let accessLabel: string;
    if (a.is_platform_admin) {
      hasAccess = true;
      accessLabel = "Administradora";
    } else if (a.access_revoked) {
      hasAccess = false;
      accessLabel = "Revogado";
    } else if (a.vip) {
      hasAccess = true;
      accessLabel = "VIP";
    } else if (trialActive) {
      hasAccess = true;
      accessLabel = "Degustação";
    } else if (subActive) {
      hasAccess = true;
      accessLabel = "Assinante ativo";
    } else {
      hasAccess = false;
      accessLabel = "Inativo";
    }

    return {
      id: p.id as string,
      email: (p.email ?? "") as string,
      full_name: (p.full_name ?? "") as string,
      created_at: p.created_at as string,
      is_platform_admin: a.is_platform_admin,
      vip: a.vip,
      trial_ends_at: a.trial_ends_at,
      access_revoked: a.access_revoked,
      subscription_status: sub?.status ?? null,
      current_period_end: sub?.current_period_end ?? null,
      hasAccess,
      accessLabel,
    };
  });
}

export async function updatePlatformAccess(userId: string, patch: Record<string, unknown>) {
  const db = await admin();
  const { error } = await db.from("platform_access").upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}
