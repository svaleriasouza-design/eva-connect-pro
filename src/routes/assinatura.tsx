import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LogOut, RefreshCw, Sparkles } from "lucide-react";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { useSubscription } from "@/hooks/use-subscription";
import { EVA_PRICE_ID, getStripeEnvironment } from "@/lib/stripe";
import { createPortalSession } from "@/utils/payments.functions";
import evaLogo from "@/assets/eva-logo.png";
import { useAccess } from "@/hooks/use-access";

export const Route = createFileRoute("/assinatura")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Quem já tem liberação (admin, VIP, degustação ou assinatura) volta para o app.
    const { data: access } = await supabase.rpc("has_app_access", {
      _user_id: data.user.id,
      check_env: getStripeEnvironment(),
    });
    if (access === true) throw redirect({ to: "/" });
    return { user: data.user };
  },
  component: AssinaturaPage,
  head: () => ({
    meta: [
      { title: "Assinatura mensal · EVA IA" },
      { name: "description", content: "Ative ou renove sua assinatura mensal da EVA IA e libere o acesso completo à central comercial." },
      { property: "og:title", content: "Assinatura mensal · EVA IA" },
      { property: "og:description", content: "Assinatura mensal da EVA IA — acesso completo à central comercial com CRM, cadência e agenda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const BENEFITS = [
  "CRM completo com importação de listas e funil de vendas",
  "Cadência automática de WhatsApp com múltiplos números",
  "Agenda inteligente com Google Agenda e link de reunião",
  "EVA IA respondendo e qualificando leads por você",
];

function AssinaturaPage() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const { subscription, isActive, loading, refetch } = useSubscription();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const { isOwner, loading: accessLoading } = useAccess();
  const [portalLoading, setPortalLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  // Após voltar do checkout, o status chega via webhook — revalidamos algumas vezes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("session_id")) return;
    setChecking(true);
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      const { data } = await refetch();
      if (data || tries >= 8) {
        clearInterval(timer);
        setChecking(false);
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [refetch]);

  useEffect(() => {
    if (isActive) {
      toast.success("Assinatura ativa. Bom trabalho ✨");
      navigate({ to: "/" });
    }
  }, [isActive, navigate]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const result = await createPortalSession({
        data: { returnUrl: window.location.origin + "/assinatura", environment: getStripeEnvironment() },
      });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível abrir o portal de faturamento.");
    } finally {
      setPortalLoading(false);
    }
  }

  const statusLabel = !subscription
    ? "Sem assinatura"
    : { active: "Ativa", trialing: "Em teste", past_due: "Pagamento em atraso", unpaid: "Não paga", canceled: "Cancelada", incomplete: "Pagamento incompleto" }[
        subscription.status
      ] ?? subscription.status;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[color:var(--petrol)] to-[color:var(--petrol-dark,#0f2a35)]">
      <PaymentTestModeBanner />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8 flex flex-col items-center gap-2 text-center text-white">
          <img src={evaLogo} alt="EVA IA" width={56} height={56} className="rounded-xl bg-white/10 p-2" />
          <h1 className="text-2xl font-semibold tracking-tight">Assinatura EVA IA</h1>
          <p className="max-w-lg text-sm text-white/70">
            Seu acesso está bloqueado até a mensalidade ser confirmada. Ative agora e libere a central comercial completa por 30 dias.
          </p>
        </div>

        <Card className="mb-4">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[color:var(--gold)]" />
                  Plano mensal
                </CardTitle>
                <CardDescription>Renovação automática a cada 30 dias. Cancele quando quiser.</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">R$ 99,00</div>
                <div className="text-xs text-muted-foreground">por mês</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status atual:</span>
              <Badge variant={isActive ? "default" : "secondary"}>{loading ? "verificando…" : statusLabel}</Badge>
              {subscription?.current_period_end && (
                <span className="text-xs text-muted-foreground">
                  Válida até {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                </span>
              )}
            </div>

            <p className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              Tem um cupom de desconto? Na tela de pagamento clique em <strong>“Adicionar código promocional”</strong> e informe o código —
              o desconto de R$ 40,00 é aplicado automaticamente.
            </p>

            {!isOwner && !accessLoading ? (
              <div className="space-y-2">
                <p className="rounded-lg border bg-muted/40 p-3 text-sm">
                  Sua conta é gerenciada pelo proprietário do workspace. Ele precisa regularizar a mensalidade — você
                  não deve contratar uma assinatura própria.
                </p>
                <Button variant="outline" onClick={() => refetch()} disabled={checking}>
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Verificar novamente
                </Button>
              </div>
            ) : !checkoutOpen ? (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setCheckoutOpen(true)} className="flex-1 sm:flex-none">
                  Assinar por R$ 99,00/mês
                </Button>
                <Button variant="outline" onClick={() => refetch()} disabled={checking}>
                  {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Já paguei, verificar
                </Button>
                {subscription && (
                  <Button variant="ghost" onClick={openPortal} disabled={portalLoading}>
                    {portalLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Gerenciar faturamento
                  </Button>
                )}
              </div>
            ) : (
              <StripeEmbeddedCheckout
                priceId={EVA_PRICE_ID}
                returnUrl={`${window.location.origin}/assinatura?session_id={CHECKOUT_SESSION_ID}`}
              />
            )}

          </CardContent>
        </Card>

        <div className="flex items-center justify-between text-xs text-white/60">
          <span>{user.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="inline-flex items-center gap-1 hover:text-white"
          >
            <LogOut className="h-3 w-3" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
}
