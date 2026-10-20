import { requireBrand } from "@/lib/supabase/server";
import { RoomNav } from "@/components/RoomNav";

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { brand } = await requireBrand(brandId);
  return (
    <div className="grid gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap border-b border-line pb-3">
        <div><span className="lbl">Studio</span><h1 className="text-2xl font-semibold tracking-wide">{brand.name}</h1></div>
        <RoomNav brandId={brandId} />
      </div>
      {children}
    </div>
  );
}
