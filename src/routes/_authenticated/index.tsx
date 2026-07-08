import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, formatDateTime } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, MessageCircle, CheckSquare, Building2, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({ component: Dashboard });

function StatCard({ label, value, icon: Icon, hint }: { label: string; value: number | string; icon: any; hint?: string }) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold text-foreground">{value}</div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const today = new Date();
      const startDay = new Date(today); startDay.setHours(0,0,0,0);
      const endDay = new Date(today); endDay.setHours(23,59,59,999);
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const fifteen = new Date(); fifteen.setDate(fifteen.getDate() - 15);

      const [contacts, companies, tasksPending, meetingsToday, newLeads, forgotten, upcoming] = await Promise.all([
        supabase.from("contacts").select("id, funnel_stage, last_contact_at, name, do_not_contact"),
        supabase.from("companies").select("id"),
        supabase.from("tasks").select("id, title, due_at, done").eq("done", false),
        supabase.from("events").select("id, title, starts_at, contact_id").gte("starts_at", startDay.toISOString()).lte("starts_at", endDay.toISOString()).order("starts_at"),
        supabase.from("contacts").select("id").gte("created_at", weekAgo.toISOString()),
        supabase.from("contacts").select("id, name, last_contact_at").lt("last_contact_at", fifteen.toISOString()).eq("do_not_contact", false).limit(5),
        supabase.from("events").select("id, title, starts_at").gt("starts_at", new Date().toISOString()).order("starts_at").limit(5),
      ]);

      const active = contacts.data?.filter(c => c.funnel_stage === "cliente_ativo").length ?? 0;
      const proposals = contacts.data?.filter(c => c.funnel_stage === "proposta_enviada").length ?? 0;
      return {
        totalContacts: contacts.data?.length ?? 0,
        totalCompanies: companies.data?.length ?? 0,
        tasksPending: tasksPending.data ?? [],
        meetingsToday: meetingsToday.data ?? [],
        newLeads: newLeads.data?.length ?? 0,
        forgotten: forgotten.data ?? [],
        upcoming: upcoming.data ?? [],
        active, proposals,
      };
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Bom dia, Valéria ✨</h1>
        <p className="text-sm text-muted-foreground">Aqui está o resumo do seu dia.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Novos leads (7d)" value={data?.newLeads ?? 0} icon={Users} />
        <StatCard label="Reuniões hoje" value={data?.meetingsToday.length ?? 0} icon={Calendar} />
        <StatCard label="Follow-ups pendentes" value={data?.tasksPending.length ?? 0} icon={CheckSquare} />
        <StatCard label="Propostas em aberto" value={data?.proposals ?? 0} icon={MessageCircle} />
        <StatCard label="Clientes ativos" value={data?.active ?? 0} icon={TrendingUp} />
        <StatCard label="Empresas" value={data?.totalCompanies ?? 0} icon={Building2} />
        <StatCard label="Total de contatos" value={data?.totalContacts ?? 0} icon={Users} />
        <StatCard label="No shows" value={0} icon={AlertTriangle} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" /> Agenda de hoje</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.meetingsToday ?? []).length === 0 && <p className="text-sm text-muted-foreground">Sem compromissos hoje.</p>}
            {data?.meetingsToday.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-medium">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(m.starts_at)}</div>
                </div>
                <Link to="/agenda" className="text-xs text-primary hover:underline">Abrir</Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[color:var(--gold)]" /> Sugestões da EVA</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(data?.forgotten.length ?? 0) > 0 && (
              <div className="rounded-md border bg-accent/10 p-3">
                <div className="font-medium text-foreground">Clientes esquecidos</div>
                <div className="text-xs text-muted-foreground">Você tem {data?.forgotten.length} contato(s) sem interação há mais de 15 dias.</div>
                <ul className="mt-2 space-y-1 text-xs">
                  {data?.forgotten.map((c) => (
                    <li key={c.id}>• <Link to="/crm/$id" params={{ id: c.id }} className="text-primary hover:underline">{c.name}</Link></li>
                  ))}
                </ul>
              </div>
            )}
            {(data?.tasksPending.length ?? 0) > 0 && (
              <div className="rounded-md border bg-primary/5 p-3">
                <div className="font-medium">Follow-ups em aberto</div>
                <div className="text-xs text-muted-foreground">Existem {data?.tasksPending.length} tarefa(s) para concluir.</div>
              </div>
            )}
            {(data?.meetingsToday.length ?? 0) > 0 && (
              <div className="rounded-md border p-3">
                <div className="font-medium">Você tem reuniões hoje</div>
                <div className="text-xs text-muted-foreground">Prepare-se com antecedência. Clique em "Pergunte à EVA" para gerar um briefing.</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
