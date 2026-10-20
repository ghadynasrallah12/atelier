import { requireBrand } from "@/lib/supabase/server";
import { Reach } from "@/components/Reach";

export default async function ReachPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: snaps }, { data: reels }] = await Promise.all([sb.from("snapshots").select("*").eq("brand_id", brandId).order("date"), sb.from("reels").select("id,title,prediction,live").eq("brand_id", brandId)]);
  return <Reach brandId={brandId} snaps={snaps || []} reels={reels || []} diagnosis={brand.bible?.diagnosis || null} />;
}
