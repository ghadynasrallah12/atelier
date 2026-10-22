import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** A locked user asks for access to a given offer. The admin sees the request on /admin and grants it. */
export const POST = handler(async (req: Request) => {
  const { tier } = z.object({ tier: z.enum(["studio", "atelier", "house"]).default("atelier") }).parse(await req.json().catch(() => ({})));
  const { user } = await requireProfile();
  await supabaseAdmin().from("profiles").upsert({ id: user.id, email: user.email || null, requested_at: new Date().toISOString(), requested_tier: tier }, { onConflict: "id" });
  return json({ ok: true });
});
