import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, formatDateTime } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users, Calendar, MessageCircle, CheckSquare, Building2, TrendingUp,
  AlertTriangle, Sparkles, Play, Target, Flame, Clock, FileText, UserCheck,
} from "lucide-react";
import { fetchDueCadence } from "@/lib/cadence";
import { CadenceModal } from "@/components/cadence-modal";
import { useWorkspace } from "@/hooks/use-workspace";

export const Route = createFileRoute("/_authenticated/")({ component: Dashboard });

const META_DIARIA = 4;

function StatCard({ label, value, icon: Icon, tone = "primary", hint }: {
  label: string; value: number | string; icon: any; tone?: "primary" | "gold" | "warn" | "muted"; hint?: string;
}) {
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    gold: "bg-[color:var(--gold)]/15 text-[color:var(--gold)]",
    warn: "bg-orange-500/10 text-orange-600",
    muted: "bg-muted text-muted-foreground",
  } as const;
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${toneMap[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground leading-tight">{value}</div>
          {hint && <div className="text-xs text-muted-foreground truncate">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [cadenceOpen, setCadenceOpen] = useState(false);

  const { data, isLoading: dashLoading } = useQuery({
    queryKey: ["dashboard-central"],
    queryFn: async () => {
      const startDay = new Date(); startDay.setHours(0, 0, 0, 0);
      const endDay = new Date(); endDay.setHours(23, 59, 59, 999);
      const fifteen = new Date(); fifteen.setDate(fifteen.getDate() - 15);
      const startIso = startDay.toISOString();
      const endIso = endDay.toISOString();
      const fifteenIso = fifteen.toISOString();

      const cnt = async (q: any) => (await q).count ?? 0;
      const head = () => supabase.from("contacts").select("id", { count: "exact", head: true });

      const [
        active, proposals, inCadence, newLeads, meetingsScheduled, inbox,
        forgottenCompanies, overdueFollowups, meetingsToday, noShows, companiesCount,
        meetingsList, priorities, overdueList, respondeuList, semContatoList,
      ] = await Promise.all([
        cnt(head().eq("funnel_stage", "cliente_ativo")),
        cnt(head().eq("funnel_stage", "proposta_enviada")),
        cnt(head().eq("cadence_active", true).eq("do_not_contact", false)),
        cnt(head().eq("funnel_stage", "novo_lead")),
        cnt(head().eq("funnel_stage", "reuniao_agendada")),
        cnt(head().eq("status", "aguardando_resposta")),
        cnt(supabase.from("companies").select("id", { count: "exact", head: true }).is("next_meeting", null)),
        cnt(supabase.from("tasks").select("id", { count: "exact", head: true }).eq("done", false).lt("due_at", startIso)),
        cnt(supabase.from("events").select("id", { count: "exact", head: true }).gte("starts_at", startIso).lte("starts_at", endIso)),
        cnt(supabase.from("events").select("id", { count: "exact", head: true }).eq("kind", "reuniao").gte("starts_at", startIso).lte("starts_at", endIso).eq("status", "no_show")),
        cnt(supabase.from("companies").select("id", { count: "exact", head: true })),
        supabase.from("events").select("id, title, starts_at, status, kind")
          .gte("starts_at", startIso).lte("starts_at", endIso).order("starts_at"),
        supabase.from("contacts").select("id, name, funnel_stage, last_contact_at")
          .eq("funnel_stage", "proposta_enviada").order("updated_at", { ascending: false }).limit(5),
        supabase.from("tasks").select("id, title, due_at, contact_id")
          .eq("done", false).lt("due_at", startIso).order("due_at", { ascending: true }).limit(5),
        supabase.from("contacts").select("id, name, last_contact_at")
          .gte("last_contact_at", startIso).lte("last_contact_at", endIso)
          .order("last_contact_at", { ascending: false }).limit(5),
        supabase.from("contacts").select("id, name, last_contact_at")
          .eq("do_not_contact", false).lt("last_contact_at", fifteenIso)
          .order("last_contact_at", { ascending: true }).limit(5),
      ]);

      const meetingsData = meetingsList.data ?? [];
      const reunioesHoje = meetingsData.filter((m: any) => m.kind === "reuniao" && m.status === "confirmed").length;

      return {
        stats: {
          inbox, inCadence, meetingsToday, overdueFollowups: overdueFollowups,
          proposals, noShows, forgottenCompanies, active,
          newLeads, meetingsScheduled, companies: companiesCount,
        },
        meetings: meetingsData,
        reunioesHoje,
        prioridades: {
          semContatoLongo: semContatoList.data ?? [],
          respondeuHoje: respondeuList.data ?? [],
          propostaAberta: priorities.data ?? [],
          foraCadencia: [],
          tasks: overdueList.data ?? [],
        },
      };
    },
    staleTime: 30_000,
  });

  // silencia warning se dashLoading não usado abaixo
  void dashLoading;

  const { data: dueCount = 0 } = useQuery({
    queryKey: ["cadence-due-count"],
    queryFn: async () => (await fetchDueCadence()).length,
  });

  const meta = data?.reunioesHoje ?? 0;
  const metaPct = Math.min(100, Math.round((meta / META_DIARIA) * 100));
  const { workspace } = useWorkspace();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Central de Operações ✨</h1>
          <p className="text-sm text-muted-foreground">
            {greeting}, {workspace.owner_name || workspace.name}. A EVA já organizou o que importa para hoje.
          </p>
        </div>

        <Button size="lg" onClick={() => setCadenceOpen(true)} className="h-14 gap-3 bg-[color:var(--petrol)] px-6 text-base text-white shadow-lg hover:brightness-110">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--gold)]/20">
            <Play className="h-4 w-4 text-[color:var(--gold)]" fill="currentColor" />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="font-semibold">Iniciar Cadência</span>
            <span className="text-[11px] opacity-80">{dueCount} contato(s) prontos para hoje</span>
          </div>
        </Button>
      </div>

      {/* Meta diária */}
      <Card className="border-[color:var(--gold)]/30 bg-gradient-to-r from-[color:var(--petrol)]/5 to-[color:var(--gold)]/5">
        <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color:var(--gold)]/20 text-[color:var(--gold)]">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Meta do dia</div>
              <div className="text-lg font-semibold">Agendar {META_DIARIA} reuniões</div>
            </div>
          </div>
          <div className="flex-1 md:max-w-md">
            <div className="mb-1 flex justify-between text-xs">
              <span className="font-medium">{meta} de {META_DIARIA} reuniões</span>
              <span className="text-muted-foreground">{metaPct}%</span>
            </div>
            <Progress value={metaPct} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Números da operação */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-4">
        <StatCard label="Mensagens p/ responder" value={data?.stats.inbox ?? 0} icon={MessageCircle} tone="gold" hint="clientes aguardando você" />
        <StatCard label="Em cadência" value={data?.stats.inCadence ?? 0} icon={Flame} tone="primary" hint="rodando automaticamente" />
        <StatCard label="Reuniões hoje" value={data?.stats.meetingsToday ?? 0} icon={Calendar} tone="primary" />
        <StatCard label="Follow-ups atrasados" value={data?.stats.overdueFollowups ?? 0} icon={Clock} tone="warn" />
        <StatCard label="Propostas pendentes" value={data?.stats.proposals ?? 0} icon={FileText} tone="gold" />
        <StatCard label="No shows" value={data?.stats.noShows ?? 0} icon={AlertTriangle} tone="warn" />
        <StatCard label="Empresas aguardando" value={data?.stats.forgottenCompanies ?? 0} icon={Building2} tone="muted" />
        <StatCard label="Clientes ativos" value={data?.stats.active ?? 0} icon={UserCheck} tone="primary" />
      </div>

      {/* Prioridades EVA + Agenda */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[color:var(--gold)]" /> Prioridades da EVA
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">Sugerido pela IA</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <PrioRow title="Quem responder primeiro" tone="gold" items={data?.prioridades.respondeuHoje ?? []} empty="Ninguém respondeu ainda hoje." />
            <PrioRow title="Sem contato há mais de 15 dias" tone="warn" items={data?.prioridades.semContatoLongo ?? []} empty="Todos com contato recente 👏" />
            <PrioRow title="Proposta em aberto" tone="primary" items={data?.prioridades.propostaAberta ?? []} empty="Sem propostas para acompanhar." />
            <PrioRow title="Follow-ups atrasados" tone="warn" tasks={data?.prioridades.tasks ?? []} empty="Nenhum follow-up atrasado." />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Agenda de hoje</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.meetings ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem compromissos hoje.</p>}
            {data?.meetings.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(m.starts_at)}</div>
                </div>
                <Link to="/agenda" className="text-xs text-primary hover:underline">Abrir</Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <CadenceModal open={cadenceOpen} onOpenChange={setCadenceOpen} />
    </div>
  );
}

function PrioRow({ title, items = [], tasks = [], tone, empty }: {
  title: string;
  items?: { id: string; name?: string; last_contact_at?: string | null }[];
  tasks?: { id: string; title: string; due_at: string | null; contact_id: string | null }[];
  tone: "primary" | "gold" | "warn";
  empty: string;
}) {
  const toneBar = { primary: "bg-primary", gold: "bg-[color:var(--gold)]", warn: "bg-orange-500" }[tone];
  const total = (items?.length ?? 0) + (tasks?.length ?? 0);
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${toneBar}`} />
        <div className="text-xs font-semibold uppercase tracking-wide text-foreground">{title}</div>
        <Badge variant="outline" className="ml-auto text-[10px]">{total}</Badge>
      </div>
      {total === 0 ? (
        <div className="text-xs text-muted-foreground">{empty}</div>
      ) : (
        <ul className="space-y-1 text-xs">
          {items.slice(0, 4).map((c) => (
            <li key={c.id}>
              • <Link to="/crm/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.name}</Link>
              {c.last_contact_at && <span className="text-muted-foreground"> — último: {new Date(c.last_contact_at).toLocaleDateString("pt-BR")}</span>}
            </li>
          ))}
          {tasks.slice(0, 4).map((t) => (
            <li key={t.id}>• <span className="text-foreground">{t.title}</span>{t.due_at && <span className="text-muted-foreground"> — {new Date(t.due_at).toLocaleDateString("pt-BR")}</span>}</li>
          ))}
        </ul>
      )}
    </div>
  );
}