import { handler, json } from "@/lib/api";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";
import { entitled } from "@/lib/billing";

/** Every account with its access state, newest first. Admins only. */
export const GET = handler(async () => {
  await requireAdmin();
  const sb = supabaseAdmin();
  const [{ data: profiles }, { data: brands }] = await Promise.all([
    sb.from("profiles").select("id,email,plan,tier,requested_tier,trial_ends_at,access_until,access_note,requested_at,hf_key_hint,stripe_customer_id,created_at").order("created_at", { ascending: false }),
    sb.from("brands").select("owner,name"),
  ]);
  const byOwner: Record<string, string[]> = {};
  for (const b of brands || []) (byOwner[b.owner] ||= []).push(b.name);
  return json({ users: (profiles || []).map((p) => ({ ...p, access: entitled(p), brands: byOwner[p.id] || [] })) });
});
