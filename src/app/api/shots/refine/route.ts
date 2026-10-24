import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand, supabaseAdmin } from "@/lib/supabase/server";
import { submitShot } from "@/lib/queue";
import { isGoogleModel, GOOGLE_IMAGE_MODELS } from "@/lib/google";
import { IMAGE_MODELS } from "@/lib/higgsfield";

/**
 * Refine: take one generated image, keep everything, change one thing.
 * The result is copied into the moodboard (tag "result") and attached as image 1 with role "source";
 * the garment/model references of the original come after it so the engine can re-check the product.
 */
export const POST = handler(async (req: Request) => {
  const b = z.object({ brandId: z.string().uuid(), shotId: z.string().uuid(), index: z.number().int().min(0).default(0), instruction: z.string().min(3).max(1500), engine: z.string().default("qwen-image-3"), size: z.string().optional(), keepRefs: z.boolean().default(true), aspect: z.string().optional(), kind: z.enum(["image", "reel"]).default("image"), duration: z.number().int().min(4).max(15).optional(), move: z.string().optional() }).parse(await req.json());
  const { sb, user, brand } = await requireBrand(b.brandId);
  const { data: src } = await sb.from("shots").select("*").eq("id", b.shotId).eq("brand_id", brand.id).single();
  if (!src) return fail("Shot not found.", 404);
  const r = (src.results || [])[b.index] as { path?: string } | undefined;
  if (!r?.path) return fail("That result has no stored file.");
  const { data: prof } = await supabaseAdmin().from("profiles").select("hf_key_hint,gg_key_hint").eq("id", user.id).single();
  if (b.kind === "image" && isGoogleModel(b.engine) ? !prof?.gg_key_hint : !prof?.hf_key_hint) return fail(isGoogleModel(b.engine) ? "Add your Google AI key in Settings to refine with Nano Banana." : "Add your Higgsfield key in Settings first.", 402);
  // Source image into the board (copy, so deleting the original shot never breaks the chain).
  const ext = r.path.split(".").pop() || "png";
  const dest = `${user.id}/results/${brand.id}/src-${Date.now()}.${ext}`;
  const cp = await supabaseAdmin().storage.from("media").copy(r.path, dest);
  if (cp.error) return fail("storage: " + cp.error.message, 500);
  const { data: mood } = await sb.from("mood").insert({ brand_id: brand.id, kind: "image", path: dest, note: "Source for refine", garment: false, tags: ["result"] }).select("id").single();
  if (!mood) return fail("Could not store the source image.", 500);
  const limit = isGoogleModel(b.engine) ? GOOGLE_IMAGE_MODELS[b.engine].refs : (IMAGE_MODELS as Record<string, { refs: number }>)[b.engine]?.refs ?? 3;
  const refs = [{ moodId: mood.id, role: "source" }, ...(b.keepRefs ? (src.refs || []).filter((x: { role: string }) => x.role === "garment-top" || x.role === "garment-bottom" || x.role === "model") : [])].slice(0, Math.max(1, limit));
  const garmentNote = refs.slice(1).map((x: { role: string }, i: number) => `image ${i + 2} is the ${x.role === "model" ? "model's face" : x.role === "garment-top" ? "top" : "pants"} product reference`).join("; ");
  if (b.kind === "reel") {
    const vrefs = [{ moodId: mood.id, role: "source" }];
    const vprompt = `Animate image 1 exactly as it is: the same person, same face, same garments, same framing, same light and background. Vertical 9:16, ${b.duration || 6} seconds, ${b.move || "slow push-in toward the subject"}; the model ${b.instruction.trim() || "breathes and barely moves"}. One shot, one movement. Ambient sound only. No text.`;
    const vout = { aspect: "9:16", duration: b.duration || 6, audio: true, model: b.engine === "seedance-2.5" ? "seedance-2.5" : "kling-o3" };
    const { data: vshot, error: ve } = await sb.from("shots").insert({ brand_id: brand.id, kind: "reel", title: "Animated", spec: { ...(src.spec || {}), move: b.move || "slow push-in toward the subject", act: b.instruction.trim() || "breathes and barely moves" }, out: vout, refs: vrefs, prompt: vprompt, autos: [], status: "queued", parent_id: src.id, mode: "refine", note: "Animated from image" }).select("*").single();
    if (ve) return fail(ve.message, 500);
    return json({ shot: await submitShot(vshot.id) });
  }
  const prompt = `EDIT image 1. Keep the image exactly as it is: same person, same face, same pose, same garments, same framing, same light, same background, same colours. Change only this: ${b.instruction.trim()}.${garmentNote ? ` ${garmentNote}; use them only to check the product details, do not change the composition.` : ""} Photorealistic, same resolution and finish as image 1, no text, no watermark.`;
  const out = { aspect: b.aspect || src.out?.aspect || "4:5", count: 1, model: b.engine, ...(b.size ? { size: b.size } : {}) };
  const { data: shot, error } = await sb.from("shots").insert({ brand_id: brand.id, kind: "image", title: "Refine", spec: src.spec || {}, out, refs, prompt, autos: [], status: "queued", parent_id: src.id, mode: "refine", note: `Refine: ${b.instruction.trim().slice(0, 140)}` }).select("*").single();
  if (error) return fail(error.message, 500);
  const submitted = await submitShot(shot.id);
  return json({ shot: submitted });
});
