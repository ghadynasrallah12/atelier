import type Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { stripe } from "@/lib/billing";
import { tierOfPrice } from "@/lib/plans";

/** Keeps profiles.plan and profiles.tier in step with the Stripe subscription. Configure the endpoint for customer.subscription.* events. */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature") || "";
  let event: Stripe.Event;
  try { event = stripe().webhooks.constructEvent(await req.text(), sig, process.env.STRIPE_WEBHOOK_SECRET || ""); }
  catch (e) { return new Response("bad signature: " + (e as Error).message, { status: 400 }); }
  if (event.type.startsWith("customer.subscription.")) {
    const sub = event.data.object as Stripe.Subscription;
    const customer = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const plan = ["active", "trialing"].includes(sub.status) ? "active" : sub.status === "past_due" || sub.status === "unpaid" ? "past_due" : "canceled";
    const tier = tierOfPrice(sub.items.data[0]?.price?.id) || (sub.metadata?.tier as string | undefined) || null;
    const patch: Record<string, unknown> = { plan, stripe_subscription_id: sub.id, requested_at: null };
    if (tier) patch.tier = tier;
    await supabaseAdmin().from("profiles").update(patch).eq("stripe_customer_id", customer);
  }
  return new Response("ok");
}
