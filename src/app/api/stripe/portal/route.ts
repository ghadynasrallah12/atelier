import { handler, json, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { stripe, billingEnabled } from "@/lib/billing";

export const POST = handler(async () => {
  if (!billingEnabled()) return fail("Billing is not configured on this deployment.");
  const { user } = await requireUser();
  const { data: prof } = await supabaseAdmin().from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!prof?.stripe_customer_id) return fail("No subscription yet.");
  const session = await stripe().billingPortal.sessions.create({ customer: prof.stripe_customer_id, return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/settings` });
  return json({ url: session.url });
});
