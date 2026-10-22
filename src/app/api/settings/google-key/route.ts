import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { testGoogleKey } from "@/lib/google";

/** Save (and verify) the user's Google AI key for the Nano Banana engines. Server-side only. */
export const POST = handler(async (req: Request) => {
  const { user } = await requireUser();
  const { key } = z.object({ key: z.string().min(20) }).parse(await req.json());
  const k = key.trim();
  try { await testGoogleKey(k); } catch (e) { return fail("Google rejected this key: " + (e as Error).message.slice(0, 160)); }
  const hint = `${k.slice(0, 6)}…${k.slice(-4)}`;
  const { error } = await supabaseAdmin().from("profiles").upsert({ id: user.id, email: user.email || null, gg_key_enc: encrypt(k), gg_key_hint: hint }, { onConflict: "id" });
  if (error) return fail("Could not save the key: " + error.message, 500);
  return json({ ok: true, hint });
});

export const DELETE = handler(async () => {
  const { user } = await requireUser();
  await supabaseAdmin().from("profiles").update({ gg_key_enc: null, gg_key_hint: null }).eq("id", user.id);
  return json({ ok: true });
});
