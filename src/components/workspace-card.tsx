import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";
import { useAccess } from "@/hooks/use-access";
import { saveWorkspaceFn } from "@/lib/workspace.functions";

export function WorkspaceCard() {
  const { workspace, loading } = useWorkspace();
  const { isAdmin } = useAccess();
  const qc = useQueryClient();
  const save = useServerFn(saveWorkspaceFn);
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) {
      setName(workspace.name);
      setTagline(workspace.tagline);
      setOwner(workspace.owner_name);
    }
  }, [loading, workspace.name, workspace.tagline, workspace.owner_name]);

  async function onSave() {
    if (name.trim().length < 2) {
      toast.error("Informe um nome de workspace válido.");
      return;
    }
    setSaving(true);
    try {
      const res = (await save({
        data: { name: name.trim(), tagline: tagline.trim(), owner_name: owner.trim() },
      })) as { ok: boolean; error?: string };
      if (!res.ok) throw new Error(res.error ?? "Falha ao salvar.");
      await qc.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Nome do workspace atualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Identidade do workspace</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2">
          <Label htmlFor="ws-name">Nome do Workspace</Label>
          <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} placeholder="Ex.: Minha Empresa" />
          <p className="text-xs text-muted-foreground">
            Aparece no cabeçalho, menu lateral, dashboard, título do navegador e nas mensagens da EVA.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ws-tagline">Subtítulo</Label>
            <Input id="ws-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={!isAdmin} placeholder="Assistente Executiva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ws-owner">Responsável</Label>
            <Input id="ws-owner" value={owner} onChange={(e) => setOwner(e.target.value)} disabled={!isAdmin} placeholder="Nome de quem usa a EVA" />
          </div>
        </div>
        {!isAdmin && <p className="text-xs text-muted-foreground">Somente administradores podem alterar estes dados.</p>}
        <Button onClick={onSave} disabled={!isAdmin || saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
