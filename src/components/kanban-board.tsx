import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export type KanbanStage = { key: string; label: string };

const UNSET = "__sem_etapa__";
const SELECT =
  "id, name, company_name, whatsapp, phone, last_contact_at, next_action, cadence_active, cadence_day";

/**
 * Quadro Kanban genérico: uma coluna por etapa + coluna "Sem etapa".
 * Arrastar um card apenas grava a etapa no campo indicado — nenhuma automação
 * de envio é disparada aqui.
 */
export function KanbanBoard({
  field,
  stages,
  queryKey,
  includeUnset = true,
}: {
  field: "funnel_stage" | "presale_stage" | "sales_stage";
  stages: readonly KanbanStage[];
  queryKey: string;
  includeUnset?: boolean;
}) {
  const qc = useQueryClient();
  const columns: KanbanStage[] = includeUnset
    ? [{ key: UNSET, label: "Sem etapa" }, ...stages]
    : [...stages];

  const { data: stageData = {}, isLoading } = useQuery({
    queryKey: [queryKey, field],
    queryFn: async () => {
      const results = await Promise.all(
        columns.map(async (s) => {
          const scope = (q: any) =>
            s.key === UNSET ? q.is(field, null) : q.eq(field, s.key);
          const [{ data }, { count }] = await Promise.all([
            scope(
              supabase.from("contacts").select(SELECT).is("deleted_at", null),
            )
              .order("updated_at", { ascending: false })
              .limit(100),
            scope(
              supabase
                .from("contacts")
                .select("id", { count: "exact", head: true })
                .is("deleted_at", null),
            ),
          ]);
          return [s.key, { items: data ?? [], total: count ?? 0 }] as const;
        }),
      );
      return Object.fromEntries(results) as Record<
        string,
        { items: any[]; total: number }
      >;
    },
    staleTime: 30_000,
  });

  async function move(id: string, stageKey: string) {
    const value = stageKey === UNSET ? null : stageKey;
    const { error } = await supabase
      .from("contacts")
      .update({ [field]: value } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Movido");
    qc.invalidateQueries({ queryKey: [queryKey, field] });
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-3">
      {columns.map((stage) => {
        const entry = stageData[stage.key] ?? { items: [], total: 0 };
        const { items, total } = entry;
        return (
          <div
            key={stage.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, stage.key);
            }}
            className="flex flex-col rounded-lg bg-muted/40 p-3"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                {stage.label}
              </div>
              <Badge variant="secondary">{total.toLocaleString("pt-BR")}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              {items.map((c: any) => (
                <Card
                  key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                  className="cursor-grab p-3 hover:shadow-md active:cursor-grabbing"
                >
                  <Link to="/crm/$id" params={{ id: c.id }} className="block">
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.company_name ?? "—"}
                    </div>
                    <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                      <div>📞 {c.whatsapp ?? c.phone ?? "—"}</div>
                      <div>
                        Últ. contato:{" "}
                        {c.last_contact_at
                          ? new Date(c.last_contact_at).toLocaleDateString("pt-BR")
                          : "—"}
                      </div>
                      <div>Próx. ação: {c.next_action ?? "—"}</div>
                    </div>
                    <div className="mt-2">
                      <Badge
                        variant={c.cadence_active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.cadence_active
                          ? `Cadência Dia ${c.cadence_day ?? 0}/5`
                          : "Fora da cadência"}
                      </Badge>
                    </div>
                  </Link>
                </Card>
              ))}
              {!isLoading && items.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  Vazio
                </div>
              )}
              {total > items.length && (
                <div className="text-[10px] text-muted-foreground text-center py-1">
                  Exibindo {items.length} de {total.toLocaleString("pt-BR")} — use o
                  CRM para ver todos.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
