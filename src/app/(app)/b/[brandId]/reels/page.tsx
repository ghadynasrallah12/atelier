import { requireBrand } from "@/lib/supabase/server";
import { loadMood, loadShots } from "@/lib/load";
import { Reels } from "@/components/Reels";

export default async function ReelsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb } = await requireBrand(brandId);
  const [{ data: briefs }, { data: reels }, { data: hooks }, { data: quotes }, { data: models }, { data: snaps }, mood, shots] = await Promise.all([
    sb.from("briefs").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }),
    sb.from("reels").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }),
    sb.from("hooks").select("id,spoken,text").eq("brand_id", brandId),
    sb.from("quotes").select("id,text").eq("brand_id", brandId),
    sb.from("models").select("id,name,ref_mood_id").eq("brand_id", brandId),
    sb.from("snapshots").select("followers,date").eq("brand_id", brandId).order("date", { ascending: false }).limit(1),
    loadMood(sb, brandId), loadShots(sb, brandId),
  ]);
  const videoUrls: Record<string, string> = {};
  for (const s of shots) if (s.reel_id && s.results?.[0]?.url) videoUrls[s.reel_id] = s.results[0].url;
  return <Reels brandId={brandId} briefs={briefs || []} reels={reels || []} hooks={hooks || []} quotes={quotes || []} models={models || []} followers={snaps?.[0]?.followers || null} videoUrls={videoUrls} styleRefs={mood.filter((m) => !m.garment && m.kind === "image" && m.url).slice(0, 3).map((m) => m.id)} />;
}
