import { z } from "zod";
import { handler, json } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { ask } from "@/lib/claude";
import { brandContext, learnings } from "@/lib/context";

export const POST = handler(async (req: Request) => {
  const { brandId } = z.object({ brandId: z.string().uuid() }).parse(await req.json());
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: snaps }, { data: reels }, { data: posts }, { data: acc }] = await Promise.all([
    sb.from("snapshots").select("*").eq("brand_id", brandId).order("date"),
    sb.from("reels").select("title,hook,status,live,postmortem").eq("brand_id", brandId),
    sb.from("ig_posts").select("product,type,caption,posted_at,reach,views,saves,shares,likes,comments,follows").eq("brand_id", brandId).order("posted_at", { ascending: false }).limit(40),
    sb.from("ig_accounts").select("username,followers").eq("brand_id", brandId).maybeSingle(),
  ]);
  const ig = (posts || []).map((p) => ({ when: p.posted_at?.slice(0, 10), fmt: p.product === "REELS" ? "reel" : p.type === "CAROUSEL_ALBUM" ? "carousel" : "image", hook: (p.caption || "").split("\n")[0].slice(0, 80), reach: p.reach, views: p.views, saves: p.saves, shares: p.shares, likes: p.likes, comments: p.comments, follows: p.follows }));
  const prompt = `You are a growth strategist for a small brand's Instagram. Diagnose the page from the data below in plain language, under 300 words. Structure: what is pulling reach (name the posts), what is holding it back (format mix, hooks, posting rhythm, save/share rates), the 3 reels to make next (one line each, each with its hook and camera line), and one posting habit to change. Use the numbers. Plain text with short labels.

${await brandContext(sb, brand)}

SNAPSHOTS: ${JSON.stringify((snaps || []).map((s) => ({ date: s.date, followers: s.followers, reach30: s.reach, engaged30: s.engaged, profileVisits: s.profile_visits, linkTaps: s.link_taps })))}
REELS WITH RESULTS:
${learnings(reels || [], snaps?.at(-1)?.followers)}
INSTAGRAM (synced from the connected account${acc ? " @" + acc.username + ", " + acc.followers + " followers" : ""}), newest first: ${ig.length ? JSON.stringify(ig) : "not connected"}
REELS NOT YET POSTED: ${(reels || []).filter((r) => !r.live).map((r) => r.title + " (" + r.status + ")").join(", ") || "none"}`;
  const text = await ask(prompt, { maxTokens: 1200 });
  const bible = { ...(brand.bible || {}), diagnosis: { text, at: Date.now() } };
  await sb.from("brands").update({ bible }).eq("id", brandId);
  return json({ text });
});
