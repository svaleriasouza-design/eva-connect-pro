//#region node_modules/.nitro/vite/services/ssr/assets/google-calendar.server-CSmWKIP6.js
var GATEWAY = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";
var DEFAULT_TZ = "America/Sao_Paulo";
/**
* A conexão do Google Calendar pertence à conta que autorizou o conector.
* Por isolamento, apenas o workspace dono da conexão pode usá-la.
*/
async function calendarConfigured(workspaceId) {
	if (!(process.env.LOVABLE_API_KEY && process.env.GOOGLE_CALENDAR_API_KEY)) return false;
	const { legacyWorkspaceId } = await import("./workspace-scope.server-BnuHkW86.mjs").then((n) => n.t).then((n) => n.t);
	return workspaceId === await legacyWorkspaceId();
}
async function gcal(path, init = {}) {
	const lovableKey = process.env.LOVABLE_API_KEY;
	const connKey = process.env.GOOGLE_CALENDAR_API_KEY;
	if (!lovableKey || !connKey) return {
		ok: false,
		error: "Google Calendar não conectado. Conecte a conta em Configurações."
	};
	const qs = init.query ? `?${new URLSearchParams(init.query).toString()}` : "";
	let res;
	try {
		res = await fetch(`${GATEWAY}${path}${qs}`, {
			method: init.method ?? "GET",
			headers: {
				Authorization: `Bearer ${lovableKey}`,
				"X-Connection-Api-Key": connKey,
				"Content-Type": "application/json"
			},
			body: init.body ? JSON.stringify(init.body) : void 0
		});
	} catch (err) {
		return {
			ok: false,
			error: `Falha de rede ao contatar Google Calendar: ${err instanceof Error ? err.message : String(err)}`
		};
	}
	const raw = await res.text().catch(() => "");
	let json = null;
	try {
		json = raw ? JSON.parse(raw) : null;
	} catch {
		json = null;
	}
	if (!res.ok || json?.error) {
		const msg = json?.error?.message || json?.message || raw || `HTTP ${res.status}`;
		console.error(`[gcal] ${init.method ?? "GET"} ${path} -> ${res.status}: ${msg}`);
		return {
			ok: false,
			error: `Google Calendar [${res.status}]: ${msg}`
		};
	}
	return {
		ok: true,
		data: json ?? {}
	};
}
async function listCalendars() {
	return gcal("/users/me/calendarList");
}
async function getBusy(timeMinIso, timeMaxIso, calendarId = "primary") {
	const res = await gcal("/freeBusy", {
		method: "POST",
		body: {
			timeMin: timeMinIso,
			timeMax: timeMaxIso,
			timeZone: DEFAULT_TZ,
			items: [{ id: calendarId }]
		}
	});
	if (!res.ok) return res;
	return {
		ok: true,
		data: (res.data?.calendars?.[calendarId] ?? Object.values(res.data?.calendars ?? {})[0])?.busy ?? []
	};
}
async function isSlotFree(startIso, durationMinutes) {
	const start = new Date(startIso);
	const end = new Date(start.getTime() + durationMinutes * 6e4);
	const busy = await getBusy(start.toISOString(), end.toISOString());
	if (!busy.ok) return busy;
	return {
		ok: true,
		data: !busy.data.some((b) => new Date(b.start) < end && new Date(b.end) > start)
	};
}
/** Sugere horários livres em horário comercial nos próximos `days` dias úteis. */
async function suggestSlots(opts) {
	const duration = opts.durationMinutes ?? 30;
	const days = opts.days ?? 7;
	const limit = opts.limit ?? 3;
	const from = opts.fromIso ? new Date(opts.fromIso) : /* @__PURE__ */ new Date();
	const start = new Date(Math.max(from.getTime(), Date.now() + 36e5));
	const end = new Date(start.getTime() + days * 24 * 3600 * 1e3);
	const busyRes = await getBusy(start.toISOString(), end.toISOString());
	if (!busyRes.ok) return busyRes;
	const busy = busyRes.data.map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
	const out = [];
	const cursor = new Date(start);
	cursor.setMinutes(cursor.getMinutes() > 30 ? 60 : 30, 0, 0);
	while (cursor < end && out.length < limit) {
		const local = localParts(cursor);
		if (!(local.weekday === "Sat" || local.weekday === "Sun") && local.hour >= 9 && local.hour < 18) {
			const s = cursor.getTime();
			const e = s + duration * 6e4;
			if (!busy.some(([bs, be]) => bs < e && be > s)) out.push(new Date(s).toISOString());
		}
		cursor.setMinutes(cursor.getMinutes() + 30);
	}
	return {
		ok: true,
		data: out
	};
}
function localParts(d, tz = DEFAULT_TZ) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		weekday: "short",
		hour12: false
	}).formatToParts(d);
	const get = (t) => parts.find((p) => p.type === t)?.value ?? "";
	return {
		year: get("year"),
		month: get("month"),
		day: get("day"),
		hour: Number(get("hour")),
		minute: Number(get("minute")),
		weekday: get("weekday")
	};
}
/**
* Verifica se um horário cai dentro do expediente (09h–18h, Brasília).
* Domingo nunca é permitido. Sábado é sinalizado como "saturday" para que a EVA
* possa pedir confirmação — só é aceito quando allowSaturday = true.
*/
function isBusinessSlot(iso, durationMinutes = 30, tz = DEFAULT_TZ, allowSaturday = false) {
	const start = new Date(iso);
	if (isNaN(start.getTime())) return {
		ok: false,
		reason: "invalid"
	};
	const s = localParts(start, tz);
	if (s.weekday === "Sun") return {
		ok: false,
		reason: "sunday"
	};
	if (s.weekday === "Sat" && !allowSaturday) return {
		ok: false,
		reason: "saturday"
	};
	if (s.hour < 9 || s.hour >= 18) return {
		ok: false,
		reason: "after_hours"
	};
	const e = localParts(new Date(start.getTime() + durationMinutes * 6e4), tz);
	if (e.hour > 18 || e.hour === 18 && e.minute > 0) return {
		ok: false,
		reason: "after_hours"
	};
	return {
		ok: true,
		reason: "ok"
	};
}
function formatBr(iso, tz = DEFAULT_TZ) {
	const d = new Date(iso);
	const data = new Intl.DateTimeFormat("pt-BR", {
		timeZone: tz,
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		weekday: "long"
	}).format(d);
	const hora = new Intl.DateTimeFormat("pt-BR", {
		timeZone: tz,
		hour: "2-digit",
		minute: "2-digit"
	}).format(d);
	return {
		data,
		hora,
		completo: `${data} às ${hora}`
	};
}
async function createEvent(opts) {
	const calendarId = opts.calendarId ?? "primary";
	const end = new Date(new Date(opts.startIso).getTime() + opts.durationMinutes * 6e4).toISOString();
	const body = {
		summary: opts.summary,
		description: opts.description ?? "",
		start: {
			dateTime: opts.startIso,
			timeZone: DEFAULT_TZ
		},
		end: {
			dateTime: end,
			timeZone: DEFAULT_TZ
		},
		reminders: {
			useDefault: false,
			overrides: [{
				method: "popup",
				minutes: 1440
			}, {
				method: "popup",
				minutes: 60
			}]
		}
	};
	if (opts.attendeeEmail) body.attendees = [{ email: opts.attendeeEmail }];
	if (opts.withMeet !== false) body.conferenceData = { createRequest: {
		requestId: `eva-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		conferenceSolutionKey: { type: "hangoutsMeet" }
	} };
	const res = await gcal(`/calendars/${encodeURIComponent(calendarId)}/events`, {
		method: "POST",
		body,
		query: {
			conferenceDataVersion: "1",
			sendUpdates: "all"
		}
	});
	if (!res.ok) return res;
	return {
		ok: true,
		data: {
			id: res.data.id,
			meetLink: res.data.hangoutLink ?? res.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri,
			htmlLink: res.data.htmlLink
		}
	};
}
async function updateEvent(eventId, startIso, durationMinutes, calendarId = "primary") {
	const end = new Date(new Date(startIso).getTime() + durationMinutes * 6e4).toISOString();
	return gcal(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
		method: "PATCH",
		body: {
			start: {
				dateTime: startIso,
				timeZone: DEFAULT_TZ
			},
			end: {
				dateTime: end,
				timeZone: DEFAULT_TZ
			}
		},
		query: { sendUpdates: "all" }
	});
}
async function deleteEvent(eventId, calendarId = "primary") {
	return gcal(`/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
		method: "DELETE",
		query: { sendUpdates: "all" }
	});
}
//#endregion
export { DEFAULT_TZ, calendarConfigured, createEvent, deleteEvent, formatBr, isBusinessSlot, isSlotFree, listCalendars, suggestSlots, updateEvent };
