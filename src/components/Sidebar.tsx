"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOut } from "./SignOut";
import { I, Logo, type IconName } from "./Icons";

const ROOMS: [string, string, IconName][] = [["house", "The House", "house"], ["library", "Library", "library"], ["models", "Models", "models"], ["shoot", "Shoot", "shoot"], ["gallery", "Gallery", "gallery"], ["hooks", "Hooks", "hooks"], ["reels", "Reels", "reels"], ["reach", "Reach", "reach"]];
type Brand = { id: string; name: string };
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

export function Sidebar({ brands, email, admin, locked, keyMissing, accessLabel }: { brands: Brand[]; email: string; admin: boolean; locked: boolean; keyMissing: boolean; accessLabel: string | null }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  const cur = brands.find((b) => path.startsWith(`/b/${b.id}`)) || null;
  const Nav = ({ href, icon, label, on, tone }: { href: string; icon: IconName; label: string; on?: boolean; tone?: string }) => (
    <Link href={href} className={"nav " + (on ? "on" : "")} style={tone ? { color: tone } : undefined} onClick={() => setOpen(false)}><span className="ico">{I[icon]()}</span>{label}</Link>
  );
  const nav = (
    <div className="side grid gap-5 content-start h-full">
      <Link href="/brands" className="px-3 py-1"><Logo /></Link>
      <div className="grid gap-0.5">
        <span className="lbl px-3 mb-1">Brands</span>
        {brands.map((b) => <Link key={b.id} href={`/b/${b.id}`} className={"nav " + (cur?.id === b.id ? "on" : "")} onClick={() => setOpen(false)}><span className="avatar" style={{ background: `hsl(${hue(b.name)} 40% 28%)` }}>{b.name.slice(0, 1).toUpperCase()}</span><span className="truncate">{b.name}</span></Link>)}
        <Nav href="/brands" icon="plus" label={brands.length ? "All brands" : "Add a brand"} on={path === "/brands"} />
      </div>
      {cur && !locked && (
        <div className="grid gap-0.5">
          <span className="lbl px-3 mb-1 truncate">{cur.name}</span>
          {ROOMS.map(([k, l, ic]) => <Nav key={k} href={`/b/${cur.id}/${k}`} icon={ic} label={l} on={path.startsWith(`/b/${cur.id}/${k}`)} />)}
        </div>
      )}
      <div className="grid gap-0.5 mt-auto">
        {keyMissing && !locked && <Nav href="/settings" icon="key" label="Add Higgsfield key" tone="var(--warn)" />}
        {locked && <Nav href="/settings" icon="lock" label="Get access" tone="var(--warn)" />}
        <Nav href="/settings" icon="settings" label="Settings" on={path === "/settings"} />
        {admin && <Nav href="/admin" icon="admin" label="Admin" on={path === "/admin"} />}
        <div className="px-3 pt-3 mt-1 border-t border-line grid gap-1">
          {accessLabel && <span className="lbl">{accessLabel}</span>}
          <span className="text-xs text-muted truncate" title={email}>{email}</span><SignOut />
        </div>
      </div>
    </div>
  );
  return (
    <>
      <aside className="hidden md:block fixed inset-y-0 left-0 w-[232px] border-r border-line bg-bg p-3 overflow-y-auto">{nav}</aside>
      <div className="md:hidden sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between">
        <Link href="/brands"><Logo size={18} /></Link>
        <div className="flex items-center gap-3">{cur && <span className="lbl truncate max-w-[120px]">{cur.name}</span>}<button className="btn ghost sm" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close" : "Menu"}</button></div>
      </div>
      {open && <div className="md:hidden fixed inset-0 top-[53px] z-10 bg-bg p-4 overflow-y-auto">{nav}</div>}
    </>
  );
}
