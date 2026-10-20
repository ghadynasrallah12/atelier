import { requireBrand } from "@/lib/supabase/server";
import { Hooks } from "@/components/Hooks";

export default async function HooksPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb, brand } = await requireBrand(brandId);
  const { data: hooks } = await sb.from("hooks").select("*").eq("brand_id", brandId).order("created_at");
  const pillars = String(brand.bible?.pillars || "").split("\n").map((x: string) => x.split(/[—–-]/)[0].trim()).filter(Boolean);
  return <Hooks brandId={brandId} hooks={hooks || []} pillars={pillars.length ? pillars : ["General"]} />;
}
