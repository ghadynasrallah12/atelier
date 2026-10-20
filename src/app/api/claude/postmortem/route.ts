import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { askJSON } from "@/lib/claude";
import { brandContext, metrics, pct } from "@/lib/context";

export const POST = handler(async (req: Request) => {
  const { brandId, reelId } = z.object({ brandId: z.string().uuid(), reelId: z.string().uuid() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const { data: r } = await sb.from("reels").select("*").eq("id", reelId).single();
  if (!r) return fail("Reel not found.", 404);
  if (!r.live?.views) return fail("Log the Instagram numbers first.");
  const { data: others } = await sb.from("reels").select("live").eq("brand_id", brandId).neq("id", reelId);
  const views = (others || []).map((x) => Number(x.live?.views || 0)).filter(Boolean).sort((a, b) => a - b);
  const median = views.length ? views[Math.floor(views.length / 2)] : null;
  const m = metrics(r);
  const prompt = `You are a short-form video strategist. Explain plainly why this Instagram Reel did or did not travel, using the numbers. Be specific.

${await brandContext(sb, brand)}

THE REEL
Title: ${r.title} | Format: ${r.format}
Hook: ${r.hook} | Text card: ${r.text_card || ""}
Beats: ${(r.beats || []).map((b: { t: string; shot: string; camera?: string; text?: string }) => `${b.t} ${b.shot}${b.camera ? " [" + b.camera + "]" : ""}${b.text ? " [" + b.text + "]" : ""}`).join(" | ")}
Caption: ${r.caption}
Audio: ${r.audio}
Pre-post prediction: ${r.prediction ? JSON.stringify(r.prediction) : "none"}

RESULTS: ${JSON.stringify(r.live)}
Derived: views/followers ${m.multiple != null ? m.multiple.toFixed(2) + "x" : "unknown"}, engagement ${pct(m.er)}, share rate ${pct(m.shareRate)}, save rate ${pct(m.saveRate)}, avg watch ${pct(m.watchPct)} of length.
Page median views for other reels: ${median ?? "no other reels yet"}.

Rules of thumb: views above 3x followers means it was pushed to non-followers; share rate above 1% and save rate above 1% are strong; watch-through below 50% on a sub-15s reel or a skip rate above 50% means the hook or the first 2 seconds lost people.

Return JSON: {"verdict": one of "Viral","Breakout","Solid","Underperformed", "summary": 2 sentences, "why": [3-5 reasons tied to numbers or creative choices], "keep": [2-3], "change": [2-3 concrete changes for the next reel]}`;
  const o = await askJSON<{ verdict: string; summary: string; why: string[]; keep: string[]; change: string[] }>(prompt);
  const postmortem = { verdict: String(o.verdict || ""), summary: String(o.summary || ""), why: (o.why || []).map(String), keep: (o.keep || []).map(String), change: (o.change || []).map(String), at: Date.now() };
  await sb.from("reels").update({ postmortem, status: "reviewed" }).eq("id", reelId);
  return json({ postmortem });
});
