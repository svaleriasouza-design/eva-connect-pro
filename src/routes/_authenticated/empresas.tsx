import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase, formatDate, fetchAllRows } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({ component: Empresas });

function Empresas() {
  const qc = useQueryClient();
  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => fetchAllRows("companies", "*", { column: "created_at", ascending: false }),
  });
  const { data: contactCounts = {} } = useQuery({
    queryKey: ["empresas-contacts"],
    queryFn: async () => {
      const data = await fetchAllRows<{ company_id: string | null }>("contacts", "company_id");
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c: any) => {
        if (c.company_id) counts[c.company_id] = (counts[c.company_id] ?? 0) + 1;
      });
      return counts;
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({});
  const upd = (k: string) => (e: any) => setForm({ ...form, [k]: e?.target?.value ?? e });

  async function save() {
    if (!form.name) return toast.error("Nome é obrigatório");
    const { error } = await supabase.from("companies").insert(form);
    if (error) return toast.error(error.message);
    toast.success("Empresa criada");
    setOpen(false); setForm({});
    qc.invalidateQueries({ queryKey: ["companies"] });
  }
  async function remove(id: string) {
    if (!confirm("Excluir empresa?")) return;
    await supabase.from("companies").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["companies"] });
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Empresas</h1>
          <p className="text-sm text-muted-foreground">{companies.length} empresas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nova empresa</DialogTitle></DialogHeader>
            <div className="grid gap-3 md:grid-cols-2">
              <Fld label="Nome *"><Input value={form.name ?? ""} onChange={upd("name")} /></Fld>
              <Fld label="Responsável"><Input value={form.responsible ?? ""} onChange={upd("responsible")} /></Fld>
              <Fld label="Telefone"><Input value={form.phone ?? ""} onChange={upd("phone")} /></Fld>
              <Fld label="E-mail"><Input value={form.email ?? ""} onChange={upd("email")} /></Fld>
              <Fld label="Segmento"><Input value={form.segment ?? ""} onChange={upd("segment")} /></Fld>
              <Fld label="Cidade"><Input value={form.city ?? ""} onChange={upd("city")} /></Fld>
              <Fld label="Nº colaboradores"><Input type="number" value={form.employees ?? ""} onChange={upd("employees")} /></Fld>
              <Fld label="Renovação"><Input type="date" value={form.renewal ?? ""} onChange={upd("renewal")} /></Fld>
              <Fld label="Diagnóstico" className="md:col-span-2"><Textarea rows={2} value={form.diagnosis ?? ""} onChange={upd("diagnosis")} /></Fld>
              <Fld label="Observações" className="md:col-span-2"><Textarea rows={2} value={form.notes ?? ""} onChange={upd("notes")} /></Fld>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={save}>Salvar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((c: any) => (
          <Card key={c.id} className="p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.segment ?? "—"} · {c.city ?? "—"}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Responsável: {c.responsible ?? "—"}</div>
              <div>Colaboradores: {c.employees ?? "—"}</div>
              <div>Próx. reunião: {formatDate(c.next_meeting)}</div>
              <div>Contatos vinculados: {(contactCounts as any)[c.id] ?? 0}</div>
            </div>
          </Card>
        ))}
        {companies.length === 0 && <div className="text-sm text-muted-foreground col-span-full">Nenhuma empresa cadastrada.</div>}
      </div>
    </div>
  );
}

function Fld({ label, children, className = "" }: any) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs">{label}</Label>{children}</div>;
}