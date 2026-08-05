import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { formatDateTime } from "@/lib/db";
import {
  listImportBatchesFn,
  undoImportFn,
  restoreImportFn,
  purgeImportFn,
} from "@/lib/imports.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Loader2, FileSpreadsheet, Undo2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/hooks/use-access";

type Batch = {
  id: string;
  file_name: string;
  total_rows: number;
  inserted_rows: number;
  created_at: string;
  created_by_name: string | null;
  deleted_at: string | null;
};

export function ImportBatchesCard() {
  const qc = useQueryClient();
  const { isAdmin } = useAccess();
  const [busy, setBusy] = useState<string | null>(null);
  const listBatches = useServerFn(listImportBatchesFn);
  const undoImport = useServerFn(undoImportFn);
  const restoreImport = useServerFn(restoreImportFn);
  const purgeImport = useServerFn(purgeImportFn);

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["import-batches"],
    queryFn: async () => (await listBatches()) as Batch[],
  });

  function refresh() {
    return Promise.all([
      qc.invalidateQueries({ queryKey: ["import-batches"] }),
      qc.invalidateQueries({ queryKey: ["contacts-page"] }),
      qc.invalidateQueries({ queryKey: ["contacts-count"] }),
      qc.invalidateQueries({ queryKey: ["companies"] }),
      qc.invalidateQueries({ queryKey: ["funnel"] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  }

  async function run(id: string, fn: () => Promise<any>, msg: string) {
    setBusy(id);
    try {
      await fn();
      await refresh();
      toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(null);
    }
  }

  if (batches.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileSpreadsheet className="h-4 w-4" /> Listas importadas
      </div>
      <p className="text-xs text-muted-foreground">
        Importou por engano? Use <strong>Desfazer importação</strong> — os leads e empresas do lote saem das telas na
        hora, mas ficam guardados e podem ser restaurados. A exclusão definitiva é um segundo passo.
      </p>
      <ul className="divide-y text-sm">
        {batches.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 truncate font-medium">
                {b.file_name}
                {b.deleted_at && <Badge variant="secondary">Desfeita</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">
                {b.inserted_rows.toLocaleString("pt-BR")} leads · importada em {formatDateTime(b.created_at)}
                {b.created_by_name ? ` · por ${b.created_by_name}` : ""}
                {b.deleted_at ? ` · desfeita em ${formatDateTime(b.deleted_at)}` : ""}
              </div>
            </div>
            {!isAdmin ? (
              <span className="text-xs text-muted-foreground">Somente administradores gerenciam listas.</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {busy === b.id && <Loader2 className="h-4 w-4 animate-spin self-center" />}
                {b.deleted_at ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === b.id}
                      className="gap-2"
                      onClick={() =>
                        run(b.id, () => restoreImport({ data: { batchId: b.id } }), "Importação restaurada.")
                      }
                    >
                      <RotateCcw className="h-4 w-4" /> Restaurar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={busy === b.id} className="gap-2">
                          <Trash2 className="h-4 w-4" /> Excluir definitivamente
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir “{b.file_name}” para sempre?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Serão apagados {b.inserted_rows.toLocaleString("pt-BR")} leads, as empresas criadas por esta
                            importação e todo o histórico de mensagens ligado a eles. Não há como desfazer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              run(b.id, () => purgeImport({ data: { batchId: b.id } }), "Importação excluída.")
                            }
                          >
                            Excluir definitivamente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={busy === b.id} className="gap-2">
                        <Undo2 className="h-4 w-4" /> Desfazer importação
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desfazer “{b.file_name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {b.inserted_rows.toLocaleString("pt-BR")} leads e as empresas deste lote sairão do CRM, funil e
                          cadências. Nada é apagado: você pode restaurar depois nesta mesma lista.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => run(b.id, () => undoImport({ data: { batchId: b.id } }), "Importação desfeita.")}
                        >
                          Desfazer
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
