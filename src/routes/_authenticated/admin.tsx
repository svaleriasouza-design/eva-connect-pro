import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Crown, Gift, Ban, RefreshCw } from "lucide-react";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  listPlatformUsersFn,
  grantTrialFn,
  grantVipFn,
  revokeAccessFn,
  setPlatformAdminFn,
  getPlatformStatusFn,
} from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel administrativo · EVA IA" },
      { name: "description", content: "Gestão de usuários da EVA IA: degustação, acesso VIP, revogação e administradoras." },
      { property: "og:title", content: "Painel administrativo · EVA IA" },
      { property: "og:description", content: "Gerencie usuários, liberações de acesso e assinaturas da plataforma EVA IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function badgeVariant(label: string): "default" | "secondary" | "destructive" | "outline" {
  if (label === "Revogado" || label === "Inativo") return "destructive";
  if (label === "Administradora") return "default";
  return "secondary";
}

function AdminPage() {
  const env = getStripeEnvironment();
  const qc = useQueryClient();
  const statusFn = useServerFn(getPlatformStatusFn);
  const listFn = useServerFn(listPlatformUsersFn);
  const trialFn = useServerFn(grantTrialFn);
  const vipFn = useServerFn(grantVipFn);
  const revokeFn = useServerFn(revokeAccessFn);
  const adminFn = useServerFn(setPlatformAdminFn);
  const [days, setDays] = useState<Record<string, string>>({});

  const status = useQuery({ queryKey: ["platform-status"], queryFn: () => statusFn() as Promise<any> });
  const users = useQuery({
    queryKey: ["platform-users", env],
    queryFn: () => listFn({ data: { environment: env } }) as Promise<any[]>,
    enabled: status.data?.isPlatformAdmin === true,
  });

  const act = useMutation({
    mutationFn: async (op: () => Promise<unknown>) => op(),
    onSuccess: () => {
      toast.success("Acesso atualizado.");
      void qc.invalidateQueries({ queryKey: ["platform-users"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."),
  });

  if (status.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!status.data?.isPlatformAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Área restrita</CardTitle>
            <CardDescription>Este painel é exclusivo da administradora da plataforma.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const rows = users.data ?? [];

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-[color:var(--gold)]" />
            Painel administrativo
          </h1>
          <p className="text-sm text-muted-foreground">
            Todos os usuários cadastrados na plataforma, com status de acesso e ações manuais.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => users.refetch()} disabled={users.isFetching}>
          {users.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários ({rows.length})</CardTitle>
          <CardDescription>
            Liberação total do app para administradoras, assinantes ativos, VIPs e usuários em degustação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.isLoading && (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {rows.map((u) => (
            <div key={u.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{u.full_name || "Sem nome"}</span>
                    <Badge variant={badgeVariant(u.accessLabel)}>{u.accessLabel}</Badge>
                    {u.is_platform_admin && <Crown className="h-3.5 w-3.5 text-[color:var(--gold)]" />}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">{u.email}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Cadastro: {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    {u.trial_ends_at && ` · Degustação até ${new Date(u.trial_ends_at).toLocaleDateString("pt-BR")}`}
                    {u.subscription_status && ` · Stripe: ${u.subscription_status}`}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      className="h-8 w-16"
                      inputMode="numeric"
                      placeholder="15"
                      value={days[u.id] ?? ""}
                      onChange={(e) => setDays((d) => ({ ...d, [u.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const n = Number(days[u.id] || 15);
                        if (!Number.isFinite(n) || n < 1) return toast.error("Informe uma quantidade de dias válida.");
                        act.mutate(() => trialFn({ data: { userId: u.id, days: Math.floor(n) } }));
                      }}
                    >
                      <Gift className="mr-1 h-3.5 w-3.5" /> Degustação
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={u.vip}
                    onClick={() => act.mutate(() => vipFn({ data: { userId: u.id } }))}
                  >
                    <Crown className="mr-1 h-3.5 w-3.5" /> {u.vip ? "VIP ativo" : "Conceder VIP"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => act.mutate(() => adminFn({ data: { userId: u.id, isAdmin: !u.is_platform_admin } }))}
                  >
                    <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                    {u.is_platform_admin ? "Remover admin" : "Tornar admin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => act.mutate(() => revokeFn({ data: { userId: u.id } }))}
                  >
                    <Ban className="mr-1 h-3.5 w-3.5" /> Revogar
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {!users.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
