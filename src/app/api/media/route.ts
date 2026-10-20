import { handler, json, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { putMedia, removeMedia, signedUrl } from "@/lib/media";

const MAX = 20 * 1024 * 1024;

/** multipart: brandId, file, note?, garment? (top|bottom), tags? (csv) → inserts a mood row. */
export const POST = handler(async (req: Request) => {
  const form = await req.formData();
  const brandId = String(form.get("brandId") || "");
  const file = form.get("file");
  if (!brandId || !(file instanceof File)) return fail("brandId and file are required.");
  if (file.size > MAX) return fail("Images must be under 20 MB.");
  if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.type)) return fail("Use a JPEG, PNG, WebP or GIF.");
  const { sb, user } = await requireBrand(brandId);
  const path = await putMedia(user.id, `mood/${brandId}`, file.name, await file.arrayBuffer(), file.type);
  const garment = String(form.get("garment") || "");
  const row = {
    brand_id: brandId, kind: "image", path, note: String(form.get("note") || ""),
    garment: !!garment, garment_slot: garment || null,
    tags: String(form.get("tags") || "").split(",").map((s) => s.trim()).filter(Boolean),
  };
  const { data, error } = await sb.from("mood").insert(row).select("*").single();
  if (error) return fail(error.message, 500);
  return json({ ...data, url: await signedUrl(path) });
});

export const DELETE = handler(async (req: Request) => {
  const { id, brandId } = await req.json();
  const { sb } = await requireBrand(brandId);
  const { data } = await sb.from("mood").select("path").eq("id", id).single();
  await sb.from("mood").delete().eq("id", id);
  if (data?.path) await removeMedia([data.path]);
  return json({ ok: true });
});
