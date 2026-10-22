import { requireProfile } from "@/lib/supabase/server";
import { billingEnabled, daysLeft } from "@/lib/billing";
import { SettingsClient } from "@/components/SettingsClient";

export default async function Settings() {
  const { profile, access, admin, plan } = await requireProfile();
  return <SettingsClient profile={{ email: profile.email || "", plan: profile.plan, hint: profile.hf_key_hint, ggHint: profile.gg_key_hint ?? null, hasCustomer: !!profile.stripe_customer_id, daysLeft: daysLeft(profile), entitled: access.ok, billing: billingEnabled(), admin, tier: plan.id, tierName: plan.name, until: profile.access_until ?? null }} />;
}
