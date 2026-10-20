import { handler, json } from "@/lib/api";
import { requireProfile, supabaseAdmin } from "@/lib/supabase/server";

/** A locked user asks for access. The admin sees the request on /admin and grants it. */
export const POST = handler(async () => {
  const { user } = await requireProfile();
  await supabaseAdmin().from("profiles").update({ requested_at: new Date().toISOString() }).eq("id", user.id);
  return json({ ok: true });
});
