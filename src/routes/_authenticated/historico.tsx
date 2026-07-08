import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/historico")({ component: Historico });

function Historico() {
  const { data: acts = [] } = useQuery({
    queryKey: ["all-activities"],
    queryFn: async () => (await supabase.from("activities").select("*, contact:contacts(id, name)").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <div><h1 className="text-2xl font-semibold">Histórico</h1><p className="text-sm text-muted-foreground">Todas as interações em ordem cronológica.</p></div>
      <div className="space-y-2">
        {acts.length === 0 && <Card className="p-8 text-center text-muted-foreground">Sem registros ainda.</Card>}
        {acts.map((a: any) => (
          <Card key={a.id} className="p-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className="uppercase font-medium text-primary">{a.kind}</span>
              <span>{formatDateTime(a.created_at)}</span>
            </div>
            <div className="font-medium mt-1">{a.title}</div>
            {a.content && <div className="text-sm text-muted-foreground">{a.content}</div>}
            {a.contact && <Link to="/crm/$id" params={{ id: a.contact.id }} className="text-xs text-primary hover:underline">— {a.contact.name}</Link>}
          </Card>
        ))}
      </div>
    </div>
  );
}