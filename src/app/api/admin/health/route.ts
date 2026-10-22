import { handler, json } from "@/lib/api";
import { requireAdmin, supabaseAdmin } from "@/lib/supabase/server";

/** Admin-only diagnostics: is the service-role key valid, does my profile row exist, which env is set. */
export const GET = handler(async () => {
  const { user } = await requireAdmin();
  const out: Record<string, unknown> = { user: user.id, email: user.email };
  const sr = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const role = (jwt: string) => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString()).role; } catch { return "not a JWT"; } };
  const ref = (jwt: string) => { try { return JSON.parse(Buffer.from(jwt.split(".")[1], "base64").toString()).ref; } catch { return "?"; } };
  out.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  out.anonKey = { set: !!anon, role: role(anon), project: ref(anon) };
  out.serviceRoleKey = { set: !!sr, role: role(sr), project: ref(sr), length: sr.length };
  const sb = supabaseAdmin();
  const probe = await sb.from("profiles").select("id,email,hf_key_hint,gg_key_hint,tier,access_until", { count: "exact" }).eq("id", user.id);
  out.serviceRoleWrite = probe.error ? "ERROR: " + probe.error.message : "ok";
  out.myProfileRow = probe.data?.[0] || null;
  const cols = await sb.from("profiles").select("gg_key_enc").limit(1);
  out.migration0004 = cols.error ? "missing (" + cols.error.message + ")" : "applied";
  const ig = await sb.from("ig_accounts").select("id").limit(1);
  out.migration0002 = ig.error ? "missing (" + ig.error.message + ")" : "applied";
  out.env = { ADMIN_EMAILS: !!process.env.ADMIN_EMAILS, APP_SECRET: (process.env.APP_SECRET || "").length >= 16, ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY, INSTAGRAM: !!process.env.INSTAGRAM_APP_ID, STRIPE: !!process.env.STRIPE_SECRET_KEY };
  return json(out);
});
