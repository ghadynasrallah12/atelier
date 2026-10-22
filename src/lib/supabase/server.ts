import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { entitled, isAdmin, type Profile } from "@/lib/billing";
import { planOf, PLANS } from "@/lib/plans";

/** Per-request client that carries the signed-in user's session (RLS applies). */
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* called from a Server Component; proxy.ts refreshes the session instead */
        }
      },
    },
  });
}

/** Service-role client. Bypasses RLS: use only after you have checked ownership yourself. */
export function supabaseAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Deduplicated per request: layout and page share one auth round trip. */
export const requireUser = cache(async () => {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("unauthenticated");
  return { sb, user: data.user };
});

export type ProfileRow = Profile & { id: string; email: string | null; hf_key_hint: string | null; gg_key_hint?: string | null; stripe_customer_id: string | null; tier: string | null };

/** The signed-in user's profile plus the access verdict. Deduplicated per request. */
export const requireProfile = cache(async () => {
  const { sb, user } = await requireUser();
  const admin$ = supabaseAdmin();
  let { data, error } = await admin$.from("profiles").select("id,email,plan,tier,requested_tier,trial_ends_at,access_until,requested_at,hf_key_hint,gg_key_hint,stripe_customer_id").eq("id", user.id).maybeSingle();
  if (error) console.error("profiles read failed (service role key?):", error.message);
  if (!data) {
    // Accounts created before the sign-up trigger existed have no row: create it now so saves have somewhere to land.
    const ins = await admin$.from("profiles").upsert({ id: user.id, email: user.email || null }, { onConflict: "id" }).select("id,email,plan,tier,requested_tier,trial_ends_at,access_until,requested_at,hf_key_hint,gg_key_hint,stripe_customer_id").single();
    data = ins.data;
  }
  const profile: ProfileRow = data || { id: user.id, email: user.email || null, plan: "trial", tier: "atelier", requested_tier: null, trial_ends_at: new Date(0).toISOString(), access_until: null, requested_at: null, hf_key_hint: null, gg_key_hint: null, stripe_customer_id: null };
  if (!profile.email) profile.email = user.email || null;
  const access = entitled(profile);
  const admin = isAdmin(profile.email);
  const plan = admin ? PLANS[2] : planOf(profile.tier);
  return { sb, user, profile, access, admin, plan };
});

/** Like requireProfile but throws "locked" when the account has no access. Use for anything paid. */
export const requireAccess = cache(async () => {
  const r = await requireProfile();
  if (!r.access.ok) throw new Error("locked");
  return r;
});

/** Loads a brand the current user owns, or throws. Requires access. Deduplicated per request. */
export const requireBrand = cache(async (brandId: string) => {
  const { sb, user } = await requireAccess();
  const { data: brand } = await sb.from("brands").select("*").eq("id", brandId).single();
  if (!brand) throw new Error("not found");
  return { sb, user, brand };
});

/** Throws unless the signed-in user is an admin. */
export const requireAdmin = cache(async () => {
  const r = await requireProfile();
  if (!r.admin) throw new Error("forbidden");
  return r;
});
