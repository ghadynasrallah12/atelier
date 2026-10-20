"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, fmt, pct, DangerButton } from "./ui";
import type { IgPostRow } from "@/lib/igsync";

type Snap = { id: string; date: string; followers: number; reach: number | null; engaged: number | null; profile_visits: number | null; link_taps: number | null };
type ReelLite = { id: string; title: string; prediction: { score: number } | null; live: Record<string, number | string> | null };
type Acc = { username: string; followers: number | null; media_count: number | null; picture: string | null; synced_at: string | null } | null;

export function Reach({ brandId, snaps: s0, reels, diagnosis: d0, account, posts: p0, igEnabled, notice }: { brandId: string; snaps: Snap[]; reels: ReelLite[]; diagnosis: { text: string; at: number } | null; account: Acc; posts: IgPostRow[]; igEnabled: boolean; notice?: string }) {
  const sb = supabaseBrowser(); const toast = useToast(); const router = useRouter();
  const [snaps, setSnaps] = useState(s0); const [diag, setDiag] = useState(d0); const [busy, setBusy] = useState<string | null>(null);
  const [posts, setPosts] = useState(p0); const [open, setOpen] = useState<string | null>(null); const [filter, setFilter] = useState<"all" | "REELS" | "FEED">("all");
  const last = snaps.at(-1), prev = snaps.at(-2);
  const followers = account?.followers ?? last?.followers ?? null;

  // Benchmarks from synced posts
  const med = (a: (number | null)[]) => { const x = a.filter((v): v is number => v != null).sort((p, q) => p - q); return x.length ? x[Math.floor(x.length / 2)] : null; };
  const medReach = med(posts.map((p) => p.reach));
  const saveRate = med(posts.map((p) => (p.reach && p.saves != null ? p.saves / p.reach : null)));
  const shareRate = med(posts.map((p) => (p.reach && p.shares != null ? p.shares / p.reach : null)));
  const best = posts.slice().sort((a, b) => (b.reach || 0) - (a.reach || 0))[0];
  const shown = posts.filter((p) => filter === "all" || (filter === "REELS" ? p.product === "REELS" : p.product !== "REELS"));
  const delta = last && prev ? last.followers - prev.followers : null;

  async function sync() { setBusy("sync"); try { const r = await api<{ posts: number }>("/api/instagram/sync", "POST", { brandId }); toast(`Synced ${r.posts} posts.`); router.refresh(); } catch (err) { toast((err as Error).message); } finally { setBusy(null); } }
  async function why(id: string) {
    setBusy(id); setOpen(id);
    try { const d = await api<IgPostRow["diagnosis"]>("/api/claude/why", "POST", { brandId, postId: id }); setPosts(posts.map((p) => (p.id === id ? { ...p, diagnosis: d } : p))); }
    catch (err) { toast((err as Error).message); } finally { setBusy(null); }
  }
  async function diagnose() { setBusy("page"); try { const r = await api<{ text: string }>("/api/claude/diagnose", "POST", { brandId }); setDiag({ text: r.text, at: Date.now() }); } catch (err) { toast((err as Error).message); } finally { setBusy(null); } }
  async function addSnap(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const fd = new FormData(e.currentTarget);
    const row = { brand_id: brandId, date: String(fd.get("date")), followers: +String(fd.get("followers")), reach: fd.get("reach") ? +String(fd.get("reach")) : null, engaged: fd.get("engaged") ? +String(fd.get("engaged")) : null, profile_visits: fd.get("visits") ? +String(fd.get("visits")) : null, link_taps: fd.get("link") ? +String(fd.get("link")) : null };
    const { data, error } = await sb.from("snapshots").upsert(row, { onConflict: "brand_id,date" }).select("*").single();
    if (error) return toast(error.message); setSnaps([...snaps.filter((s) => s.date !== data.date), data].sort((a, b) => a.date.localeCompare(b.date))); toast("Snapshot saved."); e.currentTarget.reset();
  }

  // Followers line
  const W = 760, H = 200, P = { l: 56, r: 16, t: 20, b: 34 };
  const ys = snaps.map((s) => s.followers); let lo = Math.min(...ys), hi = Math.max(...ys); if (!isFinite(lo)) { lo = 0; hi = 10; } if (hi === lo) { hi += 10; lo = Math.max(0, lo - 10); } const pad = (hi - lo) * 0.12; lo = Math.max(0, lo - pad); hi += pad;
  const x = (i: number) => P.l + i * (W - P.l - P.r) / Math.max(1, snaps.length - 1), y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  const path = ys.map((v, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1)).join(" ");
  const mult = (p: IgPostRow) => (medReach && p.reach != null ? p.reach / medReach : null);
  const tone = (m: number | null) => (m == null ? "var(--muted)" : m >= 1.5 ? "var(--good)" : m < 0.6 ? "var(--bad)" : "var(--warn)");

  return (
    <div className="grid gap-10">
      <div><div className="sechead"><h2>Reach</h2>{account?.synced_at && <span className="lbl">Synced {new Date(account.synced_at).toLocaleString()}</span>}</div>
        <p className="intro">Connect the brand&rsquo;s Instagram and Atelier pulls every post with its reach, views, saves and shares. Tap <b>Why?</b> on any post and it tells you, in plain words, why it travelled or didn&rsquo;t, measured against your own account.</p></div>
      {notice && <div className="rule" style={{ borderColor: notice.startsWith("Connected") ? "var(--good)" : "var(--bad)" }}>{notice}</div>}

      {/* Account */}
      {account ? (
        <div className="panel md:flex md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">{account.picture ? <img src={account.picture} alt="" className="w-14 h-14 rounded-full object-cover border border-line" /> : <div className="w-14 h-14 rounded-full bg-sunk" />}
            <div><div className="text-lg font-semibold">@{account.username}</div><div className="lbl">{fmt(account.followers)} followers · {fmt(account.media_count)} posts · {posts.length} synced</div></div></div>
          <div className="flex gap-2 items-center flex-wrap"><button className="btn sm" disabled={busy === "sync"} onClick={sync}>{busy === "sync" ? "Syncing…" : "Sync now"}</button><DangerButton onConfirm={async () => { await api("/api/instagram/disconnect", "POST", { brandId }); router.refresh(); }}>Disconnect</DangerButton></div>
        </div>
      ) : (
        <div className="panel md:grid-cols-[1fr_auto] md:grid items-center">
          <div className="grid gap-1"><span className="lbl">Instagram</span><div className="text-lg font-semibold">Connect the brand&rsquo;s account</div><p className="text-sm text-muted max-w-[60ch]">Professional (business or creator) accounts only. Atelier asks for read access to your posts and insights, nothing else: it never posts, likes or messages. You can disconnect any time.</p></div>
          {igEnabled ? <a className="btn accent" href={`/api/instagram/connect?brandId=${brandId}`}>Connect Instagram</a> : <span className="pill" style={{ color: "var(--warn)" }}>Not configured yet</span>}
        </div>
      )}

      {/* Numbers */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px bg-line border border-line rounded-xl overflow-hidden">
        {[["Followers", fmt(followers), delta != null ? <span key="d" style={{ color: delta >= 0 ? "var(--good)" : "var(--bad)" }}>{delta >= 0 ? "+" : ""}{fmt(delta)} since {prev!.date}</span> : <span key="d" className="lbl">Growth after 2 snapshots</span>],
          ["Median reach / post", fmt(medReach), medReach && followers ? <span key="r" className="lbl">{(medReach / followers).toFixed(2)}× followers</span> : null],
          ["Best post", best ? fmt(best.reach) : "—", best && medReach ? <span key="b" className="lbl">{(best.reach! / medReach).toFixed(1)}× the median</span> : null],
          ["Save rate", pct(saveRate), <span key="s" className="lbl">saves ÷ reach, median</span>],
          ["Share rate", pct(shareRate), <span key="h" className="lbl">shares ÷ reach, median</span>],
          ["Reached · 28d", last?.reach ? fmt(last.reach) : "—", last?.reach && followers ? <span key="x" className="lbl">{(last.reach / followers).toFixed(1)}× followers</span> : null],
        ].map(([l, v, s]) => <div key={l as string} className="bg-surface p-4 grid gap-1"><span className="lbl">{l as string}</span><div className="text-2xl font-semibold">{v as string}</div>{s}</div>)}
      </div>

      {/* Posts */}
      {posts.length > 0 && (
        <div className="grid gap-4">
          <div className="sechead"><h2>Posts</h2><div className="flex gap-1">{([["all", "All"], ["REELS", "Reels"], ["FEED", "Feed"]] as const).map(([k, l]) => <button key={k} className={"btn sm " + (filter === k ? "" : "ghost")} onClick={() => setFilter(k)}>{l}</button>)}</div></div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {shown.map((p) => { const m = mult(p); const d = p.diagnosis; const isOpen = open === p.id; return (
              <article key={p.id} className={"card grid grid-rows-[auto_1fr_auto] min-w-0 " + (isOpen ? "col-span-full md:grid-cols-[220px_1fr] md:grid-rows-none" : "")}>
                <a href={p.permalink || "#"} target="_blank" rel="noopener" className="relative block aspect-[4/5] bg-sunk overflow-hidden">
                  {p.thumb ? <img src={p.thumb} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
                  <span className="pill absolute left-2 top-2 bg-bg/80">{p.product === "REELS" ? "Reel" : p.type === "CAROUSEL_ALBUM" ? "Carousel" : "Image"}</span>
                  {m != null && <span className="absolute right-2 top-2 font-mono text-[11px] px-2 py-0.5 rounded-full bg-bg/85" style={{ color: tone(m) }}>{m.toFixed(1)}×</span>}
                </a>
                <div className="p-3 grid gap-2 content-start min-w-0">
                  <div className="text-sm line-clamp-2 text-muted">{(p.caption || "").split("\n")[0] || "(no caption)"}</div>
                  <div className="grid grid-cols-3 gap-2 text-sm">{[["Reach", p.reach], ["Views", p.views], ["Saves", p.saves], ["Shares", p.shares], ["Likes", p.likes], ["Comments", p.comments]].map(([l, v]) => <div key={l as string}><div className="lbl" style={{ fontSize: 9 }}>{l as string}</div><div className="font-semibold tabular-nums">{fmt(v as number)}</div></div>)}</div>
                  <div className="lbl">{p.posted_at ? new Date(p.posted_at).toLocaleDateString() : ""}{p.avg_watch ? ` · ${p.avg_watch.toFixed(1)}s avg watch` : ""}</div>
                  {isOpen && (d ? (
                    <div className="grid gap-2 mt-1 border-t border-line pt-3">
                      <div className="flex items-center gap-3"><div className="dial" style={{ "--v": d.score } as React.CSSProperties}><b>{d.score}</b></div><div className="font-semibold">{d.verdict}</div></div>
                      <ul className="grid gap-1 text-sm list-disc pl-5">{d.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                      <div className="rule text-sm"><b>Next time.</b> {d.fix}</div>
                    </div>
                  ) : <div className="text-sm text-muted">Reading the post…</div>)}
                </div>
                <div className="px-3 pb-3 flex gap-2 justify-between items-center">
                  <button className={"btn sm " + (d ? "ghost" : "accent")} disabled={busy === p.id} onClick={() => (d && !isOpen ? setOpen(p.id) : d && isOpen ? setOpen(null) : why(p.id))}>{busy === p.id ? "Reading…" : d ? (isOpen ? "Close" : "Why?") : "Why?"}</button>
                  {d && isOpen && <button className="linkbtn" disabled={busy === p.id} onClick={() => why(p.id)}>Re-read</button>}
                </div>
              </article>); })}
          </div>
        </div>
      )}

      {/* Page diagnosis */}
      <div className="grid gap-3"><div className="sechead"><h2>Page diagnosis</h2><button className="btn accent sm" disabled={busy === "page"} onClick={diagnose}>{busy === "page" ? "Reading…" : "Diagnose the page"}</button></div>
        <p className="text-sm text-muted max-w-[70ch]">What is pulling reach, what is holding it back, the three posts to make next and one habit to change. Uses the synced posts, your snapshots and the reels you logged.</p>
        {diag?.text && <div className="card p-5 whitespace-pre-wrap max-w-[80ch] leading-relaxed">{diag.text}</div>}</div>

      {/* Followers */}
      <div className="card p-4 overflow-x-auto"><span className="lbl">Followers over time</span>{snaps.length < 2 ? <p className="intro mt-2">Every sync logs a point. The line appears after two.</p> : <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[480px]" role="img" aria-label="Followers by date">{[0, 1, 2, 3].map((i) => { const t = lo + (hi - lo) * i / 3; return <g key={i}><line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="var(--line)" /><text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontFamily="monospace" fontSize="11" fill="var(--muted)">{fmt(t)}</text></g>; })}<path d={path + ` L${x(ys.length - 1).toFixed(1)} ${H - P.b} L${P.l} ${H - P.b} Z`} fill="var(--accent)" fillOpacity=".12" /><path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />{ys.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={i === ys.length - 1 ? 4.5 : 2.5} fill="var(--accent)" />)}{snaps.map((s, i) => (i % Math.ceil(snaps.length / 6) === 0 || i === snaps.length - 1) && <text key={s.id} x={x(i)} y={H - 10} textAnchor="middle" fontFamily="monospace" fontSize="11" fill="var(--muted)">{s.date.slice(5)}</text>)}</svg>}</div>

      {/* Reels predicted vs real */}
      {reels.some((r) => r.live && Number(r.live.views)) && (
        <div className="grid gap-3"><div className="sechead"><h2>Predicted vs. real</h2><span className="lbl">Reels made here</span></div>
          <div className="overflow-x-auto card"><table className="t min-w-[520px]"><thead><tr><th>Reel</th><th className="num">Pre-score</th><th className="num">Views</th><th className="num">× followers</th></tr></thead><tbody>{reels.filter((r) => r.live && Number(r.live.views)).map((r) => { const v = Number(r.live!.views); return <tr key={r.id}><td>{r.title}</td><td className="num">{r.prediction?.score ?? "—"}</td><td className="num">{fmt(v)}</td><td className="num">{followers ? (v / followers).toFixed(1) + "×" : "—"}</td></tr>; })}</tbody></table></div></div>
      )}

      <details className="more"><summary>Log a snapshot by hand (no Instagram connected)</summary>
        <form onSubmit={addSnap} className="panel mt-3"><div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2">{[["date", "Date", "date"], ["followers", "Followers"], ["reach", "Reached · 28d"], ["engaged", "Engaged · 28d"], ["visits", "Profile visits"], ["link", "Link taps"]].map(([k, l, t]) => <label key={k} className="field"><span className="lbl">{l}</span><input name={k} type={t || "number"} min={t ? undefined : 0} required={k === "date" || k === "followers"} className="input text-sm" defaultValue={k === "date" ? new Date().toISOString().slice(0, 10) : ""} /></label>)}</div><div><button className="btn sm">Save snapshot</button></div></form></details>
    </div>
  );
}
