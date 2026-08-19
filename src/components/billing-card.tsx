import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CreditCard, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento em atraso",
  unpaid: "Não paga",
  canceled: "Cancelada",
  incomplete: "Pagamento incompleto",
};

export function BillingCard() {
  const { subscription, isActive, loading, refetch } = useSubscription();
  const [opening, setOpening] = useState(false);

  async function openPortal() {
    setOpening(true);
    try {
      const result = await createPortalSession({
        data: { returnUrl: window.location.origin + "/configuracoes", environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o portal de faturamento.");
    } finally {
      setOpening(false);
    }
  }

  const statusLabel = !subscription
    ? "Sem assinatura"
    : STATUS_LABELS[subscription.status] ?? subscription.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Assinatura e faturamento
        </CardTitle>
        <CardDescription>
          Atualize o cartão, veja faturas e cancele ou retome a assinatura pelo portal seguro da Stripe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">Status:</span>
          <Badge variant={isActive ? "default" : "secondary"}>{loading ? "verificando…" : statusLabel}</Badge>
          {subscription?.current_period_end && (
            <span className="text-xs text-muted-foreground">
              {subscription.cancel_at_period_end ? "Acesso até " : "Renova em "}
              {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>

        {subscription?.cancel_at_period_end && (
          <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            O cancelamento está agendado. Abra o portal e clique em <strong>“Renovar plano”</strong> para retomar a assinatura.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={openPortal} disabled={opening || !subscription}>
            {opening ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
            Gerenciar pagamentos
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar status
          </Button>
          {!subscription && (
            <Button variant="ghost" asChild>
              <a href="/assinatura">Ativar assinatura</a>
            </Button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          O portal da Stripe abre em uma nova aba (exigência de segurança da Stripe) e volta para as Configurações ao finalizar.
        </p>
      </CardContent>
    </Card>
  );
}