import { requireBrand } from "@/lib/supabase/server";
import { loadMood } from "@/lib/load";
import { House } from "@/components/House";

export default async function HousePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb, brand } = await requireBrand(brandId);
  const [{ data: quotes }, mood] = await Promise.all([sb.from("quotes").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }), loadMood(sb, brandId)]);
  return <House brand={{ id: brand.id, name: brand.name, website: brand.website, bible: brand.bible || {} }} quotes={quotes || []} mood={mood} />;
}
