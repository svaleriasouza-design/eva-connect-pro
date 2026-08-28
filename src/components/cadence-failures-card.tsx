import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listFailedCadenceSendsFn,
  retryFailedCadenceSendsFn,
  type FailedCadenceSend,
} from "@/lib/cadence.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function CadenceFailuresCard() {
  const qc = useQueryClient();
  const listFailures = useServerFn(listFailedCadenceSendsFn);
  const retry = useServerFn(retryFailedCadenceSendsFn);

  const { data, isLoading } = useQuery({
    queryKey: ["cadence-failures"],
    queryFn: () => listFailures(),
  });
  const items: FailedCadenceSend[] = useMemo(() => data?.items ?? [], [data?.items]);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const allChecked = items.length > 0 && selectedIds.length === items.length;

  async function requeue(ids: string[], label: string) {
    setBusy(label);
    try {
      const res = await retry({ data: { activityIds: ids } });
      if (res.sent > 0) {
        toast.success(`${res.sent} contato(s) reenviado(s) com sucesso.`);
      } else {
        toast.error(
          `Nenhum envio concluído · ${res.failed} falhas · ${res.skipped} bloqueados. ${res.errors[0] ?? ""}`,
          { duration: 8000 },
        );
      }
      if (res.errors.length) console.warn("[cadence-retry]", res.errors);
      setSelected({});
      await qc.invalidateQueries({ queryKey: ["cadence-failures"] });
      await qc.invalidateQueries({ queryKey: ["cadence-stats"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao recolocar na fila");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <CardTitle className="text-base">Envios com falha — não receberam a mensagem</CardTitle>
          <Badge variant="secondary">{items.length}</Badge>
        </div>
        {selectedIds.length > 0 && (
          <Button size="sm" onClick={() => requeue(selectedIds, "bulk")} disabled={busy !== null}>
            {busy === "bulk" ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-1 h-4 w-4" />
            )}
            Recolocar {selectedIds.length} na fila
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Estes contatos <b>não receberam nenhuma mensagem</b> da etapa indicada. Ao recolocar na fila,
          a EVA reenvia a mensagem do mesmo dia da cadência, respeitando as proteções atuais
          (atendimento humano, opt-out e bots são bloqueados).
        </p>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Nenhum envio de cadência com falha. 🎉
          </div>
        )}

        {items.length > 0 && (
          <div className="rounded-md border">
            <div className="flex items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium">
              <Checkbox
                checked={allChecked}
                onCheckedChange={(v) =>
                  setSelected(v ? Object.fromEntries(items.map((i) => [i.id, true])) : {})
                }
                aria-label="Selecionar todos"
              />
              <span className="flex-1">Contato</span>
              <span className="w-16">Etapa</span>
              <span className="hidden flex-1 md:block">Motivo</span>
              <span className="w-32 text-right">Tentativa</span>
              <span className="w-24" />
            </div>
            <div className="max-h-[420px] divide-y overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Checkbox
                    checked={Boolean(selected[it.id])}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [it.id]: Boolean(v) }))}
                    aria-label={`Selecionar ${it.contact_name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{it.contact_name}</div>
                    <div className="truncate text-xs text-muted-foreground">{it.phone || "sem telefone"}</div>
                  </div>
                  <div className="w-16">
                    <Badge variant="outline">Dia {it.day ?? "?"}</Badge>
                  </div>
                  <div className="hidden flex-1 truncate text-xs text-muted-foreground md:block" title={it.error_message ?? ""}>
                    {it.error_message ?? "Falha reportada pela Meta (sem detalhe)"}
                  </div>
                  <div className="w-32 text-right text-xs text-muted-foreground">{fmt(it.created_at)}</div>
                  <div className="w-24 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => requeue([it.id], it.id)}
                      disabled={busy !== null}
                    >
                      {busy === it.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
