import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersFn, setUserRoleFn, createWorkspaceUserFn, deleteWorkspaceUserFn } from "@/lib/users.functions";
import { useAccess } from "@/hooks/use-access";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/db";
import { toast } from "sonner";
import { ShieldCheck, Loader as Loader2, Users, UserPlus, Trash2, Crown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/usuarios")({
  component: UsuariosPage,
  head: () => ({
    meta: [
      { title: "Usuários e permissões · EVA IA" },
      { name: "description", content: "Gerencie quem acessa a EVA IA e o nível de permissão de cada pessoa da equipe." },
      { property: "og:title", content: "Usuários e permissões · EVA IA" },
      { property: "og:description", content: "Controle de acesso por usuário na central comercial EVA IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  operador: "Operador",
  leitor: "Leitor",
};

const ROLE_HELP: Record<string, string> = {
  admin: "Acesso total, inclusive configurações e gestão de usuários.",
  operador: "Pode enviar mensagens, editar CRM, agenda e cadências.",
  leitor: "Somente visualiza — não envia mensagens nem altera dados.",
};

function UsuariosPage() {
  const qc = useQueryClient();
  const { isAdmin, loading, access, isOwner } = useAccess();
  const listFn = useServerFn(listUsersFn);
  const setRoleFn = useServerFn(setUserRoleFn);
  const createUserFn = useServerFn(createWorkspaceUserFn);
  const removeUserFn = useServerFn(deleteWorkspaceUserFn);
  const [addName, setAddName] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<any | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("operador");
  const [adding, setAdding] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-roles"],
    queryFn: () => listFn() as Promise<any[]>,
    enabled: isAdmin,
  });

  async function changeRole(userId: string, role: string) {
    try {
      await setRoleFn({ data: { userId, role: role as any } });
      toast.success("Permissão atualizada");
      qc.invalidateQueries({ queryKey: ["users-roles"] });
      qc.invalidateQueries({ queryKey: ["my-access"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível alterar a permissão");
    }
  }

  async function addUser() {
    setAdding(true);
    try {
      const res: any = await createUserFn({
        data: { email: addEmail, password: addPassword, fullName: addName, role: addRole as any },
      });
      toast.success(`${res?.name ?? "Usuário"} cadastrado no seu workspace.`);
      setAddOpen(false);
      setAddEmail("");
      setAddName("");
      setAddPassword("");
      setAddRole("operador");
      qc.invalidateQueries({ queryKey: ["users-roles"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível cadastrar o usuário.");
    } finally {
      setAdding(false);
    }
  }

  async function deleteUser(userId: string) {
    setRemoving(userId);
    try {
      await removeUserFn({ data: { userId } });
      toast.success("Usuário excluído da plataforma. Os dados do workspace foram preservados.");
      setConfirmUser(null);
      qc.invalidateQueries({ queryKey: ["users-roles"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível excluir o usuário.");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-lg p-6 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" /> Acesso restrito</div>
          <p className="text-muted-foreground">
            Somente administradores podem gerenciar usuários. Seu nível atual: <strong>{ROLE_LABEL[access?.roles[0] ?? "leitor"]}</strong>.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold"><Users className="h-5 w-5 text-primary" /> Usuários e permissões</h1>
          <p className="text-sm text-muted-foreground">
            Adicione membros da equipe e defina o nível de acesso de cada pessoa.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Adicionar usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Adicionar usuário ao workspace</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                O usuário é criado já dentro do seu workspace e usa a sua assinatura — ele não precisa contratar um plano.
              </p>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Nome da pessoa" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail do usuário</Label>
                <Input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="pessoa@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Senha inicial (mínimo 8 caracteres)</Label>
                <Input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Permissão</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="operador">Operador</SelectItem>
                    <SelectItem value="leitor">Leitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
              <Button onClick={addUser} disabled={adding || !addEmail || addPassword.length < 8}>
                {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cadastrar usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        {(["admin", "operador", "leitor"] as const).map((r) => (
          <Card key={r} className="p-3">
            <div className="text-sm font-medium">{ROLE_LABEL[r]}</div>
            <div className="text-xs text-muted-foreground">{ROLE_HELP[r]}</div>
          </Card>
        ))}
      </div>

      <Card className="divide-y">
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Carregando usuários…</div>}
        {!isLoading && users.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum usuário ainda. Adicione alguém ao seu workspace.</div>}
        {users.map((u) => {
          const role = u.roles?.[0] ?? "leitor";
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(u.full_name || u.email || "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{u.full_name || u.email}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email} · desde {formatDateTime(u.created_at)}</div>
              </div>
              {u.id === access?.ownerUserId && (
                <Badge className="gap-1 text-[10px]"><Crown className="h-3 w-3" /> proprietário</Badge>
              )}
              {u.id === access?.userId && <Badge variant="secondary" className="text-[10px]">você</Badge>}
              <Select value={role} onValueChange={(v) => changeRole(u.id, v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="leitor">Leitor</SelectItem>
                </SelectContent>
              </Select>
              {isOwner && u.id !== access?.ownerUserId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-destructive"
                  disabled={removing === u.id}
                  onClick={() => setConfirmUser(u)}
                >
                  {removing === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Excluir usuário
                </Button>
              )}
            </div>
          );
        })}
      </Card>

      <AlertDialog open={!!confirmUser} onOpenChange={(o) => !o && setConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário da plataforma?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmUser?.full_name || confirmUser?.email} perderá totalmente o acesso à EVA. Nenhum dado do seu
              workspace é excluído — leads, empresas, cadências, mensagens, agenda e configurações permanecem intactos.
              Esse e-mail poderá, no futuro, criar uma nova conta independente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmUser && deleteUser(confirmUser.id)}>
              Excluir usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
