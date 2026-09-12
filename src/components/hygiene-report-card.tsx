import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/db";
import { classifyContact, HYGIENE_LABELS, type HygieneRow, type HygieneStatus } from "@/lib/hygiene";
import { deleteContactsFn } from "@/lib/imports.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Download, Loader as Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
  /** Quando informado, o relatório analisa apenas os contatos deste lote de importação. */
  batchId?: string | null;
  /** Abre o relatório automaticamente (usado logo após uma importação). */
  autoOpen?: boolean;
  /** Esconde o botão (usado quando o relatório abre sozinho após a importação). */
  hideButton?: boolean;
  onClose?: () => void;
};

const STATUS_ORDER: HygieneStatus[] = ["ficticio", "fixo", "nome", "valido"];

export function HygieneReportCard({ batchId = null, autoOpen = false, hideButton = false, onClose }: Props) {
  const qc = useQueryClient();
  const deleteContacts = useServerFn(deleteContactsFn);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(0);
  const [rows, setRows] = useState<HygieneRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "problemas" | HygieneStatus>("problemas");
  const [marked, setMarked] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  async function generate() {
    setLoading(true);
    setScanned(0);
    setMarked([]);
    try {
      const CHUNK = 1000;
      const all: HygieneRow[] = [];
      let lastId: string | null = null;
      for (;;) {
        let query: any = supabase
          .from("contacts")
          .select("id, name, company_name, whatsapp, phone")
          .is("deleted_at", null)
          .order("id", { ascending: true })
          .limit(CHUNK);
        if (lastId) query = query.gt("id", lastId);
        if (batchId) query = query.eq("import_batch_id", batchId);
        const { data, error } = await query;
        if (error) throw error;
        const batch = (data ?? []) as any[];
        batch.forEach((c) => all.push(classifyContact(c)));
        setScanned(all.length);
        if (batch.length === 0) break;
        lastId = batch[batch.length - 1].id;
        if (batch.length < CHUNK) break;
      }
      setRows(all);
      setOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o relatório.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autoOpen) void generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen, batchId]);

  const counts = useMemo(() => {
    const c: Record<HygieneStatus, number> = { valido: 0, fixo: 0, ficticio: 0, nome: 0 };
    (rows ?? []).forEach((r) => (c[r.status] += 1));
    return c;
  }, [rows]);

  const problemas = counts.fixo + counts.ficticio + counts.nome;

  const visible = useMemo(() => {
    const list = rows ?? [];
    const sorted = [...list].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status));
    if (filter === "all") return sorted;
    if (filter === "problemas") return sorted.filter((r) => r.status !== "valido");
    return sorted.filter((r) => r.status === filter);
  }, [rows, filter]);

  function toggle(id: string) {
    setMarked((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  function markAllVisible() {
    const ids = visible.filter((r) => r.status !== "valido").map((r) => r.id);
    const allIn = ids.length > 0 && ids.every((id) => marked.includes(id));
    setMarked((m) => (allIn ? m.filter((x) => !ids.includes(x)) : Array.from(new Set([...m, ...ids]))));
  }

  function exportCsv() {
    const list = visible;
    if (list.length === 0) return toast.error("Nada para exportar com o filtro atual.");
    const head = ["Empresa/Nome cadastrado", "Telefone", "Status/Diagnóstico", "Motivo"];
    const esc = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      head.map(esc).join(";"),
      ...list.map((r) =>
        [r.company_name ? `${r.name} · ${r.company_name}` : r.name, r.phone, HYGIENE_LABELS[r.status], r.reason]
          .map(esc)
          .join(";"),
      ),
    ].join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "higienizacao-contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function removeMarked() {
    setDeleting(true);
    try {
      const res: any = await deleteContacts({ data: { ids: marked } });
      setRows((r) => (r ?? []).filter((x) => !marked.includes(x.id)));
      setMarked([]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contacts-page"] }),
        qc.invalidateQueries({ queryKey: ["contacts-count"] }),
        qc.invalidateQueries({ queryKey: ["companies"] }),
        qc.invalidateQueries({ queryKey: ["funnel"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success(`${(res?.removed ?? 0).toLocaleString("pt-BR")} contato(s) excluído(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir os contatos.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {!hideButton && (
      <Button variant="outline" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
        {loading ? `Analisando… ${scanned.toLocaleString("pt-BR")}` : "Gerar relatório de higienização"}
      </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) onClose?.();
        }}
      >
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Relatório de higienização</DialogTitle>
          </DialogHeader>

          <Card className="p-3 text-sm">
            {problemas > 0 ? (
              <p>
                Encontramos <strong>{problemas.toLocaleString("pt-BR")}</strong> contato(s) com problema de{" "}
                {[
                  counts.ficticio ? `${counts.ficticio} número fictício/inválido` : "",
                  counts.fixo ? `${counts.fixo} telefone fixo` : "",
                  counts.nome ? `${counts.nome} nome inconsistente` : "",
                ]
                  .filter(Boolean)
                  .join(", ")}
                . Nada foi excluído — você decide o que remover.
              </p>
            ) : (
              <p>Todos os {(rows?.length ?? 0).toLocaleString("pt-BR")} contatos analisados estão válidos. 🎉</p>
            )}
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="problemas">Somente inconsistentes ({problemas})</SelectItem>
                <SelectItem value="all">Todos ({rows?.length ?? 0})</SelectItem>
                <SelectItem value="ficticio">Número Fictício/Inválido ({counts.ficticio})</SelectItem>
                <SelectItem value="fixo">Telefone Fixo ({counts.fixo})</SelectItem>
                <SelectItem value="nome">Nome Inconsistente ({counts.nome})</SelectItem>
                <SelectItem value="valido">Válidos ({counts.valido})</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={markAllVisible}>
              Marcar todos inconsistentes desta visão
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{marked.length} marcado(s)</span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={marked.length === 0 || deleting}>
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Excluir selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {marked.length} contato(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os contatos marcados serão apagados definitivamente, junto com o histórico de mensagens deles.
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={removeMarked}>Excluir definitivamente</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left">
                  <th className="w-10 p-2"></th>
                  <th className="p-2">Empresa/Nome cadastrado</th>
                  <th className="p-2">Telefone</th>
                  <th className="p-2">Status/Diagnóstico</th>
                  <th className="p-2">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2">
                      {r.status !== "valido" && (
                        <Checkbox checked={marked.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                      )}
                    </td>
                    <td className="p-2">
                      <div className="font-medium">{r.name}</div>
                      {r.company_name && <div className="text-xs text-muted-foreground">{r.company_name}</div>}
                    </td>
                    <td className="p-2 whitespace-nowrap">{r.phone}</td>
                    <td className="p-2 whitespace-nowrap">
                      <Badge variant={r.status === "valido" ? "secondary" : "outline"}>
                        {HYGIENE_LABELS[r.status]}
                      </Badge>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{r.reason}</td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-muted-foreground">
                      Nenhum contato neste filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
