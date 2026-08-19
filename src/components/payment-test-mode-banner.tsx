const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
        O pagamento em produção ainda não está configurado. Conclua a ativação de pagamentos no projeto para receber de verdade.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b bg-[color:var(--gold)]/15 px-4 py-2 text-center text-sm">
        Ambiente de teste: nenhum pagamento feito aqui é cobrado de verdade.
      </div>
    );
  }
  return null;
}
