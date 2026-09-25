import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function wid(context: any) {
  const { currentWorkspaceId } = await import("./workspace-scope.server");
  return currentWorkspaceId(context.supabase);
}

export const getCalendarStatusFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await wid(context);
    const { getConnectionForUser } = await import("./google-connection.server");
    const mine = await getConnectionForUser(context.userId);
    if (!mine || mine.workspaceId !== workspaceId) {
      return { connected: false as const, reconnectRequired: false, error: "Sua Google Agenda ainda não está conectada." };
    }
    if (mine.reconnectRequired) {
      return {
        connected: false as const,
        reconnectRequired: true,
        email: mine.googleEmail,
        error: "Sua Google Agenda precisa ser reconectada.",
      };
    }
    const { listCalendars } = await import("./google-calendar.server");
    const res = await listCalendars({ workspaceId, userId: context.userId });
    if (!res.ok) return { connected: false as const, reconnectRequired: false, email: mine.googleEmail, error: res.error };
    const primary = res.data.items?.find((c) => c.primary) ?? res.data.items?.[0];
    return {
      connected: true as const,
      reconnectRequired: false,
      email: mine.googleEmail ?? primary?.id ?? null,
      calendar: primary?.summary ?? "primary",
      total: res.data.items?.length ?? 0,
    };
  });

export const suggestSlotsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ duration: z.number().min(15).max(240).default(30) }).parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { suggestSlots } = await import("./google-calendar.server");
    const res = await suggestSlots({ workspaceId, userId: context.userId }, { durationMinutes: data.duration, limit: 5 });
    return res.ok ? { ok: true as const, slots: res.data } : { ok: false as const, error: res.error };
  });

export const scheduleMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        contactId: z.string().uuid(),
        startIso: z.string().min(10),
        duration: z.number().min(15).max(480).default(30),
        online: z.boolean().default(true),
        title: z.string().max(200).optional(),
      })
      .parse(raw),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { wsDb } = await import("./workspace-scope.server");
    const db = await wsDb(workspaceId);
    const { data: c } = await db
      .from("contacts")
      .select("id, name, email, whatsapp, phone")
      .eq("id", data.contactId)
      .maybeSingle();
    if (!c) return { ok: false as const, error: "Contato não encontrado." };
    const { scheduleMeeting } = await import("./scheduling.server");
    const res = await scheduleMeeting({
      workspaceId,
      userId: context.userId,
      contactId: (c as any).id,
      contactName: (c as any).name,
      phone: (c as any).whatsapp || (c as any).phone || "",
      startIso: new Date(data.startIso).toISOString(),
      durationMinutes: data.duration,
      online: data.online,
      email: (c as any).email,
      title: data.title,
    });
    if (!res.ok) {
      return { ok: false as const, error: res.error === "busy" ? "Horário ocupado no Google Calendar." : res.error };
    }
    return { ok: true as const, meetLink: res.meetLink };
  });

export const rescheduleMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ contactId: z.string().uuid(), startIso: z.string().min(10) }).parse(raw))
  .handler(async ({ data, context }) => {
    const { rescheduleMeeting } = await import("./scheduling.server");
    const res = await rescheduleMeeting(
      await wid(context),
      data.contactId,
      new Date(data.startIso).toISOString(),
      context.userId,
    );
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error === "busy" ? "Horário ocupado." : res.error };
  });

export const cancelMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ contactId: z.string().uuid(), motivo: z.string().max(300).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { cancelMeeting } = await import("./scheduling.server");
    const res = await cancelMeeting(
      await wid(context),
      data.contactId,
      data.motivo ?? "Cancelado na Agenda da EVA",
      context.userId,
    );
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  });

// ---------- Agenda (visões Mês/Semana/Dia) ----------

/** Eventos do Google (conta da usuária logada) + eventos salvos no workspace. */
export const listAgendaEventsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ timeMin: z.string(), timeMax: z.string() }).parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const { data: local } = await context.supabase
      .from("events")
      .select("*, contact:contacts(id, name, email, whatsapp, phone, funnel_stage, company_id), company:companies(name)")
      .gte("starts_at", data.timeMin)
      .lt("starts_at", data.timeMax)
      .neq("status", "cancelado")
      .order("starts_at");
    const rows = (local ?? []) as any[];
    const byGid = new Set(rows.map((r) => r.google_event_id).filter(Boolean));
    const { listEvents } = await import("./google-calendar.server");
    const g = await listEvents({ workspaceId, userId: context.userId }, data.timeMin, data.timeMax);
    const google = g.ok
      ? (g.data.items ?? [])
          .filter((e: any) => e.status !== "cancelled" && !byGid.has(e.id))
          .map((e: any) => {
            const start = e.start?.dateTime ?? (e.start?.date ? `${e.start.date}T00:00:00-03:00` : null);
            const end = e.end?.dateTime ?? (e.end?.date ? `${e.end.date}T00:00:00-03:00` : null);
            const dur = start && end ? Math.max(15, Math.round((+new Date(end) - +new Date(start)) / 60000)) : 30;
            return {
              id: `g:${e.id}`,
              google_event_id: e.id,
              title: e.summary ?? "(sem título)",
              notes: e.description ?? null,
              starts_at: start,
              duration_minutes: dur,
              all_day: Boolean(e.start?.date),
              location: e.location ?? null,
              meet_link: e.hangoutLink ?? null,
              status: "agendado",
              source: "google",
              contact: null,
              company: null,
            };
          })
          .filter((e: any) => e.starts_at)
      : [];
    return { events: [...rows, ...google], googleError: g.ok ? null : g.error };
  });

const upsertSchema = z.object({
  id: z.string().optional(), // id do banco ou "g:<googleId>"
  title: z.string().min(1).max(200),
  notes: z.string().max(5000).optional().nullable(),
  startIso: z.string().min(10),
  duration: z.number().min(15).max(1440),
  online: z.boolean().optional(),
});

export const saveAgendaEventFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => upsertSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const ctx = { workspaceId, userId: context.userId };
    const gc = await import("./google-calendar.server");
    const startIso = new Date(data.startIso).toISOString();
    const notes = data.notes ?? "";

    if (!data.id) {
      const res = await gc.createEvent(ctx, {
        summary: data.title, description: notes, startIso, durationMinutes: data.duration, withMeet: data.online === true,
      });
      if (!res.ok) return { ok: false as const, error: res.error };
      const { error } = await context.supabase.from("events").insert({
        title: data.title, kind: "reuniao", starts_at: startIso, duration_minutes: data.duration,
        notes: notes || null, google_event_id: res.data.id, meet_link: res.data.meetLink ?? null, source: "manual",
      } as any);
      if (error) return { ok: false as const, error: error.message };
      return { ok: true as const };
    }

    if (data.id.startsWith("g:")) {
      const res = await gc.patchEvent(ctx, data.id.slice(2), { summary: data.title, description: notes, startIso, durationMinutes: data.duration });
      return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
    }

    const { data: row } = await context.supabase.from("events").select("id, google_event_id").eq("id", data.id).maybeSingle();
    if (!row) return { ok: false as const, error: "Evento não encontrado." };
    if ((row as any).google_event_id) {
      const res = await gc.patchEvent(ctx, (row as any).google_event_id, { summary: data.title, description: notes, startIso, durationMinutes: data.duration });
      if (!res.ok) return { ok: false as const, error: res.error };
    }
    const { error } = await context.supabase.from("events").update({
      title: data.title, notes: notes || null, starts_at: startIso, duration_minutes: data.duration,
      reminder_24h_sent_at: null, reminder_1h_sent_at: null,
    } as any).eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });

export const deleteAgendaEventFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().min(1) }).parse(raw))
  .handler(async ({ data, context }) => {
    const workspaceId = await wid(context);
    const ctx = { workspaceId, userId: context.userId };
    const gc = await import("./google-calendar.server");
    if (data.id.startsWith("g:")) {
      const res = await gc.deleteEvent(ctx, data.id.slice(2));
      return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
    }
    const { data: row } = await context.supabase.from("events").select("id, google_event_id").eq("id", data.id).maybeSingle();
    if (!row) return { ok: false as const, error: "Evento não encontrado." };
    if ((row as any).google_event_id) {
      const res = await gc.deleteEvent(ctx, (row as any).google_event_id);
      if (!res.ok && !/\[(404|410)\]/.test(res.error)) return { ok: false as const, error: res.error };
    }
    const { error } = await context.supabase.from("events").update({ status: "cancelado" }).eq("id", data.id);
    return error ? { ok: false as const, error: error.message } : { ok: true as const };
  });
