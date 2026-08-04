import { createFileRoute } from "@tanstack/react-router";

// Endpoint chamado por pg_cron (a cada 15 min) para tocar a operação contínua
// da EVA em TODOS os workspaces: prospecção Dia 1, progressão Dia 2..N,
// encerramentos e lembretes de reunião. Cada workspace tem seus próprios
// horários, lote de novos leads e fuso.
// Autenticação: header `apikey` com a chave anon do Supabase.

type Slot = "morning" | "afternoon";

function pickSlot(settings: {
  morning_time: string;
  afternoon_time: string;
  timezone: string;
  weekdays_only: boolean;
  last_morning_run_at: string | null;
  last_afternoon_run_at: string | null;
}): { slot: Slot | null; reason: string } {
  const tz = settings.timezone || "America/Sao_Paulo";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const nowMinutes = Number(get("hour")) * 60 + Number(get("minute"));
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  const weekday = get("weekday");

  if (settings.weekdays_only && (weekday === "Sat" || weekday === "Sun")) {
    return { slot: null, reason: "weekend" };
  }

  const toMinutes = (hhmm: string) => {
    const [h, m] = (hhmm ?? "09:00").split(":");
    return Number(h) * 60 + Number(m ?? 0);
  };
  const sameLocalDay = (iso: string | null) => {
    if (!iso) return false;
    const stamp = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
    return stamp === today;
  };

  const morning = toMinutes(settings.morning_time);
  const afternoon = toMinutes(settings.afternoon_time);
  const windowMin = 60;

  if (nowMinutes >= morning && nowMinutes < morning + windowMin && !sameLocalDay(settings.last_morning_run_at)) {
    return { slot: "morning", reason: "ok" };
  }
  if (
    nowMinutes >= afternoon &&
    nowMinutes < afternoon + windowMin &&
    !sameLocalDay(settings.last_afternoon_run_at)
  ) {
    return { slot: "afternoon", reason: "ok" };
  }
  return { slot: null, reason: "out_of_window" };
}

export const Route = createFileRoute("/api/public/hooks/cadence-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (expected && apikey !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        const { listCadenceSettings } = await import("@/lib/workspace-scope.server");
        const { runCadenceBatch } = await import("@/lib/cadence-runner.server");
        const { runMeetingReminders } = await import("@/lib/scheduling.server");

        const all = await listCadenceSettings();
        const results: any[] = [];

        for (const settings of all) {
          const wid = settings.workspace_id;
          const entry: any = { workspaceId: wid };

          // Lembretes de reunião rodam em toda passagem, por workspace.
          try {
            entry.reminders = await runMeetingReminders(wid);
          } catch (err) {
            entry.reminders_error = err instanceof Error ? err.message : String(err);
          }

          if (!settings.automation_enabled) {
            entry.skipped = "automation_disabled";
            results.push(entry);
            continue;
          }

          const { slot, reason } = pickSlot(settings);
          if (!slot) {
            entry.skipped = reason;
            results.push(entry);
            continue;
          }

          try {
            entry.run = await runCadenceBatch(wid, slot, settings.batch_size ?? 10);
          } catch (err) {
            entry.error = err instanceof Error ? err.message : String(err);
          }
          results.push(entry);
        }

        return Response.json({ ok: true, workspaces: results.length, results });
      },
    },
  },
});
