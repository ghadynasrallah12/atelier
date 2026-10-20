import { requireBrand, requireProfile } from "@/lib/supabase/server";
import { Upgrade } from "@/components/Upgrade";
import { Reach } from "@/components/Reach";
import { igEnabled } from "@/lib/instagram";

export default async function ReachPage({ params, searchParams }: { params: Promise<{ brandId: string }>; searchParams: Promise<{ ig?: string; m?: string }> }) {
  const { brandId } = await params;
  const { plan, profile } = await requireProfile();
  if (!plan.reach) { await requireBrand(brandId); return <Upgrade room="Reach" tier={profile.tier || "atelier"} />; }
  const q = await searchParams;
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: snaps }, { data: reels }, { data: account }, { data: posts }] = await Promise.all([
    sb.from("snapshots").select("*").eq("brand_id", brandId).order("date"),
    sb.from("reels").select("id,title,prediction,live").eq("brand_id", brandId),
    sb.from("ig_accounts").select("username,followers,media_count,picture,synced_at").eq("brand_id", brandId).maybeSingle(),
    sb.from("ig_posts").select("*").eq("brand_id", brandId).order("posted_at", { ascending: false }).limit(60),
  ]);
  const notice = q.ig === "connected" ? "Connected. Your posts and their insights are in." : q.ig === "denied" ? "Instagram access was declined." : q.ig === "error" ? `Instagram returned an error: ${q.m || "unknown"}` : undefined;
  return <Reach brandId={brandId} snaps={snaps || []} reels={reels || []} diagnosis={brand.bible?.diagnosis || null} account={account || null} posts={posts || []} igEnabled={igEnabled()} notice={notice} />;
}
