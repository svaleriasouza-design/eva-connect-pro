import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, FUNNEL_STAGES, fetchAllRows } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/funil")({ component: Funil });

function Funil() {
  const qc = useQueryClient();
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => fetchAllRows("contacts", "*", { column: "updated_at", ascending: false }),
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
          const items = contacts.filter((c: any) => c.funnel_stage === stage.key);
          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("text/plain"); if (id) move(id, stage.key); }}
              className="flex flex-col rounded-lg bg-muted/40 p-3"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="text-xs font-semibold uppercase text-muted-foreground">{stage.label}</div>
                <Badge variant="secondary">{items.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
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
                {items.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Vazio</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}