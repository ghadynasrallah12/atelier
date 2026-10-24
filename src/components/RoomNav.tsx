"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ROOMS = [["house", "The House"], ["library", "Library"], ["models", "Models"], ["shoot", "Shoot"], ["gallery", "Gallery"], ["hooks", "Hooks"], ["reels", "Reels"], ["reach", "Reach"]];

export function RoomNav({ brandId }: { brandId: string }) {
  const path = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ROOMS.map(([k, l]) => { const href = `/b/${brandId}/${k}`; const on = path.startsWith(href); return <Link key={k} href={href} className="lbl whitespace-nowrap px-3 py-2 border-b-2" style={{ color: on ? "var(--ink)" : undefined, borderColor: on ? "var(--ink)" : "transparent" }}>/ {l}</Link>; })}
    </nav>
  );
}
