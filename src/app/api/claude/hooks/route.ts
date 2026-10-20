import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { askJSON, SYSTEM_DIRECTOR } from "@/lib/claude";
import { brandContext } from "@/lib/context";

export const POST = handler(async (req: Request) => {
  const { brandId } = z.object({ brandId: z.string().uuid() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const { data: existing } = await sb.from("hooks").select("spoken").eq("brand_id", brandId);
  const prompt = `Write 5 new Instagram Reel hooks for this brand using Context Lean → Scroll Stop → Contrarian Snapback. Stay in the brand voice.

${await brandContext(sb, brand)}

EXISTING HOOKS (don't repeat): ${(existing || []).map((h) => h.spoken).join(" / ") || "none"}

Return a JSON array of 5 objects {"spoken": max 14 words, "visual": one line, "text": 1-3 words in caps, "pillar": a pillar name from the bible}`;
  const arr = await askJSON<{ spoken: string; visual: string; text: string; pillar: string }[]>(prompt, { system: SYSTEM_DIRECTOR });
  const rows = (Array.isArray(arr) ? arr : []).slice(0, 5).map((h) => ({ brand_id: brandId, spoken: String(h.spoken || ""), visual: String(h.visual || ""), text: String(h.text || "").toUpperCase(), pillar: String(h.pillar || "") })).filter((h) => h.spoken);
  const { data } = await sb.from("hooks").insert(rows).select("*");
  return json({ hooks: data || [] });
});
