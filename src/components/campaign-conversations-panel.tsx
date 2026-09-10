import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, MessageCircle, Sparkles, Repeat } from "lucide-react";
import {
  CAMPAIGN_ORIGIN,
  ELIGIBILITY_COLUMNS,
  applyEligibilityFilters,
  isEligibleForAttendance,
} from "@/lib/conversation-eligibility";

type Row = {
  id: string;
  name: string | null;
  is_bot: boolean | null;
  do_not_contact: boolean | null;
  status: string | null;
  funnel_stage: string | null;
  presale_stage: string | null;
  sales_stage: string | null;
  human_takeover: boolean | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  conversation_origin: string | null;
  origin_campaign_id: string | null;
};

function waitLabel(from: string | null | undefined) {
  if (!from) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}min`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/**
 * Painel do Dashboard: conversas que nasceram de cada disparo, com a instrução
 * que a EVA usa naquele disparo — separadas das conversas da cadência.
 * Somente leitura: usa a mesma regra central de elegibilidade.
 */
export function CampaignConversationsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-campaign-conversations"],
    queryFn: async () => {
      const [{ data: rows }, { data: campaigns }] = await Promise.all([
        applyEligibilityFilters(
          supabase.from("contacts").select(ELIGIBILITY_COLUMNS),
          { ignoreTakeover: true, includeCampaignOrigin: true },
        )
          .not("last_inbound_at", "is", null)
          .order("last_inbound_at", { ascending: false })
          .limit(1000),
        supabase.from("campaigns").select("id, name, ai_instructions, created_at"),
      ]);

      const eligible = ((rows ?? []) as Row[]).filter((c) =>
        isEligibleForAttendance(c, {
          requireInbound: true,
          ignoreTakeover: true,
          includeCampaignOrigin: true,
        }),
      );

      const fromCampaign = eligible.filter((c) => c.conversation_origin === CAMPAIGN_ORIGIN);
      const fromCadence = eligible.filter((c) => c.conversation_origin !== CAMPAIGN_ORIGIN);

      const byCampaign = new Map<
        string,
        { name: string; instructions: string | null; contacts: Row[]; pending: number }
      >();
      for (const c of fromCampaign) {
        const key = c.origin_campaign_id ?? "sem-disparo";
        const camp = (campaigns ?? []).find((x: any) => x.id === key);
        const entry =
          byCampaign.get(key) ??
          {
            name: camp?.name ?? "Disparo não identificado",
            instructions: (camp?.ai_instructions as string | null) || null,
            contacts: [] as Row[],
            pending: 0,
          };
        entry.contacts.push(c);
        const pending =
          !c.last_outbound_at ||
          new Date(c.last_inbound_at!).getTime() > new Date(c.last_outbound_at).getTime();
        if (pending) entry.pending += 1;
        byCampaign.set(key, entry);
      }

      const groups = [...byCampaign.entries()]
        .map(([id, g]) => ({ id, ...g }))
        .sort((a, b) => b.contacts.length - a.contacts.length);

      return { groups, campaignTotal: fromCampaign.length, cadenceTotal: fromCadence.length };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const groups = data?.groups ?? [];

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Conversas por disparo
        </CardTitle>
        <Link
          to="/whatsapp"
          className="text-xs text-primary hover:underline"
        >
          Abrir conversas de disparos
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Respostas de disparos
              </div>
              <div className="text-lg font-semibold leading-tight">{data?.campaignTotal ?? 0}</div>
              <div className="text-[10px] text-muted-foreground">contatos que responderam a um disparo</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Repeat className="h-4 w-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Conversas da cadência
              </div>
              <div className="text-lg font-semibold leading-tight">{data?.cadenceTotal ?? 0}</div>
              <div className="text-[10px] text-muted-foreground">seguem o fluxo dos 5 dias</div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border px-3 py-4 text-xs text-muted-foreground">
            Carregando conversas…
          </div>
        ) : groups.length === 0 ? (
          <div className="rounded-lg border px-3 py-4 text-xs text-muted-foreground">
            Nenhuma resposta de disparo até agora.
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                  <div className="truncate text-sm font-semibold">{g.name}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {g.contacts.length} conversa(s)
                  </Badge>
                  {g.pending > 0 && (
                    <Badge className="gap-1 bg-[color:var(--gold)]/20 text-[10px] text-foreground">
                      <MessageCircle className="h-3 w-3" /> {g.pending} pendente(s)
                    </Badge>
                  )}
                </div>
                <div className="space-y-2 px-3 py-2">
                  <div className="flex gap-2 rounded-md bg-muted/50 p-2 text-[11px] text-muted-foreground">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span className="whitespace-pre-line">
                      {g.instructions
                        ? g.instructions
                        : "Sem instrução específica — a EVA responde com o comportamento padrão."}
                    </span>
                  </div>
                  <ul className="divide-y">
                    {g.contacts.slice(0, 5).map((c) => (
                      <li key={c.id} className="flex items-center gap-3 py-1.5">
                        <Link
                          to="/crm/$id"
                          params={{ id: c.id }}
                          className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                        >
                          {c.name || "Sem nome"}
                        </Link>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {waitLabel(c.last_inbound_at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {g.contacts.length > 5 && (
                    <div className="text-[11px] text-muted-foreground">
                      +{g.contacts.length - 5} outra(s) conversa(s) deste disparo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
