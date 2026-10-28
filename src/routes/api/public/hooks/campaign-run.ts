import { createFileRoute } from "@tanstack/react-router";

// Processa lotes pendentes dos disparos (campanhas) de todos os workspaces.
// Chamado por pg_cron / agendador externo com o header `x-cron-secret` (CRON_SECRET).

export const Route = createFileRoute("/api/public/hooks/campaign-run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { isValidCronRequest } = await import("@/lib/cron-auth.server");
        if (!(await isValidCronRequest(request))) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        const { listRunnableCampaigns, runCampaignBatch } = await import("@/lib/campaigns.server");
        const campaigns = await listRunnableCampaigns();
        const results: any[] = [];
        for (const c of campaigns) {
          try {
            results.push({ campaignId: c.id, ...(await runCampaignBatch(c.workspace_id, c.id)) });
          } catch (err) {
            results.push({ campaignId: c.id, error: err instanceof Error ? err.message : String(err) });
          }
        }
        return Response.json({ ok: true, campaigns: results.length, results });
      },
    },
  },
});