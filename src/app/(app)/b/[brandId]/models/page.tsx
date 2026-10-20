import { requireBrand } from "@/lib/supabase/server";
import { loadMood } from "@/lib/load";
import { Models } from "@/components/Models";

export default async function ModelsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb } = await requireBrand(brandId);
  const [{ data: models }, mood] = await Promise.all([sb.from("models").select("*").eq("brand_id", brandId).order("created_at"), loadMood(sb, brandId)]);
  return <Models brandId={brandId} models={models || []} mood={mood} />;
}
