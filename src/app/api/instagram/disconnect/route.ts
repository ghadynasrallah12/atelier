import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";

/** Removes the account and its synced posts. */
export const POST = handler(async (req: Request) => {
  const { brandId } = z.object({ brandId: z.string().uuid() }).parse(await req.json());
  const { sb } = await requireBrand(brandId);
  await sb.from("ig_posts").delete().eq("brand_id", brandId);
  await sb.from("ig_accounts").delete().eq("brand_id", brandId);
  return json({ ok: true });
});
