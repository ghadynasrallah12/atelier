import { requireBrand } from "@/lib/supabase/server";
import { loadShots } from "@/lib/load";
import { Gallery } from "@/components/Gallery";

export default async function GalleryPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb } = await requireBrand(brandId);
  const [shots, { data: models }] = await Promise.all([loadShots(sb, brandId), sb.from("models").select("id,name").eq("brand_id", brandId)]);
  return <Gallery brandId={brandId} shots={shots.filter((s) => s.status === "done" && s.results?.some((r) => r.url))} models={models || []} />;
}
