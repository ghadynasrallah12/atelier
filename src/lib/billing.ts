import Stripe from "stripe";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing");
export const billingEnabled = () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_STUDIO;

export type Profile = { plan: string; trial_ends_at: string; stripe_customer_id?: string | null; hf_key_hint?: string | null };

/** Can this account queue generations? Trial still running, or an active subscription. */
export function entitled(p: Profile) {
  if (!billingEnabled()) return { ok: true, reason: "" };
  if (p.plan === "active") return { ok: true, reason: "" };
  if (p.plan === "trial" && new Date(p.trial_ends_at).getTime() > Date.now()) return { ok: true, reason: "" };
  return { ok: false, reason: p.plan === "past_due" ? "Your last payment failed. Update your card to keep generating." : "Your trial has ended. Subscribe to keep generating." };
}

export function trialDaysLeft(p: Profile) {
  return Math.max(0, Math.ceil((new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000));
}
