import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { NewBrand } from "@/components/NewBrand";

const COVER = ["pose.pockets", "aes.cinematic", "lsrc.neon", "shots.ews", "ldir.side", "pose.floor"];

export default async function Brands() {
  const { sb } = await requireUser();
  const { data: brands } = await sb.from("brands").select("id,name,website,created_at").order("created_at", { ascending: false });
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>Brands</h2><span className="lbl">{brands?.length || 0} in the house</span></div>
        <p className="intro">Each brand is its own studio: bible, moodboard, models, shots, reels and reach. Add one from its website and Atelier writes the bible for you.</p></div>
      <div className="grid md:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {(brands || []).map((b, i) => (
            <Link key={b.id} href={`/b/${b.id}/house`} className="card group grid">
              <div className="aspect-[4/3] bg-sunk overflow-hidden"><img src={`/library/${COVER[i % COVER.length]}.webp`} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" /></div>
              <div className="p-4 grid gap-1"><div className="text-lg font-semibold">{b.name}</div><div className="lbl truncate">{b.website?.replace(/^https?:\/\//, "") || "no website"}</div></div>
            </Link>
          ))}
          {!brands?.length && <div className="empty col-span-full">No brands yet. Add your first one on the right.</div>}
        </div>
        <NewBrand />
      </div>
    </div>
  );
}
