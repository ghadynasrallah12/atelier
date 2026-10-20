"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOut } from "./SignOut";

const ROOMS = [["house", "The House", "01"], ["library", "Library", "02"], ["models", "Models", "03"], ["shoot", "Shoot", "04"], ["hooks", "Hooks", "05"], ["reels", "Reels", "06"], ["reach", "Reach", "07"]];
type Brand = { id: string; name: string };

export function Sidebar({ brands, email, admin, locked, keyMissing, accessLabel }: { brands: Brand[]; email: string; admin: boolean; locked: boolean; keyMissing: boolean; accessLabel: string | null }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const cur = brands.find((b) => path.startsWith(`/b/${b.id}`)) || null;
  const nav = (
    <div className="side grid gap-6 content-start h-full">
      <Link href="/brands" className="font-bold tracking-[.3em] text-[15px] px-3">ATELIER</Link>
      <div className="grid gap-1">
        <span className="lbl px-3 mb-1">Brand</span>
        {brands.map((b) => <Link key={b.id} href={`/b/${b.id}/house`} className={"nav " + (cur?.id === b.id ? "on" : "")} onClick={() => setOpen(false)}><span className="k">●</span>{b.name}</Link>)}
        <Link href="/brands" className={"nav " + (path === "/brands" ? "on" : "")} onClick={() => setOpen(false)}><span className="k">+</span>{brands.length ? "All brands" : "Add a brand"}</Link>
      </div>
      {cur && !locked && (
        <div className="grid gap-1">
          <span className="lbl px-3 mb-1">{cur.name}</span>
          {ROOMS.map(([k, l, n]) => { const href = `/b/${cur.id}/${k}`; return <Link key={k} href={href} className={"nav " + (path.startsWith(href) ? "on" : "")} onClick={() => setOpen(false)}><span className="k">{n}</span>{l}</Link>; })}
        </div>
      )}
      <div className="grid gap-1 mt-auto">
        {keyMissing && !locked && <Link href="/settings" className="nav" style={{ color: "var(--warn)" }}><span className="k">!</span>Add Higgsfield key</Link>}
        {locked && <Link href="/settings" className="nav" style={{ color: "var(--warn)" }}><span className="k">🔒</span>Get access</Link>}
        {accessLabel && !locked && <span className="lbl px-3">{accessLabel}</span>}
        <Link href="/settings" className={"nav " + (path === "/settings" ? "on" : "")} onClick={() => setOpen(false)}><span className="k">⚙</span>Settings</Link>
        {admin && <Link href="/admin" className={"nav " + (path === "/admin" ? "on" : "")} onClick={() => setOpen(false)}><span className="k">★</span>Admin</Link>}
        <div className="px-3 pt-2 grid gap-1 border-t border-line mt-2"><span className="text-xs text-muted truncate" title={email}>{email}</span><SignOut /></div>
      </div>
    </div>
  );
  return (
    <>
      <aside className="hidden md:block fixed inset-y-0 left-0 w-[232px] border-r border-line bg-bg p-4 overflow-y-auto">{nav}</aside>
      <div className="md:hidden sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between">
        <Link href="/brands" className="font-bold tracking-[.3em]">ATELIER</Link>
        <div className="flex items-center gap-3">{cur && <span className="lbl">{cur.name}</span>}<button className="btn ghost sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close" : "Menu"}</button></div>
      </div>
      {open && <div className="md:hidden fixed inset-0 top-[53px] z-10 bg-bg p-4 overflow-y-auto">{nav}</div>}
    </>
  );
}
