// Integração Google Calendar via Lovable Connector Gateway (server-only).
// Conector: google_calendar. Segredos injetados após conectar a conta:
//   LOVABLE_API_KEY + GOOGLE_CALENDAR_API_KEY

const GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export const DEFAULT_TZ = "America/Sao_Paulo";
export const WORK_START_HOUR = 9;
export const WORK_END_HOUR = 18;

/**
 * A conexão do Google Calendar pertence à conta que autorizou o conector.
 * Por isolamento, apenas o workspace dono da conexão pode usá-la.
 */
export async function calendarConfigured(workspaceId: string) {
  if (!(process.env.LOVABLE_API_KEY && process.env.GOOGLE_CALENDAR_API_KEY)) return false;
  const { legacyWorkspaceId } = await import("./workspace-scope.server");
  return workspaceId === (await legacyWorkspaceId());
}

type GcalResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function gcal<T = any>(
  path: string,
  init: { method?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<GcalResult<T>> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const connKey = process.env.GOOGLE_CALENDAR_API_KEY;
  if (!lovableKey || !connKey) {
    return { ok: false, error: "Google Calendar não conectado. Conecte a conta em Configurações." };
  }
  const qs = init.query ? `?${new URLSearchParams(init.query).toString()}` : "";
  let res: Response;
  try {
    res = await fetch(`${GATEWAY}${path}${qs}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
  } catch (err) {
    return { ok: false, error: `Falha de rede ao contatar Google Calendar: ${err instanceof Error ? err.message : String(err)}` };
  }
  const raw = await res.text().catch(() => "");
  let json: any = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    json = null;
  }
  if (!res.ok || json?.error) {
    const msg = json?.error?.message || json?.message || raw || `HTTP ${res.status}`;
    console.error(`[gcal] ${init.method ?? "GET"} ${path} -> ${res.status}: ${msg}`);
    return { ok: false, error: `Google Calendar [${res.status}]: ${msg}` };
  }
  return { ok: true, data: (json ?? {}) as T };
}

export async function listCalendars() {
  return gcal<{ items?: Array<{ id: string; summary: string; primary?: boolean }> }>("/users/me/calendarList");
}

export type BusySlot = { start: string; end: string };

export async function getBusy(timeMinIso: string, timeMaxIso: string, calendarId = "primary"): Promise<GcalResult<BusySlot[]>> {
  const res = await gcal<any>("/freeBusy", {
    method: "POST",
    body: { timeMin: timeMinIso, timeMax: timeMaxIso, timeZone: DEFAULT_TZ, items: [{ id: calendarId }] },
  });
  if (!res.ok) return res;
  const cal = res.data?.calendars?.[calendarId] ?? Object.values(res.data?.calendars ?? {})[0];
  return { ok: true, data: ((cal as any)?.busy ?? []) as BusySlot[] };
}

export async function isSlotFree(startIso: string, durationMinutes: number): Promise<GcalResult<boolean>> {
  const start = new Date(startIso);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const busy = await getBusy(start.toISOString(), end.toISOString());
  if (!busy.ok) return busy;
  const overlap = busy.data.some((b) => new Date(b.start) < end && new Date(b.end) > start);
  return { ok: true, data: !overlap };
}

/** Sugere horários livres em horário comercial nos próximos `days` dias úteis. */
export async function suggestSlots(opts: {
  fromIso?: string;
  days?: number;
  durationMinutes?: number;
  limit?: number;
}): Promise<GcalResult<string[]>> {
  const duration = opts.durationMinutes ?? 30;
  const days = opts.days ?? 7;
  const limit = opts.limit ?? 3;
  const from = opts.fromIso ? new Date(opts.fromIso) : new Date();
  const start = new Date(Math.max(from.getTime(), Date.now() + 60 * 60000));
  const end = new Date(start.getTime() + days * 24 * 3600 * 1000);
  const busyRes = await getBusy(start.toISOString(), end.toISOString());
  if (!busyRes.ok) return busyRes;
  const busy = busyRes.data.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const);

  const out: string[] = [];
  const cursor = new Date(start);
  cursor.setMinutes(cursor.getMinutes() > 30 ? 60 : 30, 0, 0);
  while (cursor < end && out.length < limit) {
    const local = localParts(cursor);
    const weekend = local.weekday === "Sat" || local.weekday === "Sun";
    if (!weekend && local.hour >= WORK_START_HOUR && local.hour < WORK_END_HOUR) {
      const s = cursor.getTime();
      const e = s + duration * 60000;
      const conflict = busy.some(([bs, be]) => bs < e && be > s);
      if (!conflict) out.push(new Date(s).toISOString());
    }
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return { ok: true, data: out };
}

export function localParts(d: Date, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

/** Verifica se um horário cai em dia útil e dentro do horário comercial (09h–18h, Brasília). */
export function isBusinessSlot(iso: string, durationMinutes = 30, tz = DEFAULT_TZ) {
  const start = new Date(iso);
  if (isNaN(start.getTime())) return { ok: false as const, reason: "invalid" as const };
  const s = localParts(start, tz);
  if (s.weekday === "Sat" || s.weekday === "Sun") return { ok: false as const, reason: "weekend" as const };
  if (s.hour < WORK_START_HOUR || s.hour >= WORK_END_HOUR) return { ok: false as const, reason: "after_hours" as const };
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const e = localParts(end, tz);
  if (e.hour > WORK_END_HOUR || (e.hour === WORK_END_HOUR && e.minute > 0)) {
    return { ok: false as const, reason: "after_hours" as const };
  }
  return { ok: true as const, reason: "ok" as const };
}

function localPartsLegacy(d: Date, tz = DEFAULT_TZ) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

export function formatBr(iso: string, tz = DEFAULT_TZ) {
  const d = new Date(iso);
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric", weekday: "long" }).format(d);
  const hora = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(d);
  return { data, hora, completo: `${data} às ${hora}` };
}

export type CreatedEvent = { id: string; meetLink?: string; htmlLink?: string };

export async function createEvent(opts: {
  summary: string;
  description?: string;
  startIso: string;
  durationMinutes: number;
  attendeeEmail?: string | null;
  withMeet?: boolean;
  calendarId?: string;
}): Promise<GcalResult<CreatedEvent>> {
  const calendarId = opts.calendarId ?? "primary";
  const end = new Date(new Date(opts.startIso).getTime() + opts.durationMinutes * 60000).toISOString();
  const body: any = {
    summary: opts.summary,
    description: opts.description ?? "",
    start: { dateTime: opts.startIso, timeZone: DEFAULT_TZ },
    end: { dateTime: end, timeZone: DEFAULT_TZ },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 24 * 60 }, { method: "popup", minutes: 60 }] },
  };
  if (opts.attendeeEmail) body.attendees = [{ email: opts.attendeeEmail }];
  if (opts.withMeet !== false) {
    body.conferenceData = {
      createRequest: { requestId: `eva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, conferenceSolutionKey: { type: "hangoutsMeet" } },
    };
  }
  const res = await gcal<any>(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body,
    query: { conferenceDataVersion: "1", sendUpdates: "all" },
  });
  if (!res.ok) return res;
  return {
    ok: true,
    data: {
      id: res.data.id,
      meetLink: res.data.hangoutLink ?? res.data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri,
      htmlLink: res.data.htmlLink,
    },
  };
}

export async function updateEvent(eventId: string, startIso: string, durationMinutes: number, calendarId = "primary") {
  const end = new Date(new Date(startIso).getTime() + durationMinutes * 60000).toISOString();
  return gcal<any>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: { start: { dateTime: startIso, timeZone: DEFAULT_TZ }, end: { dateTime: end, timeZone: DEFAULT_TZ } },
    query: { sendUpdates: "all" },
  });
}

export async function deleteEvent(eventId: string, calendarId = "primary") {
  return gcal<any>(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    query: { sendUpdates: "all" },
  });
}
