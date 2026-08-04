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
    const { calendarConfigured, listCalendars } = await import("./google-calendar.server");
    if (!(await calendarConfigured(await wid(context)))) {
      return { connected: false as const, error: "Google Calendar ainda não conectado." };
    }
    const res = await listCalendars();
    if (!res.ok) return { connected: false as const, error: res.error };
    const primary = res.data.items?.find((c) => c.primary) ?? res.data.items?.[0];
    return { connected: true as const, calendar: primary?.summary ?? "primary", total: res.data.items?.length ?? 0 };
  });

export const suggestSlotsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ duration: z.number().min(15).max(240).default(30) }).parse(raw))
  .handler(async ({ data }) => {
    const { suggestSlots } = await import("./google-calendar.server");
    const res = await suggestSlots({ durationMinutes: data.duration, limit: 5 });
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
    const res = await rescheduleMeeting(await wid(context), data.contactId, new Date(data.startIso).toISOString());
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error === "busy" ? "Horário ocupado." : res.error };
  });

export const cancelMeetingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ contactId: z.string().uuid(), motivo: z.string().max(300).optional() }).parse(raw))
  .handler(async ({ data, context }) => {
    const { cancelMeeting } = await import("./scheduling.server");
    const res = await cancelMeeting(await wid(context), data.contactId, data.motivo ?? "Cancelado pela Valéria na Agenda da EVA");
    return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
  });
