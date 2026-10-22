import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

/** Makes a generated candidate the house model's reference photo: copies the file into the moodboard and links it. */
export const POST = handler(async (req: Request) => {
  const { sb, user } = await requireUser();
  const { modelId, shotId, index } = z.object({ modelId: z.string().uuid(), shotId: z.string().uuid(), index: z.number().int().min(0).default(0) }).parse(await req.json());
  const [{ data: model }, { data: shot }] = await Promise.all([sb.from("models").select("id,name,brand_id").eq("id", modelId).single(), sb.from("shots").select("results,brand_id").eq("id", shotId).single()]);
  if (!model || !shot || model.brand_id !== shot.brand_id) return fail("Not found.", 404);
  const r = (shot.results || [])[index] as { path?: string } | undefined;
  if (!r?.path) return fail("That result has no stored file.");
  const ext = r.path.split(".").pop() || "png";
  const dest = `${user.id}/models/${model.brand_id}/${Date.now()}-${modelId}.${ext}`;
  const { error } = await supabaseAdmin().storage.from("media").copy(r.path, dest);
  if (error) return fail("storage: " + error.message, 500);
  const { data: mood, error: e2 } = await sb.from("mood").insert({ brand_id: model.brand_id, kind: "image", path: dest, note: `Model reference: ${model.name}`, garment: false, tags: ["model"] }).select("*").single();
  if (e2) return fail(e2.message, 500);
  await sb.from("models").update({ ref_mood_id: mood.id }).eq("id", modelId);
  return json({ moodId: mood.id });
});
