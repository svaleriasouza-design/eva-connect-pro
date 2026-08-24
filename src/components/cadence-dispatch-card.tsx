import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, Clock, CircleAlert as AlertCircle, MessageSquare, Users } from "lucide-react";

// Indicadores REAIS de disparos.
// Fonte única: tabela `activities` (kind = whatsapp_out / whatsapp_in), já escopada
// ao workspace pelas políticas de acesso — um cliente nunca vê disparos de outro.
// Fila pendente: `campaign_targets` com status pendente + leads elegíveis da cadência de hoje.

const FAILED_STATUSES = ["FAILED"];
const PENDING_TARGET_STATUSES = ["pending", "queued", "pendente"];

function dayStart(offsetDays = 0) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

async function count(q: any) {
  const { count } = await q;
  return (count ?? 0) as number;
}

function outHead() {
  return supabase.from("activities").select("id", { count: "exact", head: true }).eq("kind", "whatsapp_out");
}

export function CadenceDispatchCard() {
  const { data } = useQuery({
    queryKey: ["cadence-dispatch-metrics"],
    staleTime: 20_000,
    refetchInterval: 60_000,
    queryFn: async () => {
      const today = dayStart(0);
      const yesterday = dayStart(1);
      const last7 = dayStart(7);

      const sentIn = (q: any) => q.not("status", "in", `(${FAILED_STATUSES.join(",")})`);
      const cadenceEligible = () =>
        supabase
          .from("contacts")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .eq("cadence_active", true)
          .eq("do_not_contact", false)
          .eq("is_bot", false)
          .eq("ai_paused", false)
          .lt("cadence_day", 5);

      const [
        sentToday,
        failedToday,
        repliesToday,
        sentYesterday,
        sent7,
        sentTotal,
        leadsInCadence,
        dueToday,
        pendingTargets,
      ] = await Promise.all([
        count(sentIn(outHead()).gte("created_at", today)),
        count(outHead().gte("created_at", today).in("status", FAILED_STATUSES)),
        count(
          supabase
            .from("activities")
            .select("id", { count: "exact", head: true })
            .eq("kind", "whatsapp_in")
            .eq("status", "RECEIVED")
            .gte("created_at", today),
        ),
        count(sentIn(outHead()).gte("created_at", yesterday).lt("created_at", today)),
        count(sentIn(outHead()).gte("created_at", last7)),
        count(sentIn(outHead())),
        count(cadenceEligible()),
        count(cadenceEligible().or(`last_contact_at.is.null,last_contact_at.lt.${today}`)),
        count(
          supabase
            .from("campaign_targets")
            .select("id", { count: "exact", head: true })
            .in("status", PENDING_TARGET_STATUSES),
        ),
      ]);

      return {
        sentToday,
        failedToday,
        repliesToday,
        sentYesterday,
        sent7,
        sentTotal,
        leadsInCadence,
        pending: dueToday + pendingTargets,
        dueToday,
        pendingTargets,
      };
    },
  });

  const n = (v?: number) => (v ?? 0).toLocaleString("pt-BR");

  return (
    <Card className="border-[color:var(--gold)]/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-[color:var(--gold)]" /> Disparos da cadência
        </CardTitle>
        <Badge variant="secondary" className="text-[10px]">Dados reais do histórico</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric icon={Send} tone="primary" label="📤 Mensagens enviadas hoje" value={n(data?.sentToday)} hint="mensagens, não leads" />
          <Metric
            icon={Clock}
            tone="muted"
            label="⏳ Aguardando envio"
            value={n(data?.pending)}
            hint={`${n(data?.dueToday)} da cadência hoje + ${n(data?.pendingTargets)} em disparos`}
          />
          <Metric icon={AlertCircle} tone="warn" label="❌ Com erro hoje" value={n(data?.failedToday)} hint="falha na entrega" />
          <Metric icon={MessageSquare} tone="gold" label="💬 Respostas hoje" value={n(data?.repliesToday)} hint="mensagens recebidas" />
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <Metric
            icon={Users}
            tone="primary"
            label="👥 Leads em cadência"
            value={n(data?.leadsInCadence)}
            hint="pessoas únicas — cada lead recebe várias mensagens ao longo dos dias"
          />
        </div>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico de envios
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            <HistItem label="Hoje" value={n(data?.sentToday)} />
            <HistItem label="Ontem" value={n(data?.sentYesterday)} />
            <HistItem label="Últimos 7 dias" value={n(data?.sent7)} />
            <HistItem label="Total enviado" value={n(data?.sentTotal)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ icon: Icon, label, value, hint, tone }: {
  icon: any; label: string; value: string; hint?: string; tone: "primary" | "gold" | "warn" | "muted";
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
    warn: "bg-orange-500/10 text-orange-600",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneMap[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );
}

function HistItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}
