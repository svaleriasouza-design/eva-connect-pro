import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const SELECT =
  "id, name, company_name, whatsapp, phone, last_contact_at, last_inbound_at, next_action, cadence_active, cadence_day, funnel_stage, presale_stage";

type Col = {
  key: string;
  label: string;
  hint?: string;
  /** Filtro derivado dos dados existentes. Ausente = coluna só manual. */
  derive?: (q: any) => any;
  /** Precisa da lista de contatos com agendamento em andamento. */
  needsScheduling?: boolean;
};

/**
 * Colunas da Pré-venda: reaproveitam cadence_day, last_inbound_at, funnel_stage
 * e eva_scheduling_state. contacts.presale_stage funciona como override manual
 * (definido ao arrastar) e tem precedência sobre a regra derivada.
 */
const COLUMNS: Col[] = [
  {
    key: "responsivos",
    label: "Responsivos",
    hint: "responderam",
    derive: (q) => q.not("last_inbound_at", "is", null),
  },
  {
    key: "pre_agendado_qualificado",
    label: "Pré-agendado",
    hint: "agendamento em andamento",
    needsScheduling: true,
  },
  {
    key: "qualificado",
    label: "Qualificado",
    derive: (q) => q.eq("funnel_stage", "qualificado").is("last_inbound_at", null),
  },
  {
    key: "iniciar_cadencia",
    label: "Iniciar cadência",
    hint: "aguardando entrar",
    derive: (q) =>
      q
        .eq("cadence_active", false)
        .eq("cadence_day", 0)
        .is("last_inbound_at", null)
        .neq("funnel_stage", "qualificado"),
  },
  ...[1, 2, 3, 4, 5].map((d) => ({
    key: `lead_dia_${d}`,
    label: `Cadência Dia ${d}`,
    derive: (q: any) =>
      q.eq("cadence_active", true).eq("cadence_day", d).is("last_inbound_at", null),
  })),
  {
    key: "perdido_cadencia",
    label: "Perdido cadência",
    hint: "terminou sem resposta",
    derive: (q) =>
      q.eq("cadence_active", false).gte("cadence_day", 5).is("last_inbound_at", null),
  },
  { key: "perdido_desqualificado", label: "Perdido desqualificado" },
  { key: "perdido_desinteresse", label: "Perdido desinteresse" },
];

export function PresaleBoard() {
  const qc = useQueryClient();

  const { data: stageData = {}, isLoading } = useQuery({
    queryKey: ["funil-prevenda-derivado"],
    queryFn: async () => {
      // ids com agendamento em andamento (não confirmado)
      const { data: sched } = await supabase
        .from("eva_scheduling_state")
        .select("contact_id")
        .not("pending_start", "is", null)
        .limit(500);
      const schedIds = (sched ?? []).map((s: any) => s.contact_id);

      const base = () =>
        supabase
          .from("contacts")
          .select(SELECT, { count: "exact" })
          .is("deleted_at", null);

      const results = await Promise.all(
        COLUMNS.map(async (col) => {
          // 1) override manual
          const manual = await base()
            .eq("presale_stage", col.key)
            .order("updated_at", { ascending: false })
            .limit(100);

          // 2) derivado (só quem não tem override)
          let derived: any = { data: [], count: 0 };
          if (col.needsScheduling && schedIds.length > 0) {
            derived = await base()
              .is("presale_stage", null)
              .in("id", schedIds)
              .order("updated_at", { ascending: false })
              .limit(100);
          } else if (col.derive) {
            derived = await col
              .derive(base().is("presale_stage", null))
              .order("updated_at", { ascending: false })
              .limit(100);
          }

          const items = [...(manual.data ?? []), ...(derived.data ?? [])].slice(0, 100);
          const total = (manual.count ?? 0) + (derived.count ?? 0);
          return [col.key, { items, total }] as const;
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
    const { error } = await supabase
      .from("contacts")
      .update({ presale_stage: stageKey } as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Movido");
    qc.invalidateQueries({ queryKey: ["funil-prevenda-derivado"] });
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <div className="grid grid-flow-col auto-cols-[280px] gap-3 overflow-x-auto pb-3">
      {COLUMNS.map((col) => {
        const { items, total } = stageData[col.key] ?? { items: [], total: 0 };
        return (
          <div
            key={col.key}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, col.key);
            }}
            className="flex flex-col rounded-lg bg-muted/40 p-3"
          >
            <div className="mb-2 flex items-start justify-between gap-2 px-1">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  {col.label}
                </div>
                {col.hint && (
                  <div className="text-[10px] text-muted-foreground/70">{col.hint}</div>
                )}
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
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge
                        variant={c.cadence_active ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.cadence_active
                          ? `Cadência Dia ${c.cadence_day ?? 0}/5`
                          : "Fora da cadência"}
                      </Badge>
                      {c.presale_stage && (
                        <Badge variant="outline" className="text-[10px]">
                          manual
                        </Badge>
                      )}
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
