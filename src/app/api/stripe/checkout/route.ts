import { handler, json, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { stripe, billingEnabled } from "@/lib/billing";

export const POST = handler(async () => {
  if (!billingEnabled()) return fail("Billing is not configured on this deployment.");
  const { user } = await requireUser();
  const sb = supabaseAdmin();
  const { data: prof } = await sb.from("profiles").select("stripe_customer_id,email").eq("id", user.id).single();
  const s = stripe();
  let customer = prof?.stripe_customer_id;
  if (!customer) {
    const c = await s.customers.create({ email: prof?.email || user.email || undefined, metadata: { user_id: user.id } });
    customer = c.id;
    await sb.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }
  const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const session = await s.checkout.sessions.create({
    mode: "subscription", customer, line_items: [{ price: process.env.STRIPE_PRICE_STUDIO!, quantity: 1 }],
    success_url: `${app}/settings?billing=success`, cancel_url: `${app}/settings?billing=cancel`,
    subscription_data: { metadata: { user_id: user.id } }, allow_promotion_codes: true,
  });
  return json({ url: session.url });
});
