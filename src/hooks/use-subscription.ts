import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

export type SubscriptionRow = {
  status: string;
  price_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
};

function isActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const future = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status) && future) return true;
  if (sub.status === "canceled" && end !== null && end > Date.now()) return true;
  return false;
}

export function useSubscription() {
  const q = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("status, price_id, current_period_end, cancel_at_period_end, stripe_customer_id")
        .eq("user_id", auth.user.id)
        .eq("environment", getStripeEnvironment())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data ?? null) as SubscriptionRow | null;
    },
    staleTime: 30_000,
  });

  // Sincronização em tempo real: o webhook da Stripe grava na tabela e o app
  // reflete cancelamento, atraso e renovação na hora.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || cancelled) return;
      channel = supabase
        .channel(`subscriptions:${auth.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${auth.user.id}` },
          () => void q.refetch(),
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    subscription: q.data ?? null,
    loading: q.isLoading,
    isActive: isActive(q.data ?? null),
    isPastDue: (q.data?.status ?? null) === "past_due",
    refetch: q.refetch,
  };
}
