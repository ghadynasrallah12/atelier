import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { askJSON, SYSTEM_DIRECTOR } from "@/lib/claude";
import { brandContext, learnings, LIBRARY_RULES } from "@/lib/context";

const Body = z.object({ brandId: z.string().uuid(), briefId: z.string().uuid() });
type Concept = { title: string; format: string; hook: string; textCard: string; beats: { t: string; shot: string; camera: string; text: string }[]; caption: string; hashtags: string[]; audio: string; cover: string; duration: number; prompt: string; why: string };

/** Brief → 3 reel concepts, saved as reels in status "idea". */
export const POST = handler(async (req: Request) => {
  const { brandId, briefId } = Body.parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const { data: brief } = await sb.from("briefs").select("*").eq("id", briefId).single();
  if (!brief) return fail("Brief not found.", 404);
  const [{ data: reels }, { data: snaps }, ctx] = await Promise.all([
    sb.from("reels").select("title,hook,live,postmortem").eq("brand_id", brandId),
    sb.from("snapshots").select("followers").eq("brand_id", brandId).order("date", { ascending: false }).limit(1),
    brandContext(sb, brand),
  ]);
  const hook = brief.hook_id ? (await sb.from("hooks").select("*").eq("id", brief.hook_id).single()).data : null;
  const quote = brief.quote_id ? (await sb.from("quotes").select("*").eq("id", brief.quote_id).single()).data : null;
  const prompt = `Write 3 distinct Reel concepts for this brand and brief. Every concept must be fully AI-generatable as video (no real people to film), vertical 9:16, 8–15 seconds, built to stop the scroll in the first 1.5 seconds and to be re-watched, shared or saved.

${ctx}

${LIBRARY_RULES}

WHAT HAS WORKED / NOT WORKED:
${learnings(reels || [], snaps?.[0]?.followers)}

BRIEF
Title: ${brief.title}
Goal: ${brief.goal}
Direction: ${brief.direction}
Product / collection: ${brief.product || "any piece that fits"}
Aesthetic: ${brief.aes || "pick from minimalist, editorial, cinematic or gritty"}
Hook to build on: ${hook ? `${hook.spoken} | ${hook.visual} | ${hook.text}` : "pick or write one"}
Quote to use: ${quote ? quote.text : "pick from the quote bank, or none"}

Make the 3 concepts genuinely different formats (cinematic mood piece, text-led story, product macro, back-print reveal, POV, before/after…). Each beat is ONE shot with ONE camera line.

Return a JSON array of 3 objects: {"title", "format", "hook": on-screen first line (max 8 words), "textCard": 1-3 words in caps, "beats": [{"t":"0-1.5s","shot","camera","text"}] (3-6), "caption": max 300 chars in the brand voice, "hashtags": [5-8 without #], "audio": sound direction naming a sound bed if one fits, "cover", "duration": number, "prompt": a detailed text-to-video prompt for the FIRST beat only in SUBJECT / CAMERA / LIGHTING / SETTING / MATERIALS / STYLE / MOOD form, 9:16, "why": one sentence}`;
  const arr = await askJSON<Concept[] | { concepts: Concept[] }>(prompt, { system: SYSTEM_DIRECTOR, maxTokens: 6000 });
  const list = Array.isArray(arr) ? arr : arr.concepts || [];
  if (!list.length) return fail("Claude returned no concepts. Try again.", 502);
  const rows = list.slice(0, 3).map((c) => ({
    brand_id: brandId, brief_id: briefId, title: String(c.title || "Untitled"), format: String(c.format || ""), hook: String(c.hook || ""), text_card: String(c.textCard || ""),
    beats: Array.isArray(c.beats) ? c.beats.slice(0, 8) : [], caption: String(c.caption || ""), hashtags: Array.isArray(c.hashtags) ? c.hashtags.map(String).slice(0, 10) : [],
    audio: String(c.audio || ""), cover: String(c.cover || ""), duration: Number(c.duration) || 10, prompt: String(c.prompt || ""), why: String(c.why || ""), status: "idea",
  }));
  const { data, error } = await sb.from("reels").insert(rows).select("*");
  if (error) return fail(error.message, 500);
  return json({ reels: data });
});
