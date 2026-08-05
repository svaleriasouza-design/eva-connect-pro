import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase, FUNNEL_STAGES, ORIGENS, formatDateTime, fetchAllRows } from "@/lib/db";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useServerFn } from "@tanstack/react-start";
import { deleteContactsFn } from "@/lib/imports.functions";
import { useAccess } from "@/hooks/use-access";
import { WhatsAppQuickSend } from "@/components/whatsapp-quick-send";
import { toast } from "sonner";
import {
  readRowsFromFile,
  isSupportedImportFile,
  validateLeadHeaders,
  pickField,
} from "@/lib/import-file";
import { Progress } from "@/components/ui/progress";
import { ensureCompanies, normalizeCompanyName } from "@/lib/companies";
import { normalizePhoneNumber } from "@/lib/phone";
import { ImportBatchesCard } from "@/components/import-batches-card";

export const Route = createFileRoute("/_authenticated/crm")({ component: () => <Outlet /> });

export function CrmList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [batch, setBatch] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, inserted: 0, skipped: 0 });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;
  const { isAdmin } = useAccess();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const deleteContacts = useServerFn(deleteContactsFn);

  const { data: batchOptions = [] } = useQuery({
    queryKey: ["import-batch-options"],
    queryFn: async () => {
      const { data } = await supabase
        .from("import_batches")
        .select("id, file_name, created_at, inserted_rows")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  const { data: total = 0 } = useQuery({
    queryKey: ["contacts-count", q, stage, batch],
    queryFn: async () => {
      let query: any = supabase.from("contacts").select("id", { count: "exact", head: true });
      if (stage !== "all") query = query.eq("funnel_stage", stage);
      if (batch === "none") query = query.is("import_batch_id", null);
      else if (batch !== "all") query = query.eq("import_batch_id", batch);
      if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,company_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
      const { count } = await query;
      return count ?? 0;
    },
  });

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["contacts-page", q, stage, batch, page],
    queryFn: async () => {
      let query: any = supabase.from("contacts")
        .select("id, name, company_name, whatsapp, funnel_stage, last_contact_at, created_at, import_batch_id")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (stage !== "all") query = query.eq("funnel_stage", stage);
      if (batch === "none") query = query.is("import_batch_id", null);
      else if (batch !== "all") query = query.eq("import_batch_id", batch);
      if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,company_name.ilike.%${q.trim()}%,email.ilike.%${q.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  const filtered = contacts;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allOnPageSelected = filtered.length > 0 && filtered.every((c: any) => selected.includes(c.id));

  function toggleOne(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAllOnPage() {
    const ids = filtered.map((c: any) => c.id as string);
    setSelected((s) => (allOnPageSelected ? s.filter((x) => !ids.includes(x)) : Array.from(new Set([...s, ...ids]))));
  }

  async function removeSelected() {
    setDeleting(true);
    try {
      await deleteContacts({ data: { ids: selected.slice(0, 1000) } });
      setSelected([]);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["contacts-page"] }),
        qc.invalidateQueries({ queryKey: ["contacts-count"] }),
        qc.invalidateQueries({ queryKey: ["companies"] }),
        qc.invalidateQueries({ queryKey: ["funil-por-etapa"] }),
        qc.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Contatos excluídos.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir os contatos.");
    } finally {
      setDeleting(false);
    }
  }

  // fetchAllRows / useMemo kept for CSV import path
  void useMemo;
  void fetchAllRows;

  async function importCsv(file: File) {
    const finish = (msg?: string, isError = false) => {
      setImporting(false);
      setImportProgress({ done: 0, total: 0, inserted: 0, skipped: 0 });
      if (msg) (isError ? toast.error : toast.success)(msg);
    };

    if (!file) return toast.error("Nenhum arquivo selecionado.");
    if (!isSupportedImportFile(file)) {
      return toast.error("Formato não aceito. Envie uma planilha Excel (.xlsx) ou um arquivo CSV (.csv).");
    }

    setImporting(true);
    setImportProgress({ done: 0, total: 0, inserted: 0, skipped: 0 });

    try {
      let rows: Record<string, any>[] = [];
      let headers: string[] = [];
      try {
        const read = await readRowsFromFile(file);
        rows = read.rows;
        headers = read.headers;
      } catch (e: any) {
        return finish(
          `Não foi possível ler o arquivo: ${e?.message ?? "formato inválido ou arquivo corrompido"}.`,
          true,
        );
      }

      if (rows.length === 0) {
        return finish(
          "O arquivo está vazio ou sem linhas de dados. Verifique se a primeira linha contém os nomes das colunas.",
          true,
        );
      }

      const headerProblem = validateLeadHeaders(headers.length ? headers : Object.keys(rows[0] ?? {}));
      if (headerProblem) return finish(headerProblem, true);

      const mapped = rows
        .map((r) => {
          if (!r || typeof r !== "object") return null;
          const nomeFantasia = pickField(r, ["Nome Fantasia", "nome_fantasia"]);
          const razaoSocial = pickField(r, ["Razao Social", "Razão Social", "razao_social"]);
          const name = nomeFantasia || razaoSocial || pickField(r, ["name", "nome", "contato"]);
          const rawWhatsapp = pickField(r, [
            "Telefone1 Completo",
            "telefone1_completo",
            "WhatsApp",
            "whatsapp",
            "celular",
          ]);
          const whatsapp = normalizePhoneNumber(rawWhatsapp) || null;
          const email = pickField(r, ["E-mail", "Email", "email"]);
          if (!whatsapp && !email) return null;
          const contactName = name || "Sem nome";
          const companyName = razaoSocial || pickField(r, ["company", "empresa"]) || contactName;
          return {
            name: contactName,
            phone: whatsapp || normalizePhoneNumber(pickField(r, ["Telefone", "phone", "telefone"])) || null,
            whatsapp,
            email,
            company_name: companyName,
            city: pickField(r, ["Cidade", "city"]),
            funnel_stage: "novo_lead",
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (mapped.length === 0) {
        return finish(
          `Lemos ${rows.length.toLocaleString("pt-BR")} linhas, mas nenhuma tinha WhatsApp/telefone ou e-mail válidos. ` +
            "Confira as colunas de contato da planilha.",
          true,
        );
      }

      // Registra o lote da importação para permitir exclusão futura.
      const { data: authData } = await supabase.auth.getUser();
      const { data: batchRow, error: batchErr } = await supabase
        .from("import_batches")
        .insert({
          file_name: file.name,
          total_rows: rows.length,
          inserted_rows: 0,
          created_by: authData?.user?.id ?? null,
          created_by_name:
            (authData?.user?.user_metadata as any)?.full_name ?? authData?.user?.email ?? null,
        })
        .select("id")
        .single();
      if (batchErr) {
        return finish(`Não foi possível registrar a importação: ${batchErr.message}`, true);
      }
      const batchId = (batchRow as any).id as string;

      // Cria/vincula empresas em lote antes de inserir contatos.
      const companyExtras: Record<string, any> = {};
      mapped.forEach((r) => {
        const norm = normalizeCompanyName(r.company_name);
        if (!companyExtras[norm]) {
          companyExtras[norm] = { city: r.city, phone: r.phone, email: r.email };
        }
      });
      const companyMap = await ensureCompanies(
        mapped.map((r) => r.company_name),
        companyExtras,
        batchId,
      );
      const withCompany = mapped.map((r) => ({
        ...r,
        company_id: companyMap.get(normalizeCompanyName(r.company_name)) ?? null,
        import_batch_id: batchId,
      }));

      const BATCH = 500;
      setImportProgress({ done: 0, total: withCompany.length, inserted: 0, skipped: 0 });
      let inserted = 0;
      let skipped = 0;

      for (let i = 0; i < withCompany.length; i += BATCH) {
        const batch = withCompany.slice(i, i + BATCH);
        try {
          const { error } = await supabase.from("contacts").insert(batch);
          if (error) {
            console.error("Batch insert error:", error);
            for (const row of batch) {
              try {
                const { error: rowErr } = await supabase.from("contacts").insert(row);
                if (rowErr) skipped += 1;
                else inserted += 1;
              } catch (e) {
                console.error("Row insert exception:", e);
                skipped += 1;
              }
            }
          } else {
            inserted += batch.length;
          }
        } catch (e) {
          console.error("Batch exception:", e);
          skipped += batch.length;
        }
        setImportProgress({
          done: Math.min(i + BATCH, withCompany.length),
          total: withCompany.length,
          inserted,
          skipped,
        });
      }

      await supabase.from("import_batches").update({ inserted_rows: inserted }).eq("id", batchId);
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contacts-page"] });
      qc.invalidateQueries({ queryKey: ["contacts-count"] });
      qc.invalidateQueries({ queryKey: ["import-batches"] });
      qc.invalidateQueries({ queryKey: ["import-batch-options"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      finish(`${inserted} contatos importados${skipped ? ` · ${skipped} ignorados` : ""}`);
    } catch (e: any) {
      console.error("Import error:", e);
      finish(`Erro na importação: ${e?.message ?? "erro desconhecido"}`, true);
    }
  }

  function exportCsv() {
    const headers = ["name","company_name","whatsapp","email","funnel_stage","city","created_at","import_batch_id"];
    const csv = [headers.join(",")].concat(
      filtered.map((c: any) => headers.map((h) => JSON.stringify(c[h] ?? "")).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "contatos.csv"; a.click();
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">CRM</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString("pt-BR")} contatos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" asChild disabled={importing}>
              <span><Upload className="mr-2 h-4 w-4" /> {importing ? "Importando…" : "Importar planilha (.xlsx ou .csv)"}</span>
            </Button>
          </label>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
          <NewContactDialog />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Aceitamos planilhas do Excel/Google Sheets (<strong>.xlsx</strong>) e arquivos <strong>.csv</strong> — não é
        preciso converter nada. No CSV, o separador (vírgula ou ponto e vírgula) e os acentos são detectados
        automaticamente. Colunas necessárias, em qualquer ordem: um nome (Nome Fantasia, Razão Social ou Nome) e um
        contato (WhatsApp, Telefone ou E-mail).
      </p>

      {importing && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Importando: {importProgress.done.toLocaleString("pt-BR")} de{" "}
              {(importProgress.total || 0).toLocaleString("pt-BR")} contatos…
            </span>
            <span className="text-muted-foreground">
              {importProgress.total
                ? Math.round((importProgress.done / importProgress.total) * 100)
                : 0}
              %
              {importProgress.inserted ? ` · ${importProgress.inserted.toLocaleString("pt-BR")} inseridos` : ""}
              {importProgress.skipped ? ` · ${importProgress.skipped.toLocaleString("pt-BR")} ignorados` : ""}
            </span>
          </div>
          <Progress value={importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0} />
          <p className="text-xs text-muted-foreground">
            Não feche esta aba — o envio continua em lotes de 500 até concluir.
          </p>
        </Card>
      )}

      <ImportBatchesCard />

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setPage(0); setQ(e.target.value); }} placeholder="Buscar por nome, empresa, e-mail…" className="pl-9" />
        </div>
        <Select value={stage} onValueChange={(v) => { setPage(0); setStage(v); }}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {FUNNEL_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={batch} onValueChange={(v) => { setPage(0); setBatch(v); }}>
          <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as importações</SelectItem>
            <SelectItem value="none">Cadastrados manualmente / WhatsApp</SelectItem>
            {batchOptions.map((b: any) => (
              <SelectItem key={b.id} value={b.id}>
                {b.file_name} · {formatDateTime(b.created_at)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
          <div className="text-sm">
            <strong>{selected.length.toLocaleString("pt-BR")}</strong> contato(s) selecionado(s)
            {!isAdmin && <span className="ml-2 text-muted-foreground">— somente administradores podem excluir.</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>Limpar seleção</Button>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting} className="gap-2">
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Excluir selecionados
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir {selected.length} contato(s)?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Eles saem do CRM, funil e cadências na hora. Os dados ficam guardados no banco, sem aparecer nas
                      telas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={removeSelected}>Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3 w-8">
                <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAllOnPage} aria-label="Selecionar todos" />
              </th>
              <th className="p-3">Nome</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Etapa</th>
              <th className="p-3">Importado em</th>
              <th className="p-3">Último contato</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && filtered.length === 0 && Array.from({ length: 12 }).map((_, i) => (
              <tr key={i} className="border-t">
                {Array.from({ length: 8 }).map((__, j) => <td key={j} className="p-3"><Skeleton className="h-4 w-24" /></td>)}
              </tr>
            ))}
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3">
                  <Checkbox
                    checked={selected.includes(c.id)}
                    onCheckedChange={() => toggleOne(c.id)}
                    aria-label={`Selecionar ${c.name}`}
                  />
                </td>
                <td className="p-3 font-medium"><Link to="/crm/$id" params={{ id: c.id }} className="hover:text-primary">{c.name}</Link></td>
                <td className="p-3 text-muted-foreground">{c.company_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{c.whatsapp ?? "—"}</td>
                <td className="p-3"><Badge variant="secondary">{FUNNEL_STAGES.find(s => s.key === c.funnel_stage)?.label ?? c.funnel_stage}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{formatDateTime(c.created_at)}</td>
                <td className="p-3 text-xs text-muted-foreground">{formatDateTime(c.last_contact_at)}</td>
                <td className="p-3 text-right">
                  <WhatsAppQuickSend contactId={c.id} to={c.whatsapp} contactName={c.name} />
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum contato encontrado com estes filtros. Crie um clicando em <b>Novo Cliente</b>.</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Página {page + 1} de {pages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function NewContactDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ funnel_stage: "novo_lead" });

  async function save() {
    if (!form.name) return toast.error("Nome é obrigatório");
    const { error } = await supabase.from("contacts").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Contato criado");
    setOpen(false);
    setForm({ funnel_stage: "novo_lead" });
    qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Novo Cliente</Button></DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Novo cliente</DialogTitle></DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Nome *"><Input value={form.name ?? ""} onChange={upd("name")} /></Field>
          <Field label="Empresa"><Input value={form.company_name ?? ""} onChange={upd("company_name")} /></Field>
          <Field label="WhatsApp"><Input value={form.whatsapp ?? ""} onChange={upd("whatsapp")} /></Field>
          <Field label="Telefone"><Input value={form.phone ?? ""} onChange={upd("phone")} /></Field>
          <Field label="E-mail"><Input value={form.email ?? ""} onChange={upd("email")} /></Field>
          <Field label="Instagram"><Input value={form.instagram ?? ""} onChange={upd("instagram")} /></Field>
          <Field label="Cidade"><Input value={form.city ?? ""} onChange={upd("city")} /></Field>
          <Field label="Data de nascimento"><Input type="date" value={form.birthdate ?? ""} onChange={upd("birthdate")} /></Field>
          <Field label="Profissão"><Input value={form.profession ?? ""} onChange={upd("profession")} /></Field>
          <Field label="Filhos"><Input value={form.children ?? ""} onChange={upd("children")} /></Field>
          <Field label="Origem">
            <Select value={form.origin ?? ""} onValueChange={(v) => setForm({ ...form, origin: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>{ORIGENS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Etapa do funil">
            <Select value={form.funnel_stage} onValueChange={(v) => setForm({ ...form, funnel_stage: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{FUNNEL_STAGES.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Serviço de interesse" className="md:col-span-2"><Input value={form.service_interest ?? ""} onChange={upd("service_interest")} /></Field>
          <Field label="Objetivo" className="md:col-span-2"><Textarea rows={2} value={form.goal ?? ""} onChange={upd("goal")} /></Field>
          <Field label="Dor principal" className="md:col-span-2"><Textarea rows={2} value={form.main_pain ?? ""} onChange={upd("main_pain")} /></Field>
          <Field label="Observações" className="md:col-span-2"><Textarea rows={2} value={form.notes ?? ""} onChange={upd("notes")} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}