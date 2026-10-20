import { requireBrand } from "@/lib/supabase/server";
import { RoomNav } from "@/components/RoomNav";

export default async function BrandLayout({ children, params }: { children: React.ReactNode; params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { brand } = await requireBrand(brandId);
  return (
    <div className="grid gap-6">
      <div className="md:hidden"><RoomNav brandId={brandId} /></div>
      <div className="flex items-baseline gap-3"><span className="lbl">Studio</span><span className="text-sm font-medium">{brand.name}</span></div>
      {children}
    </div>
  );
}
