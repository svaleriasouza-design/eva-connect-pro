import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, FUNNEL_STAGES } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funil")({ component: Funil });

function Funil() {
  const qc = useQueryClient();
  const { data: stageData = {}, isLoading } = useQuery({
    queryKey: ["funil-por-etapa"],
    queryFn: async () => {
      const results = await Promise.all(
        FUNNEL_STAGES.map(async (s) => {
          const [{ data }, { count }] = await Promise.all([
            supabase
              .from("contacts")
              .select("id, name, company_name, whatsapp, phone, last_contact_at, next_action, cadence_active, cadence_day")
              .eq("funnel_stage", s.key)
              .order("updated_at", { ascending: false })
              .limit(100),
            supabase.from("contacts").select("id", { count: "exact", head: true }).eq("funnel_stage", s.key),
          ]);
          return [s.key, { items: data ?? [], total: count ?? 0 }] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, { items: any[]; total: number }>;
    },
    staleTime: 30_000,
  });

  async function move(id: string, stage: string) {
    const { error } = await supabase.from("contacts").update({ funnel_stage: stage }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Movido"); qc.invalidateQueries({ queryKey: ["contacts"] }); }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Funil</h1>
        <p className="text-sm text-muted-foreground">Arraste os cartões entre as etapas.</p>
      </div>
      <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-3">
        {FUNNEL_STAGES.map((stage) => {
          const entry = stageData[stage.key] ?? { items: [], total: 0 };
          const items = entry.items;
          const total = entry.total;
          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, stage.key); }}
              className="flex flex-col rounded-lg bg-muted/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-xs font-semibold uppercase text-muted-foreground">{stage.label}</div>
                <Badge variant="secondary">{total.toLocaleString("pt-BR")}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                {items.map((c: any) => (
                  <Card
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className="cursor-grab p-3 hover:shadow-md active:cursor-grabbing"
                  >
                    <Link to="/crm/$id" params={{ id: c.id }} className="block">
                      <div className="font-medium text-sm">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.company_name ?? "—"}</div>
                      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                        <div>📞 {c.whatsapp ?? c.phone ?? "—"}</div>
                        <div>Últ. contato: {c.last_contact_at ? new Date(c.last_contact_at).toLocaleDateString("pt-BR") : "—"}</div>
                        <div>Próx. ação: {c.next_action ?? "—"}</div>
                      </div>
                      <div className="mt-2">
                        <Badge variant={c.cadence_active ? "default" : "secondary"} className="text-[10px]">
                          {c.cadence_active ? `Cadência Dia ${c.cadence_day ?? 0}/5` : "Fora da cadência"}
                        </Badge>
                      </div>
                    </Link>
                  </Card>
                ))}
                {!isLoading && items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>}
                {total > items.length && (
                  <div className="text-[10px] text-muted-foreground text-center py-1">
                    Exibindo {items.length} de {total.toLocaleString("pt-BR")} — use o CRM para ver todos.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}