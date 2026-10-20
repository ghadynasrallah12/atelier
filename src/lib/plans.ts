/** The three offers. Generations are always on the user's own Higgsfield key; tiers differ by brands and rooms. */
export type Tier = "studio" | "atelier" | "house";
export type Plan = { id: Tier; name: string; price: number; tagline: string; features: string[]; brands: number; reels: boolean; reach: boolean; popular?: boolean };

export const PLANS: Plan[] = [
  { id: "studio", name: "Studio", price: 29, tagline: "One brand. Shoot on-model images and reels from a product photo.", brands: 1, reels: false, reach: false,
    features: ["1 brand", "Brand bible written from your website", "Library: 74 cards with real reference shots", "Shoot builder: images and 9:16 reels", "House models with a fixed face", "Hooks bank"] },
  { id: "atelier", name: "Atelier", price: 59, tagline: "For a brand that posts every week and wants to know what works.", brands: 3, reels: true, reach: true, popular: true,
    features: ["3 brands", "Everything in Studio", "Reels room: 3 concepts per direction, pre-score, post-mortems", "Reach: connect Instagram, Why? on every post", "Page diagnosis"] },
  { id: "house", name: "House", price: 149, tagline: "For studios and agencies running several labels.", brands: Infinity, reels: true, reach: true,
    features: ["Unlimited brands", "Everything in Atelier", "One login for the whole team", "Priority support on WhatsApp"] },
];
export const planOf = (tier?: string | null) => PLANS.find((p) => p.id === tier) || PLANS[1];
export const DEFAULT_TIER: Tier = "atelier";

/** Stripe price id for a tier, from env STRIPE_PRICE_STUDIO / STRIPE_PRICE_ATELIER / STRIPE_PRICE_HOUSE. */
export const priceIdOf = (tier: Tier) => process.env[`STRIPE_PRICE_${tier.toUpperCase()}`] || "";
export function tierOfPrice(priceId: string | undefined): Tier | null {
  if (!priceId) return null;
  for (const p of PLANS) if (priceIdOf(p.id) === priceId) return p.id;
  return null;
}
