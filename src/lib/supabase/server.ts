import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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

export async function requireUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();
  if (!data.user) throw new Error("unauthenticated");
  return { sb, user: data.user };
}

/** Loads a brand the current user owns, or throws. */
export async function requireBrand(brandId: string) {
  const { sb, user } = await requireUser();
  const { data: brand } = await sb.from("brands").select("*").eq("id", brandId).single();
  if (!brand) throw new Error("not found");
  return { sb, user, brand };
}
