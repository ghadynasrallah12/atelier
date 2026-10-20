import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { askJSON } from "@/lib/claude";
import { brandContext } from "@/lib/context";
import { benchmarks, type IgPostRow } from "@/lib/igsync";

const desc = (p: IgPostRow) => ({
  id: p.id, type: p.product === "REELS" ? "Reel" : p.type === "CAROUSEL_ALBUM" ? "Carousel" : "Image", posted: p.posted_at, hour: p.posted_at ? new Date(p.posted_at).getUTCHours() + "h UTC" : null,
  caption: (p.caption || "").slice(0, 400), reach: p.reach, views: p.views, likes: p.likes, comments: p.comments, saves: p.saves, shares: p.shares, follows: p.follows, profileVisits: p.profile_visits,
  avgWatchSec: p.avg_watch, saveRate: p.reach && p.saves != null ? +(p.saves / p.reach).toFixed(4) : null, shareRate: p.reach && p.shares != null ? +(p.shares / p.reach).toFixed(4) : null,
});

/** Why did this post reach (or not)? Claude compares it with the account's own medians and best posts. */
export const POST = handler(async (req: Request) => {
  const { brandId, postId } = z.object({ brandId: z.string().uuid(), postId: z.string() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: post }, { data: posts }, { data: acc }] = await Promise.all([
    sb.from("ig_posts").select("*").eq("id", postId).eq("brand_id", brandId).single(),
    sb.from("ig_posts").select("*").eq("brand_id", brandId).order("posted_at", { ascending: false }).limit(60),
    sb.from("ig_accounts").select("followers,username").eq("brand_id", brandId).single(),
  ]);
  if (!post) return fail("Post not found.", 404);
  const all = (posts || []) as IgPostRow[];
  const b = benchmarks(all, acc?.followers ?? null);
  const prompt = `You are a blunt Instagram growth analyst for a fashion brand. Explain, in plain language a founder understands, why THIS post reached what it reached. Compare it only with the account's own numbers below, not industry averages. Reach on Instagram is driven mostly by: shares and saves (distribution to non-followers), watch time / retention for reels, the first line of the caption and the first frame (the hook), the format (reels travel, carousels save, single images rarely leave followers), and consistency of posting. Be specific: quote the caption's first line, name the format, use the numbers.

${await brandContext(sb, brand)}

ACCOUNT: @${acc?.username || "?"} · ${b.followers ?? "?"} followers · ${b.posts} posts synced
MEDIANS: reach ${b.medianReach ?? "?"} (reels ${b.medianReachReels ?? "?"}, feed ${b.medianReachFeed ?? "?"}) · reach/followers ${b.reachToFollowers?.toFixed(2) ?? "?"} · save rate ${b.medianSaveRate != null ? (b.medianSaveRate * 100).toFixed(2) + "%" : "?"} · share rate ${b.medianShareRate != null ? (b.medianShareRate * 100).toFixed(2) + "%" : "?"}
TOP 3 POSTS BY REACH: ${JSON.stringify(b.top.map(desc))}
THIS POST: ${JSON.stringify(desc(post as IgPostRow))}

Return JSON: {"verdict": one sentence, starts with "Under-reached", "On par" or "Over-reached" and the multiple vs the median (e.g. "0.4× the account median"), "reasons": [3 short sentences, each one concrete cause tied to a number or the caption/format], "fix": one paragraph (max 60 words): exactly what to do differently next time with this product, including a hook line to try, "score": integer 0-100 where 50 = the account's median reach}`;
  const out = await askJSON<{ verdict: string; reasons: string[]; fix: string; score: number }>(prompt, { maxTokens: 900 });
  const diagnosis = { ...out, at: Date.now() };
  await sb.from("ig_posts").update({ diagnosis }).eq("id", postId);
  return json(diagnosis);
});
