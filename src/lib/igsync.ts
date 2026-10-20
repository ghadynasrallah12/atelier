import { supabaseAdmin } from "@/lib/supabase/server";
import { decrypt, encrypt } from "@/lib/crypto";
import { insights, me, media, reach28, refreshToken } from "@/lib/instagram";

export type IgPostRow = { id: string; brand_id: string; type: string | null; product: string | null; caption: string; media_url: string | null; thumb: string | null; permalink: string | null; posted_at: string | null; likes: number | null; comments: number | null; reach: number | null; views: number | null; saves: number | null; shares: number | null; follows: number | null; profile_visits: number | null; interactions: number | null; avg_watch: number | null; insights: Record<string, number>; diagnosis: { verdict: string; reasons: string[]; fix: string; score: number; at: number } | null; synced_at: string };

/** Pulls profile, the last 60 posts and their insights into ig_posts; logs today's snapshot. Service role: caller has checked ownership. */
export async function syncBrand(brandId: string) {
  const sb = supabaseAdmin();
  const { data: acc } = await sb.from("ig_accounts").select("*").eq("brand_id", brandId).single();
  if (!acc) throw new Error("No Instagram account connected.");
  let token = decrypt(acc.token_enc);
  // Refresh when the token is older than a day and within 10 days of expiring.
  if (acc.token_expires_at && new Date(acc.token_expires_at).getTime() - Date.now() < 10 * 86400000) {
    try { const r = await refreshToken(token); token = r.token; await sb.from("ig_accounts").update({ token_enc: encrypt(token), token_expires_at: r.expiresAt }).eq("id", acc.id); } catch { /* keep the old token until it dies */ }
  }
  const who = await me(token);
  const list = await media(token, 60);
  const rows = [];
  for (const m of list) {
    const ins = await insights(token, m);
    rows.push({
      id: m.id, brand_id: brandId, type: m.media_type, product: m.media_product_type || "FEED", caption: m.caption || "",
      media_url: m.media_url || null, thumb: m.thumbnail_url || m.media_url || null, permalink: m.permalink || null, posted_at: m.timestamp || null,
      likes: ins.likes ?? m.like_count ?? null, comments: ins.comments ?? m.comments_count ?? null, reach: ins.reach ?? null, views: ins.views ?? null,
      saves: ins.saved ?? null, shares: ins.shares ?? null, follows: ins.follows ?? null, profile_visits: ins.profile_visits ?? null, interactions: ins.total_interactions ?? null,
      avg_watch: ins.ig_reels_avg_watch_time != null ? ins.ig_reels_avg_watch_time / 1000 : null, insights: ins, synced_at: new Date().toISOString(),
    });
  }
  if (rows.length) await sb.from("ig_posts").upsert(rows, { onConflict: "id" });
  const r28 = await reach28(token);
  await sb.from("ig_accounts").update({ username: who.username, followers: who.followers_count ?? acc.followers, media_count: who.media_count ?? acc.media_count, picture: who.profile_picture_url ?? acc.picture, synced_at: new Date().toISOString() }).eq("id", acc.id);
  if (who.followers_count != null) await sb.from("snapshots").upsert({ brand_id: brandId, date: new Date().toISOString().slice(0, 10), followers: who.followers_count, reach: r28 }, { onConflict: "brand_id,date" });
  return { posts: rows.length, followers: who.followers_count ?? null, username: who.username };
}

/** Medians and ratios the diagnosis compares against. */
export function benchmarks(posts: IgPostRow[], followers: number | null) {
  const med = (a: (number | null)[]) => { const x = a.filter((v): v is number => v != null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
  const reach = med(posts.map((p) => p.reach));
  const reels = posts.filter((p) => p.product === "REELS"), feed = posts.filter((p) => p.product !== "REELS");
  return {
    posts: posts.length, followers,
    medianReach: reach, medianReachReels: med(reels.map((p) => p.reach)), medianReachFeed: med(feed.map((p) => p.reach)),
    medianViews: med(reels.map((p) => p.views)),
    medianSaveRate: med(posts.map((p) => (p.reach && p.saves != null ? p.saves / p.reach : null))),
    medianShareRate: med(posts.map((p) => (p.reach && p.shares != null ? p.shares / p.reach : null))),
    reachToFollowers: reach && followers ? reach / followers : null,
    top: posts.slice().sort((a, b) => (b.reach || 0) - (a.reach || 0)).slice(0, 3),
  };
}
