import { requireBrand } from "@/lib/supabase/server";
import { loadMood, loadShots } from "@/lib/load";
import { Library } from "@/components/Library";

export default async function LibraryPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb } = await requireBrand(brandId);
  const [mood, shots] = await Promise.all([loadMood(sb, brandId), loadShots(sb, brandId)]);
  const examples: Record<string, { url: string; alt: string }[]> = {};
  for (const m of mood) if (m.url && m.kind === "image") for (const t of m.tags || []) (examples[t] ||= []).push({ url: m.url, alt: m.note });
  for (const s of shots) if (s.example_for && s.status === "done") for (const r of s.results) if (r.url) (examples[s.example_for] ||= []).push({ url: r.url, alt: "Generated example" });
  return <Library brandId={brandId} examples={examples} />;
}
