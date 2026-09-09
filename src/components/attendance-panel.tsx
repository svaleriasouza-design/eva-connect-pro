import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Headphones, Clock, MessageCircle, UserCheck } from "lucide-react";
import {
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
  human_takeover_by_name?: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
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

function waitTone(from: string | null | undefined) {
  if (!from) return "text-muted-foreground";
  const hours = (Date.now() - new Date(from).getTime()) / 3600000;
  if (hours >= 4) return "text-orange-600";
  if (hours >= 1) return "text-[color:var(--gold)]";
  return "text-muted-foreground";
}

/** Painel de Atendimento — usa a regra central de elegibilidade. */
export function AttendancePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-attendance-panel"],
    queryFn: async () => {
      const { data: rows } = await applyEligibilityFilters(
        supabase
          .from("contacts")
          .select(`${ELIGIBILITY_COLUMNS}, human_takeover_by_name`),
        { ignoreTakeover: true },
      )
        .not("last_inbound_at", "is", null)
        .order("last_inbound_at", { ascending: true })
        .limit(200);

      const eligible = ((rows ?? []) as Row[]).filter((c) =>
        isEligibleForAttendance(c, { requireInbound: true, ignoreTakeover: true }),
      );

      // Pendente = última mensagem da conversa foi do contato (ninguém respondeu depois).
      const pending = eligible.filter(
        (c) =>
          !c.last_outbound_at ||
          new Date(c.last_inbound_at!).getTime() > new Date(c.last_outbound_at).getTime(),
      );
      const inAttendance = eligible.filter((c) => c.human_takeover);

      const oldest = pending[0]?.last_inbound_at ?? null;
      const avgMin = pending.length
        ? Math.round(
            pending.reduce((s, c) => s + (Date.now() - new Date(c.last_inbound_at!).getTime()), 0) /
              pending.length /
              60000,
          )
        : 0;

      return { eligible, pending, inAttendance, oldest, avgMin };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const pending = data?.pending ?? [];
  const inAttendance = data?.inAttendance ?? [];

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Headphones className="h-4 w-4 text-primary" /> Painel de Atendimento
        </CardTitle>
        <Link to="/atendimento" className="text-xs text-primary hover:underline">
          Abrir atendimento
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Em atendimento" value={inAttendance.length} icon={UserCheck} hint="assumidos por uma pessoa" />
          <Metric label="Mensagens pendentes" value={pending.length} icon={MessageCircle} hint="aguardam resposta nossa" />
          <Metric label="Espera mais antiga" value={waitLabel(data?.oldest)} icon={Clock} hint="quem espera há mais tempo" />
          <Metric
            label="Espera média"
            value={data?.avgMin ? waitLabel(new Date(Date.now() - data.avgMin * 60000).toISOString()) : "—"}
            icon={Clock}
            hint="média da fila pendente"
          />
        </div>

        <div className="rounded-lg border bg-card">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--gold)]" />
            <div className="text-xs font-semibold uppercase tracking-wide">Fila de atendimento</div>
            <Badge variant="outline" className="ml-auto text-[10px]">{pending.length}</Badge>
          </div>
          {isLoading ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">Carregando conversas…</div>
          ) : pending.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground">
              Nenhuma conversa aguardando atendimento agora 👏
            </div>
          ) : (
            <ul className="divide-y">
              {pending.slice(0, 8).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/crm/$id"
                      params={{ id: c.id }}
                      className="block truncate text-sm font-medium text-primary hover:underline"
                    >
                      {c.name || "Sem nome"}
                    </Link>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {c.human_takeover
                        ? `Em atendimento${c.human_takeover_by_name ? ` · ${c.human_takeover_by_name}` : ""}`
                        : "Aguardando primeira resposta humana"}
                    </div>
                  </div>
                  <div className={`shrink-0 text-xs font-medium ${waitTone(c.last_inbound_at)}`}>
                    {waitLabel(c.last_inbound_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: any; hint?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold leading-tight">{value}</div>
        {hint && <div className="truncate text-[10px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}
