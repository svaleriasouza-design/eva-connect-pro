import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/tpl-test")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.META_WA_APP_SECRET ?? "";
        if (request.headers.get("x-test-secret") !== secret) return new Response("no", { status: 401 });
        const { to, body } = (await request.json()) as { to: string; body: string };
        const { sendAndLog } = await import("@/lib/messaging.server");
        const res = await sendAndLog({ to, body, title: "Teste template", tag: "tpl-test" });
        return new Response(JSON.stringify(res), { headers: { "content-type": "application/json" } });
      },
    },
  },
});
