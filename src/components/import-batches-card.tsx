import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Trash2, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useAccess } from "@/hooks/use-access";

type Batch = {
  id: string;
  file_name: string;
  total_rows: number;
  inserted_rows: number;
  created_at: string;
  created_by_name: string | null;
};

export function ImportBatchesCard() {
  const qc = useQueryClient();
  const { isAdmin } = useAccess();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: batches = [] } = useQuery<Batch[]>({
    queryKey: ["import-batches"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_batches")
        .select("id, file_name, total_rows, inserted_rows, created_at, created_by_name")
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as Batch[];
    },
  });

  async function removeBatch(b: Batch) {
    setDeleting(b.id);
    try {
      // Apaga o histórico e os contatos da importação, depois as empresas criadas por ela.
      const { data: contactIds } = await supabase
        .from("contacts")
        .select("id")
        .eq("import_batch_id", b.id);
      const ids = (contactIds ?? []).map((c: any) => c.id);
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        await supabase.from("activities").delete().in("contact_id", chunk);
        await supabase.from("tasks").delete().in("contact_id", chunk);
        await supabase.from("events").delete().in("contact_id", chunk);
      }
      const { error: cErr } = await supabase.from("contacts").delete().eq("import_batch_id", b.id);
      if (cErr) throw new Error(cErr.message);
      await supabase.from("companies").delete().eq("import_batch_id", b.id);
      const { error: bErr } = await supabase.from("import_batches").delete().eq("id", b.id);
      if (bErr) throw new Error(bErr.message);

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["import-batches"] }),
        qc.invalidateQueries({ queryKey: ["contacts-page"] }),
        qc.invalidateQueries({ queryKey: ["contacts-count"] }),
        qc.invalidateQueries({ queryKey: ["companies"] }),
        qc.invalidateQueries({ queryKey: ["funnel"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success(`Importação "${b.file_name}" excluída.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir a importação.");
    } finally {
      setDeleting(null);
    }
  }

  if (batches.length === 0) return null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FileSpreadsheet className="h-4 w-4" /> Listas importadas
      </div>
      <p className="text-xs text-muted-foreground">
        Excluiu por engano? Remova a lista inteira aqui — contatos, empresas e histórico criados por ela saem juntos.
      </p>
      <ul className="divide-y text-sm">
        {batches.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium">{b.file_name}</div>
              <div className="text-xs text-muted-foreground">
                {b.inserted_rows.toLocaleString("pt-BR")} contatos · {formatDateTime(b.created_at)}
                {b.created_by_name ? ` · ${b.created_by_name}` : ""}
              </div>
            </div>
            {isAdmin ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={deleting === b.id} className="gap-2">
                    {deleting === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir lista
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir “{b.file_name}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Serão removidos {b.inserted_rows.toLocaleString("pt-BR")} contatos, as empresas criadas por esta
                      importação e o histórico de mensagens ligado a eles. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => removeBatch(b)}>Excluir definitivamente</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <span className="text-xs text-muted-foreground">Somente administradores excluem listas.</span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
