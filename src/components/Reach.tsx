"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, fmt, pct } from "./ui";

type Snap = { id: string; date: string; followers: number; reach: number | null; engaged: number | null; profile_visits: number | null; link_taps: number | null };
type ReelLite = { id: string; title: string; prediction: { score: number } | null; live: Record<string, number | string> | null };

export function Reach({ brandId, snaps: s0, reels, diagnosis: d0 }: { brandId: string; snaps: Snap[]; reels: ReelLite[]; diagnosis: { text: string; at: number } | null }) {
  const sb = supabaseBrowser(); const toast = useToast();
  const [snaps, setSnaps] = useState(s0); const [diag, setDiag] = useState(d0); const [busy, setBusy] = useState(false);
  const last = snaps.at(-1), prev = snaps.at(-2);
  const posted = reels.filter((r) => r.live && Number(r.live.views));
  const m = (r: ReelLite) => { const L = r.live || {}; const n = (k: string) => Number(L[k] || 0); const views = n("views"), reach = n("reach") || views, fol = n("followers") || last?.followers || 0; return { views, multiple: fol && views ? views / fol : null, watch: n("lengthSec") && n("avgWatch") ? Math.min(1, n("avgWatch") / n("lengthSec")) : null, share: reach ? n("shares") / reach : null, save: reach ? n("saves") / reach : null }; };
  const ms = posted.map(m); const avg = (a: (number | null)[]) => { const x = a.filter((v): v is number => v != null && isFinite(v)); return x.length ? x.reduce((s, v) => s + v, 0) / x.length : null; };
  const best = posted.slice().sort((a, b) => Number(b.live!.views) - Number(a.live!.views))[0];
  const delta = last && prev ? last.followers - prev.followers : null;

  async function addSnap(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const row = { brand_id: brandId, date: String(fd.get("date")), followers: +String(fd.get("followers")), reach: fd.get("reach") ? +String(fd.get("reach")) : null, engaged: fd.get("engaged") ? +String(fd.get("engaged")) : null, profile_visits: fd.get("visits") ? +String(fd.get("visits")) : null, link_taps: fd.get("link") ? +String(fd.get("link")) : null };
    const { data, error } = await sb.from("snapshots").upsert(row, { onConflict: "brand_id,date" }).select("*").single();
    if (error) return toast(error.message); setSnaps([...snaps.filter((s) => s.date !== data.date), data].sort((a, b) => a.date.localeCompare(b.date))); toast("Snapshot saved."); e.currentTarget.reset();
  }
  async function diagnose() { setBusy(true); try { const r = await api<{ text: string }>("/api/claude/diagnose", "POST", { brandId }); setDiag({ text: r.text, at: Date.now() }); } catch (err) { toast((err as Error).message); } finally { setBusy(false); } }

  // Followers line
  const W = 760, H = 220, P = { l: 56, r: 16, t: 20, b: 34 };
  const ys = snaps.map((s) => s.followers); let lo = Math.min(...ys), hi = Math.max(...ys); if (!isFinite(lo)) { lo = 0; hi = 10; } if (hi === lo) { hi += 10; lo = Math.max(0, lo - 10); } const pad = (hi - lo) * 0.12; lo = Math.max(0, lo - pad); hi += pad;
  const x = (i: number) => P.l + i * (W - P.l - P.r) / Math.max(1, snaps.length - 1), y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = ys.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");

  return (
    <div className="grid gap-10">
      <div><div className="sechead"><h2>Page reach</h2><span className="lbl">{last ? "Last snapshot " + last.date : "No snapshots yet"}</span></div><p className="intro">Log a snapshot from Instagram Insights once a week. Reels with results feed the averages.</p></div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-px bg-line border border-line">
        {[["Followers", last ? fmt(last.followers) : "—", delta != null ? <span key="d" style={{ color: delta >= 0 ? "var(--good)" : "var(--bad)" }}>{delta >= 0 ? "+" : ""}{fmt(delta)} since {prev!.date}</span> : <span key="d" className="lbl">Log two snapshots for growth</span>], ["Reached · 30d", last?.reach ? fmt(last.reach) : "—", last?.reach && last.followers ? <span key="r" className="lbl">{(last.reach / last.followers).toFixed(1)}× followers</span> : null], ["Reels logged", String(posted.length), <span key="b" className="lbl">{ms.filter((v) => v.multiple != null && v.multiple >= 3).length} broke out (≥3×)</span>], ["Avg views / reel", fmt(avg(ms.map((v) => v.views))), <span key="s" className="lbl">Share {pct(avg(ms.map((v) => v.share)))} · Save {pct(avg(ms.map((v) => v.save)))}</span>], ["Best reel", best ? fmt(Number(best.live!.views)) : "—", best ? <span key="t" className="lbl">{best.title}</span> : null]].map(([l, v, s]) => <div key={l as string} className="bg-surface p-4 grid gap-1"><span className="lbl">{l as string}</span><div className="text-2xl font-semibold">{v as string}</div>{s}</div>)}
      </div>
      <div className="bg-surface border border-line p-4 overflow-x-auto"><span className="lbl">Followers over time</span>{snaps.length < 2 ? <p className="intro mt-2">The line appears after two snapshots.</p> : <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[480px]" role="img" aria-label="Followers by snapshot date">{[0, 1, 2, 3].map((i) => { const t = lo + (hi - lo) * i / 3; return <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontFamily="monospace" fontSize="11" fill="var(--muted)">{fmt(t)}</text></g>; })}<path d={path + ` L${x(ys.length - 1).toFixed(1)} ${H - P.b} L${P.l} ${H - P.b} Z`} fill="var(--accent)" fillOpacity=".12" /><path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />{ys.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === ys.length - 1 ? 4.5 : 2.5} fill="var(--accent)" />)}{snaps.map((s, i) => (i % Math.ceil(snaps.length / 6) === 0 || i === snaps.length - 1) && <text key={s.id} x={x(i)} y={H - 10} textAnchor="middle" fontFamily="monospace" fontSize="11" fill="var(--muted)">{s.date.slice(5)}</text>)}</svg>}</div>
      <form onSubmit={addSnap} className="panel"><span className="lbl">Add snapshot</span><div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">{[["date", "Date", "date"], ["followers", "Followers"], ["reach", "Reached · 30d"], ["engaged", "Engaged · 30d"], ["visits", "Profile visits"], ["link", "Link taps"]].map(([k, l, t]) => <label key={k} className="field"><span className="lbl">{l}</span><input name={k} type={t || "number"} min={t ? undefined : 0} required={k === "date" || k === "followers"} className="input text-sm" defaultValue={k === "date" ? new Date().toISOString().slice(0, 10) : ""} /></label>)}</div><div><button className="btn">Save snapshot</button></div></form>
      <div className="grid gap-3"><div className="sechead"><h2>Predicted vs. real</h2><span className="lbl">Posted reels</span></div>
        {posted.length ? <div className="overflow-x-auto border border-line"><table className="t min-w-[620px]"><thead><tr><th>Reel</th><th className="num">Pre-score</th><th className="num">Views</th><th className="num">× followers</th><th className="num">Watched</th><th className="num">Shared</th></tr></thead><tbody>{posted.map((r) => { const v = m(r); return <tr key={r.id}><td>{r.title}</td><td className="num">{r.prediction?.score ?? "—"}</td><td className="num">{fmt(v.views)}</td><td className="num">{v.multiple != null ? v.multiple.toFixed(1) + "×" : "—"}</td><td className="num">{pct(v.watch)}</td><td className="num">{pct(v.share)}</td></tr>; })}</tbody></table></div> : <div className="empty">Once you log results on a posted reel, its pre-score and real numbers line up here.</div>}</div>
      <div className="grid gap-3"><div className="sechead"><h2>Page diagnosis</h2><button className="btn accent sm" disabled={busy} onClick={diagnose}>{busy ? "Reading…" : "Diagnose the page"}</button></div>
        {diag?.text && <div className="bg-surface border border-line p-5 whitespace-pre-wrap max-w-[80ch] leading-relaxed">{diag.text}</div>}</div>
    </div>
  );
}
