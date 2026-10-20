import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { ask } from "@/lib/claude";
import { brandContext, learnings } from "@/lib/context";

export const POST = handler(async (req: Request) => {
  const { brandId } = z.object({ brandId: z.string().uuid() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: snaps }, { data: reels }] = await Promise.all([
    sb.from("snapshots").select("*").eq("brand_id", brandId).order("date"),
    sb.from("reels").select("title,hook,status,live,postmortem").eq("brand_id", brandId),
  ]);
  const prompt = `You are a growth strategist for a small brand's Instagram. Diagnose the page from the data below in plain language, under 250 words. Structure: what is pulling reach, what is holding it back, the 3 reels to make next (one line each, each with its hook and camera line), and one posting habit to change. Use the numbers. Plain text with short labels.

${await brandContext(sb, brand)}

SNAPSHOTS: ${JSON.stringify((snaps || []).map((s) => ({ date: s.date, followers: s.followers, reach30: s.reach, engaged30: s.engaged, profileVisits: s.profile_visits, linkTaps: s.link_taps })))}
REELS WITH RESULTS:
${learnings(reels || [], snaps?.at(-1)?.followers)}
REELS NOT YET POSTED: ${(reels || []).filter((r) => !r.live).map((r) => r.title + " (" + r.status + ")").join(", ") || "none"}`;
  const text = await ask(prompt, { maxTokens: 1200 });
  const bible = { ...(brand.bible || {}), diagnosis: { text, at: Date.now() } };
  await sb.from("brands").update({ bible }).eq("id", brandId);
  return json({ text });
});
