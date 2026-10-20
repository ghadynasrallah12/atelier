import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { syncBrand } from "@/lib/igsync";

/** Pulls the latest posts and insights for a connected brand. */
export const POST = handler(async (req: Request) => {
  const { brandId } = z.object({ brandId: z.string().uuid() }).parse(await req.json());
  await requireBrand(brandId);
  const r = await syncBrand(brandId);
  return json(r);
});
