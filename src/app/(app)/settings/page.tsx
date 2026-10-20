import { requireProfile } from "@/lib/supabase/server";
import { billingEnabled, daysLeft, PRICE } from "@/lib/billing";
import { SettingsClient } from "@/components/SettingsClient";

export default async function Settings() {
  const { profile, access, admin } = await requireProfile();
  return <SettingsClient profile={{ email: profile.email || "", plan: profile.plan, hint: profile.hf_key_hint, hasCustomer: !!profile.stripe_customer_id, daysLeft: daysLeft(profile), entitled: access.ok, billing: billingEnabled(), admin, price: PRICE(), until: profile.access_until ?? null }} />;
}
