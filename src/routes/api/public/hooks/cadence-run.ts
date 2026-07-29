import { createFileRoute } from "@tanstack/react-router";

// Endpoint chamado por pg_cron (a cada 15 min) para disparar os lotes
// da cadência quando o horário configurado for atingido.
// Autenticação: header `apikey` com a chave anon do Supabase.

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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Lembretes de reunião (24h e 1h) rodam em toda passagem do cron.
        let reminders = { sent24: 0, sent1: 0 };
        try {
          const { runMeetingReminders } = await import("@/lib/scheduling.server");
          reminders = await runMeetingReminders();
        } catch (err) {
          console.error("[reminders] falha", err);
        }

        const { data: settingsRow } = await (supabaseAdmin as any)
          .from("cadence_settings")
          .select("*")
          .eq("id", true)
          .maybeSingle();
        const settings = settingsRow as {
          morning_time: string;
          afternoon_time: string;
          batch_size: number;
          timezone: string;
          weekdays_only: boolean;
          automation_enabled: boolean;
          last_morning_run_at: string | null;
          last_afternoon_run_at: string | null;
        } | null;

        if (!settings || !settings.automation_enabled) {
          return Response.json({ ok: true, skipped: "automation_disabled", reminders });
        }

        const tz = settings.timezone || "America/Sao_Paulo";
        const now = new Date();
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: tz,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          weekday: "short",
          hour12: false,
        }).formatToParts(now);
        const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
        const nowMinutes = Number(get("hour")) * 60 + Number(get("minute"));
        const today = `${get("year")}-${get("month")}-${get("day")}`;
        const weekday = get("weekday"); // Mon, Tue, ...
        const isWeekend = weekday === "Sat" || weekday === "Sun";
        if (settings.weekdays_only && isWeekend) {
          return Response.json({ ok: true, skipped: "weekend", reminders });
        }

        const toMinutes = (hhmm: string) => {
          const [h, m] = hhmm.split(":");
          return Number(h) * 60 + Number(m ?? "0");
        };
        const sameLocalDay = (iso: string | null) => {
          if (!iso) return false;
          const d = new Date(iso);
          const stamp = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(d);
          return stamp === today;
        };

        const morning = toMinutes(settings.morning_time);
        const afternoon = toMinutes(settings.afternoon_time);
        const window = 60; // 60 min de tolerância após o horário

        let slot: "morning" | "afternoon" | null = null;
        if (
          nowMinutes >= morning &&
          nowMinutes < morning + window &&
          !sameLocalDay(settings.last_morning_run_at)
        ) {
          slot = "morning";
        } else if (
          nowMinutes >= afternoon &&
          nowMinutes < afternoon + window &&
          !sameLocalDay(settings.last_afternoon_run_at)
        ) {
          slot = "afternoon";
        }

        if (!slot) {
          return Response.json({ ok: true, skipped: "out_of_window", now: `${get("hour")}:${get("minute")}`, reminders });
        }

        const { runCadenceBatch } = await import("@/lib/cadence-runner.server");
        const result = await runCadenceBatch(slot, settings.batch_size);
        return Response.json({ ok: true, ...result, reminders });
      },
    },
  },
});