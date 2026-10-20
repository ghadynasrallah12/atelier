import { requireBrand } from "@/lib/supabase/server";
import { loadMood, loadShots } from "@/lib/load";
import { Shoot } from "@/components/Shoot";

export default async function ShootPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb, brand } = await requireBrand(brandId);
  const [mood, shots, { data: models }] = await Promise.all([loadMood(sb, brandId), loadShots(sb, brandId), sb.from("models").select("id,name,look,dna,ref_mood_id").eq("brand_id", brandId).order("created_at")]);
  return <Shoot brand={{ id: brand.id, name: brand.name, line: brand.bible?.line || "" }} mood={mood} shots={shots} models={models || []} />;
}
