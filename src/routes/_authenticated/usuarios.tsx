import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listUsersFn, setUserRoleFn } from "@/lib/users.functions";
import { useAccess } from "@/hooks/use-access";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/db";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Users } from "lucide-react";

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
  const { isAdmin, loading, access } = useAccess();
  const listFn = useServerFn(listUsersFn);
  const setRoleFn = useServerFn(setUserRoleFn);

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
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold"><Users className="h-5 w-5 text-primary" /> Usuários e permissões</h1>
        <p className="text-sm text-muted-foreground">
          Quem se cadastra entra como <strong>Leitor</strong> e só visualiza. Libere aqui o nível de cada pessoa.
        </p>
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
        {!isLoading && users.length === 0 && <div className="p-6 text-sm text-muted-foreground">Nenhum usuário ainda.</div>}
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
              {u.id === access?.userId && <Badge variant="secondary" className="text-[10px]">você</Badge>}
              <Select value={role} onValueChange={(v) => changeRole(u.id, v)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="operador">Operador</SelectItem>
                  <SelectItem value="leitor">Leitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
