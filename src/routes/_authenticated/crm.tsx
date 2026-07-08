import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase, FUNNEL_STAGES, ORIGENS, formatDateTime } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Upload, Download, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/crm")({ component: () => <Outlet /> });

export function CrmList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState<string>("all");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0, inserted: 0, skipped: 0 });
  const { data: contacts = [] } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => (await supabase.from("contacts").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    return contacts.filter((c: any) => {
      if (stage !== "all" && c.funnel_stage !== stage) return false;
      if (q && !`${c.name} ${c.company_name ?? ""} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [contacts, q, stage]);

  async function importCsv(file: File) {
    setImporting(true);
    setImportProgress({ done: 0, total: 0, inserted: 0, skipped: 0 });

    const pick = (row: Record<string, any>, keys: string[]): string | null => {
      for (const k of keys) {
        const found = Object.keys(row).find(
          (rk) => rk.trim().toLowerCase().replace(/[\s_-]+/g, "") === k.toLowerCase().replace(/[\s_-]+/g, "")
        );
        const v = found ? row[found] : undefined;
        if (v != null && String(v).trim()) return String(v).trim();
      }
      return null;
    };

    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: true,
      worker: true,
      complete: async (results) => {
        const rows = results.data;
        const mapped = rows
          .map((r) => {
            const name =
              pick(r, ["Razao Social", "Razão Social", "Nome Fantasia", "name", "nome"]) || null;
            if (!name) return null;
            return {
              name,
              phone: pick(r, ["Telefone1 Completo", "Telefone", "phone", "telefone"]),
              whatsapp: pick(r, ["Telefone1 Completo", "WhatsApp", "whatsapp"]),
              email: pick(r, ["E-mail", "Email", "email"]),
              company_name: pick(r, ["Nome Fantasia", "Razao Social", "Razão Social", "company"]),
              city: pick(r, ["Cidade", "city"]),
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        if (mapped.length === 0) {
          setImporting(false);
          return toast.error("Nenhuma linha válida encontrada (verifique a coluna Razao Social).");
        }

        const BATCH = 100;
        setImportProgress({ done: 0, total: mapped.length, inserted: 0, skipped: 0 });
        let inserted = 0;
        let skipped = 0;

        for (let i = 0; i < mapped.length; i += BATCH) {
          const batch = mapped.slice(i, i + BATCH);
          const { error } = await supabase.from("contacts").insert(batch);
          if (error) {
            skipped += batch.length;
            console.error("Batch insert error:", error);
          } else {
            inserted += batch.length;
          }
          setImportProgress({
            done: Math.min(i + BATCH, mapped.length),
            total: mapped.length,
            inserted,
            skipped,
          });
        }

        toast.success(`${inserted} contatos importados${skipped ? ` · ${skipped} ignorados` : ""}`);
        qc.invalidateQueries({ queryKey: ["contacts"] });
        setImporting(false);
      },
      error: (err) => {
        setImporting(false);
        toast.error(`Erro ao ler CSV: ${err.message}`);
      },
    });
  }

  function exportCsv() {
    const headers = ["name","company_name","whatsapp","email","funnel_stage","city","created_at"];
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
          <p className="text-sm text-muted-foreground">{filtered.length} contatos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importCsv(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" asChild disabled={importing}>
              <span><Upload className="mr-2 h-4 w-4" /> {importing ? "Importando…" : "Importar CSV"}</span>
            </Button>
          </label>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" /> Exportar</Button>
          <NewContactDialog />
        </div>
      </div>

      {importing && (
        <Card className="p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Importando contatos…</span>
            <span className="text-muted-foreground">
              {importProgress.done} / {importProgress.total || "?"}
              {importProgress.skipped ? ` · ${importProgress.skipped} ignorados` : ""}
            </span>
          </div>
          <Progress value={importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0} />
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, empresa, e-mail…" className="pl-9" />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etapas</SelectItem>
            {FUNNEL_STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Empresa</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Etapa</th>
              <th className="p-3">Último contato</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="p-3 font-medium"><Link to="/crm/$id" params={{ id: c.id }} className="hover:text-primary">{c.name}</Link></td>
                <td className="p-3 text-muted-foreground">{c.company_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{c.whatsapp ?? "—"}</td>
                <td className="p-3"><Badge variant="secondary">{FUNNEL_STAGES.find(s => s.key === c.funnel_stage)?.label ?? c.funnel_stage}</Badge></td>
                <td className="p-3 text-xs text-muted-foreground">{formatDateTime(c.last_contact_at)}</td>
                <td className="p-3 text-right">
                  {c.whatsapp && (
                    <a href={`https://wa.me/${c.whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum contato ainda. Crie o primeiro clicando em <b>Novo Cliente</b>.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
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