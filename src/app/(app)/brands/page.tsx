import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { NewBrand } from "@/components/NewBrand";

export default async function Brands() {
  const { sb } = await requireUser();
  const { data: brands } = await sb.from("brands").select("id,name,website,created_at").order("created_at", { ascending: false });
  return (
    <div className="grid gap-10">
      <div><div className="sechead"><h2>Brands</h2><span className="lbl">{brands?.length || 0} in the house</span></div>
        <p className="intro">Each brand is its own studio: bible, moodboard, models, shots, reels and reach. Add one from its website and Atelier writes the bible for you.</p></div>
      <div className="grid md:grid-cols-[1fr_360px] gap-8 items-start">
        <div className="grid gap-px bg-line border border-line">
          {(brands || []).map((b) => (
            <Link key={b.id} href={`/b/${b.id}/house`} className="bg-surface p-5 flex items-baseline justify-between gap-4 hover:bg-sunk">
              <div><div className="text-lg font-semibold">{b.name}</div><div className="lbl">{b.website || "no website"}</div></div><span className="lbl">Open →</span>
            </Link>
          ))}
          {!brands?.length && <div className="bg-surface p-8 text-muted">No brands yet. Add your first one on the right.</div>}
        </div>
        <NewBrand />
      </div>
    </div>
  );
}
