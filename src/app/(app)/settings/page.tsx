import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { billingEnabled, entitled, trialDaysLeft } from "@/lib/billing";
import { SettingsClient } from "@/components/SettingsClient";

export default async function Settings() {
  const { user } = await requireUser();
  const { data: prof } = await supabaseAdmin().from("profiles").select("plan,trial_ends_at,hf_key_hint,stripe_customer_id,email").eq("id", user.id).single();
  const p = prof || { plan: "trial", trial_ends_at: new Date().toISOString(), hf_key_hint: null, stripe_customer_id: null, email: user.email };
  return <SettingsClient profile={{ email: p.email || user.email || "", plan: p.plan, hint: p.hf_key_hint, hasCustomer: !!p.stripe_customer_id, daysLeft: trialDaysLeft(p), entitled: entitled(p).ok, billing: billingEnabled() }} />;
}
