import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function periods(subscription: any) {
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key || item?.price?.metadata?.lovable_external_id || item?.price?.id;
  const productId = item?.price?.product;
  const start = item?.current_period_start ?? subscription.current_period_start;
  const end = item?.current_period_end ?? subscription.current_period_end;
  return {
    priceId,
    productId,
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
}

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("[payments] subscription without userId metadata", subscription.id);
    return;
  }
  const p = periods(subscription);
  await getSupabase().from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id,
      product_id: p.productId ?? null,
      price_id: p.priceId ?? null,
      status: subscription.status,
      current_period_start: p.start,
      current_period_end: p.end,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function updateSubscription(subscription: any, env: StripeEnv) {
  const p = periods(subscription);
  const { data } = await getSupabase()
    .from("subscriptions")
    .update({
      status: subscription.status,
      product_id: p.productId ?? null,
      price_id: p.priceId ?? null,
      current_period_start: p.start,
      current_period_end: p.end,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env)
    .select("id");
  if (!data || data.length === 0) await upsertSubscription(subscription, env);
}

/** Proteção contra reenvio: registra o evento e retorna false se já foi processado. */
async function claimEvent(event: { id: string; type: string }, env: StripeEnv): Promise<boolean> {
  const { error } = await getSupabase()
    .from("stripe_webhook_events")
    .insert({ event_id: event.id, event_type: event.type, environment: env });
  if (error) {
    console.log("[payments] evento duplicado/ignorado:", event.id, error.code);
    return false;
  }
  return true;
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  if (!(await claimEvent(event, env))) return;

  switch (event.type) {
    case "customer.subscription.created":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.updated":
    case "customer.subscription.paused":
    case "customer.subscription.resumed":
      await updateSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await getSupabase()
        .from("subscriptions")
        .update({ status: "canceled", updated_at: new Date().toISOString() })
        .eq("stripe_subscription_id", event.data.object.id)
        .eq("environment", env);
      break;
    case "invoice.paid":
    case "invoice.payment_failed":
      // O estado real vem dos eventos customer.subscription.* — apenas log.
      console.log("[payments]", event.type, event.data.object?.id);
      break;
    default:
      console.log("[payments] evento não tratado:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[payments] env inválido no webhook:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments] webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
