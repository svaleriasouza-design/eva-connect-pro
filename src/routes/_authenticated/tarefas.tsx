import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase, formatDateTime } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/tarefas")({ component: Tarefas });

function Tarefas() {
  const qc = useQueryClient();
  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => (await supabase.from("tasks").select("*").order("done").order("due_at", { nullsFirst: false })).data ?? [],
  });
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  async function add() {
    if (!title.trim()) return;
    await supabase.from("tasks").insert({ title, due_at: due ? new Date(due).toISOString() : null });
    setTitle(""); setDue("");
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function toggle(id: string, done: boolean) {
    await supabase.from("tasks").update({ done: !done }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }
  async function remove(id: string) { await supabase.from("tasks").delete().eq("id", id); qc.invalidateQueries({ queryKey: ["tasks"] }); }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div><h1 className="text-2xl font-semibold">Tarefas</h1><p className="text-sm text-muted-foreground">{tasks.filter((t:any)=>!t.done).length} pendentes</p></div>
      <Card className="flex gap-2 p-3">
        <Input placeholder="Nova tarefa…" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="w-52" />
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </Card>
      <div className="space-y-2">
        {tasks.map((t: any) => (
          <Card key={t.id} className={`flex items-center gap-3 p-3 ${t.done ? "opacity-60" : ""}`}>
            <Checkbox checked={t.done} onCheckedChange={() => toggle(t.id, t.done)} />
            <div className="flex-1">
              <div className={`text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</div>
              {t.due_at && <div className="text-xs text-muted-foreground">{formatDateTime(t.due_at)}</div>}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
        {tasks.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma tarefa.</div>}
      </div>
    </div>
  );
}