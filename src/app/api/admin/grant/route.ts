import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";

/** Grant N days of access (added to any time left), or revoke. Admins only. */
export const POST = handler(async (req: Request) => {
  await requireAdmin();
  const b = z.object({ userId: z.string().uuid(), days: z.number().int().min(0).max(3650).optional(), revoke: z.boolean().optional(), note: z.string().max(200).optional() }).parse(await req.json());
  const sb = supabaseAdmin();
  const { data: p } = await sb.from("profiles").select("access_until").eq("id", b.userId).single();
  const patch: Record<string, unknown> = { requested_at: null };
  if (b.revoke) patch.access_until = null;
  else if (b.days) {
    const base = p?.access_until && new Date(p.access_until).getTime() > Date.now() ? new Date(p.access_until) : new Date();
    patch.access_until = new Date(base.getTime() + b.days * 86400000).toISOString();
  }
  if (b.note !== undefined) patch.access_note = b.note;
  const { data } = await sb.from("profiles").update(patch).eq("id", b.userId).select("id,access_until,access_note").single();
  return json(data);
});
