import Stripe from "stripe";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_missing");
export const billingEnabled = () => !!process.env.STRIPE_SECRET_KEY && !!(process.env.STRIPE_PRICE_STUDIO || process.env.STRIPE_PRICE_ATELIER || process.env.STRIPE_PRICE_HOUSE);
export const PRICE = () => process.env.NEXT_PUBLIC_PRICE || "from $29 / month";
export const CONTACT = () => process.env.NEXT_PUBLIC_CONTACT_URL || "";

/** Admins are listed in ADMIN_EMAILS (comma-separated). They always have access and see /admin. */
export function isAdmin(email?: string | null) {
  if (!email) return false;
  return (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export type Profile = { plan: string; tier?: string | null; requested_tier?: string | null; trial_ends_at: string; access_until?: string | null; stripe_customer_id?: string | null; hf_key_hint?: string | null; email?: string | null; requested_at?: string | null };

/**
 * Can this account open the studio and queue generations?
 * Admin → always. Subscription active → yes. Admin-granted access (access_until in the future) → yes. Trial still running → yes.
 * Everything else is locked: the library, the shoot builder and Claude drafting all stay behind the gate.
 */
export function entitled(p: Profile): { ok: boolean; reason: string; until?: string | null } {
  if (isAdmin(p.email)) return { ok: true, reason: "" };
  if (p.plan === "active") return { ok: true, reason: "" };
  if (p.access_until && new Date(p.access_until).getTime() > Date.now()) return { ok: true, reason: "", until: p.access_until };
  if (p.plan === "trial" && new Date(p.trial_ends_at).getTime() > Date.now()) return { ok: true, reason: "", until: p.trial_ends_at };
  if (p.plan === "past_due") return { ok: false, reason: "Your last payment failed. Update your card to keep the studio open." };
  if (p.access_until) return { ok: false, reason: "Your access has ended. Renew to keep the studio open." };
  return { ok: false, reason: "This studio is for members. Get access to open the library, the shoot builder and reels." };
}

export function daysLeft(p: Profile) {
  const until = p.plan === "active" ? null : p.access_until && new Date(p.access_until).getTime() > Date.now() ? p.access_until : p.trial_ends_at;
  if (!until) return null;
  return Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000));
}
/** @deprecated use daysLeft */
export const trialDaysLeft = (p: Profile) => daysLeft(p) ?? 0;
