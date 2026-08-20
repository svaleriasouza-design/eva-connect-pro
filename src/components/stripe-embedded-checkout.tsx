import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Loader2, AlertTriangle } from "lucide-react";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { createCheckoutSession } from "@/utils/payments.functions";

/**
 * Busca o clientSecret antes de montar o provider — assim, se a Stripe falhar,
 * mostramos o erro na tela em vez de deixar um espaço em branco.
 */
export function StripeEmbeddedCheckout({ priceId, returnUrl }: { priceId: string; returnUrl?: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await createCheckoutSession({
          data: {
            priceId,
            returnUrl: returnUrl || window.location.href,
            environment: getStripeEnvironment(),
          },
        });
        if (cancelled) return;
        if ("error" in result) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("O provedor de pagamento não retornou a sessão de checkout.");
        setClientSecret(result.clientSecret);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Não foi possível abrir o pagamento.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [priceId, returnUrl]);

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Não foi possível carregar o pagamento.</p>
          <p className="mt-1 break-words opacity-90">{error}</p>
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border bg-card p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando pagamento…
      </div>
    );
  }

  return (
    <div id="checkout" className="rounded-xl border bg-card p-2">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: () => Promise.resolve(clientSecret) }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
