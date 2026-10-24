"use client";
import { useMemo, useState } from "react";
import type { ShotItem } from "@/lib/load";
import { Lightbox, ResultTile, type Pick } from "./Results";

export function Gallery({ brandId, shots: s0, models }: { brandId: string; shots: ShotItem[]; models: { id: string; name: string }[] }) {
  const [shots, setShots] = useState(s0); const [open, setOpen] = useState<Pick | null>(null); const [filter, setFilter] = useState<"all" | "fav" | "image" | "reel" | "refine">("all");
  const list = useMemo(() => shots.filter((s) => s.status === "done").filter((s) => filter === "all" || (filter === "fav" ? s.favorite : filter === "refine" ? s.mode === "refine" : s.kind === filter)).flatMap((s) => s.results.map((_, i) => ({ shot: s, index: i }))).filter((p) => p.shot.results[p.index]?.url), [shots, filter]);
  return (
    <div className="grid gap-6">
      <div><div className="sechead"><h2>Gallery</h2><span className="lbl">{list.length} generations</span></div>
        <p className="intro">Everything you've generated for this brand. Open one to download it, refine a detail, favorite it, save it to the moodboard or animate it.</p>
        <div className="flex gap-1 flex-wrap mt-3">{([["all", "All"], ["fav", "★ Favorites"], ["image", "Images"], ["reel", "Reels"], ["refine", "Refined"]] as const).map(([k, l]) => <button key={k} className={"btn sm " + (filter === k ? "" : "ghost")} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
      {list.length ? <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3 [&>*]:mb-3 [&>*]:break-inside-avoid">{list.map((p) => <ResultTile key={p.shot.id + p.index} shot={p.shot} index={p.index} onOpen={setOpen} />)}</div> : <div className="empty">Nothing here yet. Shoot something.</div>}
      {open && <Lightbox pick={open} list={list} onClose={() => setOpen(null)} onChange={setOpen} brandId={brandId} models={models} onShots={(fn) => setShots(fn)} />}
    </div>
  );
}
