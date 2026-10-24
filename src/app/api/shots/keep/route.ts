import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand, supabaseAdmin } from "@/lib/supabase/server";
import { signedUrl } from "@/lib/media";

/** Save a generated image to the moodboard as a style reference (copy, tagged "result"). */
export const POST = handler(async (req: Request) => {
  const b = z.object({ brandId: z.string().uuid(), shotId: z.string().uuid(), index: z.number().int().min(0).default(0), note: z.string().max(200).optional() }).parse(await req.json());
  const { sb, user, brand } = await requireBrand(b.brandId);
  const { data: src } = await sb.from("shots").select("results,title,note").eq("id", b.shotId).eq("brand_id", brand.id).single();
  const r = (src?.results || [])[b.index] as { path?: string } | undefined;
  if (!r?.path) return fail("That result has no stored file.");
  const ext = r.path.split(".").pop() || "png";
  const dest = `${user.id}/mood/${brand.id}/kept-${Date.now()}.${ext}`;
  const cp = await supabaseAdmin().storage.from("media").copy(r.path, dest);
  if (cp.error) return fail("storage: " + cp.error.message, 500);
  const { data, error } = await sb.from("mood").insert({ brand_id: brand.id, kind: "image", path: dest, note: b.note || "Generated look", garment: false, tags: ["result"] }).select("*").single();
  if (error) return fail(error.message, 500);
  return json({ ...data, url: await signedUrl(dest) });
});
