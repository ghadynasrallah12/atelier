import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import { parseKey, testKey } from "@/lib/higgsfield";

/** Save (and verify) the user's Higgsfield API key. The key is only ever used server-side. */
export const POST = handler(async (req: Request) => {
  const { user } = await requireUser();
  const { key } = z.object({ key: z.string().min(8) }).parse(await req.json());
  const parsed = parseKey(key);
  if (!parsed) return fail("Paste the key as KEY_ID:KEY_SECRET, exactly as the Higgsfield console shows it.");
  try { await testKey(parsed); } catch (e) { return fail("Higgsfield rejected this key: " + (e as Error).message.slice(0, 160)); }
  const hint = `${parsed.id.slice(0, 4)}…${parsed.secret.slice(-4)}`;
  const { error } = await supabaseAdmin().from("profiles").upsert({ id: user.id, email: user.email || null, hf_key_enc: encrypt(key.trim()), hf_key_hint: hint }, { onConflict: "id" });
  if (error) return fail("Could not save the key: " + error.message, 500);
  return json({ ok: true, hint });
});

export const DELETE = handler(async () => {
  const { user } = await requireUser();
  await supabaseAdmin().from("profiles").update({ hf_key_enc: null, hf_key_hint: null }).eq("id", user.id);
  return json({ ok: true });
});
