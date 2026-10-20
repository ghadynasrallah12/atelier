import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { askJSON } from "@/lib/claude";
import { brandContext, learnings } from "@/lib/context";

/**
 * Pre-post score. This is Claude judging the hook, first frame and script against what has
 * worked on the page. Say so in the UI: it is a creative review, not Higgsfield's predictor.
 */
export const POST = handler(async (req: Request) => {
  const { brandId, reelId } = z.object({ brandId: z.string().uuid(), reelId: z.string().uuid() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const { data: r } = await sb.from("reels").select("*").eq("id", reelId).single();
  if (!r) return fail("Reel not found.", 404);
  const { data: reels } = await sb.from("reels").select("title,hook,live,postmortem").eq("brand_id", brandId);
  const prompt = `Score this Instagram Reel concept before it is posted. Be a tough, specific judge of the first 1.5 seconds, the reason to keep watching, and the reason to share or save.

${await brandContext(sb, brand)}

WHAT HAS WORKED ON THIS PAGE:
${learnings(reels || [])}

REEL
Title: ${r.title} | Format: ${r.format} | ${r.duration}s
Hook: ${r.hook} | Text card: ${r.text_card || ""}
Beats: ${(r.beats || []).map((b: { t: string; shot: string; camera?: string; text?: string }) => `${b.t} ${b.shot}${b.camera ? " [" + b.camera + "]" : ""}${b.text ? " [" + b.text + "]" : ""}`).join(" | ")}
Caption: ${r.caption}
Audio: ${r.audio}

Return JSON: {"score": 0-100 overall, "hook": 0-100 hook strength, "retention": "low"|"medium"|"high" retention risk, "verdict": 3-6 words, "notes": 2 sentences on the single biggest risk, "fixes": [2-4 concrete edits, each one line]}`;
  const p = await askJSON<{ score: number; hook: number; retention: string; verdict: string; notes: string; fixes: string[] }>(prompt);
  const prediction = { score: Math.round(Number(p.score) || 0), hook: Math.round(Number(p.hook) || 0), retention: String(p.retention || ""), verdict: String(p.verdict || ""), notes: String(p.notes || ""), fixes: (p.fixes || []).map(String), by: "claude", at: Date.now() };
  await sb.from("reels").update({ prediction, status: r.status === "generated" ? "scored" : r.status }).eq("id", reelId);
  return json({ prediction });
});
