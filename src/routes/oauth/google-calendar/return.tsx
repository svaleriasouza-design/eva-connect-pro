import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({
    meta: [
      { title: "Conectando sua Google Agenda · EVA" },
      { name: "description", content: "Finalizando a conexão da sua conta Google com a EVA." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finalizando a conexão…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (type: "googleCalendarOAuthComplete" | "googleCalendarOAuthFailed", code?: string) => {
      window.opener?.postMessage({ type, connectorId: "google_calendar", code: code ?? null }, window.location.origin);
      window.close();
    };
    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "A autorização não foi concluída.");
      notify("googleCalendarOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("googleCalendarOAuthComplete");
        return;
      }
      setMessage("A autorização terminou sem o código de confirmação.");
      notify("googleCalendarOAuthFailed");
      return;
    }
    notify("googleCalendarOAuthComplete", code);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <h1 className="text-sm text-muted-foreground">{message}</h1>
    </main>
  );
}
