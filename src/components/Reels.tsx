"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, DangerButton, fmt, pct } from "./ui";
import { LIB } from "@/lib/library";

type Brief = { id: string; title: string; direction: string; product: string; quote_id: string | null; hook_id: string | null; aes: string; goal: string };
type Beat = { t: string; shot: string; camera?: string; text?: string };
type Reel = { id: string; brief_id: string | null; title: string; format: string; hook: string; text_card: string; beats: Beat[]; caption: string; hashtags: string[]; audio: string; cover: string; duration: number; prompt: string; why: string; status: string; video: { url?: string; shotId?: string } | null; prediction: { score: number; hook: number; retention: string; verdict: string; notes: string; fixes: string[] } | null; live: Record<string, number | string> | null; postmortem: { verdict: string; summary: string; why: string[]; keep: string[]; change: string[] } | null };
const STATUS = ["idea", "approved", "generated", "scored", "posted", "reviewed"];
const LOGF: [string, string, string?][] = [["postedAt", "Posted", "date"], ["followers", "Followers then"], ["lengthSec", "Length (s)"], ["views", "Views"], ["reach", "Accounts reached"], ["avgWatch", "Avg watch (s)"], ["likes", "Likes"], ["comments", "Comments"], ["shares", "Shares"], ["saves", "Saves"], ["follows", "Follows"]];

function metrics(r: Reel, followers: number | null) {
  const L = r.live || {}; const n = (k: string) => Number(L[k] || 0);
  const views = n("views"), reach = n("reach") || views, fol = n("followers") || followers || 0; const eng = n("likes") + n("comments") + n("shares") + n("saves");
  return { views, er: reach ? eng / reach : null, shareRate: reach ? n("shares") / reach : null, saveRate: reach ? n("saves") / reach : null, watchPct: n("lengthSec") && n("avgWatch") ? Math.min(1, n("avgWatch") / n("lengthSec")) : null, multiple: fol && views ? views / fol : null, follows: n("follows") };
}
const verdict = (m: number | null) => (m == null ? null : m >= 10 ? ["Viral", "var(--good)"] : m >= 3 ? ["Breakout", "var(--good)"] : m >= 1 ? ["Solid", "var(--warn)"] : ["Below page", "var(--bad)"]);

export function Reels(p: { brandId: string; briefs: Brief[]; reels: Reel[]; hooks: { id: string; spoken: string; text: string }[]; quotes: { id: string; text: string }[]; models: { id: string; name: string; ref_mood_id: string | null }[]; followers: number | null; videoUrls: Record<string, string>; styleRefs: string[] }) {
  const sb = supabaseBrowser(); const toast = useToast();
  const [briefs, setBriefs] = useState(p.briefs); const [reels, setReels] = useState(p.reels); const [filter, setFilter] = useState("all"); const [busy, setBusy] = useState("");
  const [f, setF] = useState({ title: "", direction: "", product: "", quote_id: "", hook_id: "", aes: "", goal: "Reach new people" });
  const [logFor, setLogFor] = useState<string | null>(null);
  useEffect(() => { try { const pre = JSON.parse(localStorage.getItem(`atelier-brief-${p.brandId}`) || "null"); if (pre) { setF((x) => ({ ...x, title: pre.title || "", direction: pre.direction || "", hook_id: pre.hookId || "" })); localStorage.removeItem(`atelier-brief-${p.brandId}`); } } catch { /* ignore */ } }, [p.brandId]);

  async function saveBrief(draft: boolean) {
    if (!f.title.trim() || !f.direction.trim()) return toast("Title and direction are required.");
    const { data, error } = await sb.from("briefs").insert({ brand_id: p.brandId, title: f.title, direction: f.direction, product: f.product, quote_id: f.quote_id || null, hook_id: f.hook_id || null, aes: f.aes, goal: f.goal }).select("*").single();
    if (error) return toast(error.message); setBriefs([data, ...briefs]); setF({ ...f, title: "", direction: "", product: "" }); if (draft) await draftFor(data.id);
  }
  async function draftFor(briefId: string) {
    setBusy(briefId);
    try { const r = await api<{ reels: Reel[] }>("/api/claude/draft-reels", "POST", { brandId: p.brandId, briefId }); setReels([...r.reels, ...reels]); setFilter("idea"); toast("3 concepts added."); } catch (err) { toast((err as Error).message); } finally { setBusy(""); }
  }
  async function patch(id: string, patch: Partial<Reel>) { const { error } = await sb.from("reels").update(patch).eq("id", id); if (error) toast(error.message); else setReels((x) => x.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  async function generate(r: Reel) {
    setBusy(r.id);
    try {
      const model = p.models[0]; const refs = [...(model?.ref_mood_id ? [{ moodId: model.ref_mood_id, role: "model" as const }] : []), ...p.styleRefs.map((id) => ({ moodId: id, role: "style" as const }))];
      await api("/api/shots", "POST", { brandId: p.brandId, kind: "reel", spec: {}, out: { aspect: "9:16", duration: Math.min(12, Math.max(5, r.duration || 8)), audio: true, model: "seedance-2.5" }, refs, status: "queued", reelId: r.id, title: "Reel · " + r.title, promptOverride: r.prompt });
      toast("Generating the first beat on your Higgsfield balance. Results land on this reel.");
    } catch (err) { toast((err as Error).message); } finally { setBusy(""); }
  }
  async function prescore(r: Reel) { setBusy(r.id); try { const { prediction } = await api<{ prediction: Reel["prediction"] }>("/api/claude/prescore", "POST", { brandId: p.brandId, reelId: r.id }); setReels((x) => x.map((y) => (y.id === r.id ? { ...y, prediction, status: y.status === "generated" ? "scored" : y.status } : y))); } catch (err) { toast((err as Error).message); } finally { setBusy(""); } }
  async function postmortem(r: Reel) { setBusy(r.id); try { const { postmortem } = await api<{ postmortem: Reel["postmortem"] }>("/api/claude/postmortem", "POST", { brandId: p.brandId, reelId: r.id }); setReels((x) => x.map((y) => (y.id === r.id ? { ...y, postmortem, status: "reviewed" } : y))); } catch (err) { toast((err as Error).message); } finally { setBusy(""); } }
  function copy(t: string) { navigator.clipboard?.writeText(t).then(() => toast("Copied."), () => toast("Couldn't copy.")); }
  const list = reels.filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="grid gap-12">
      <section className="grid gap-4">
        <div className="sechead"><h2>New direction</h2><span className="lbl">Brief → 3 reel concepts</span></div>
        <p className="intro">Say what the post should do. Atelier reads the bible, hooks, library and what has worked, then writes three concepts: hook, beats with one camera line each, caption, sound and a video prompt.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="field"><span className="lbl">Title</span><input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
          <label className="field"><span className="lbl">Goal</span><select className="input" value={f.goal} onChange={(e) => setF({ ...f, goal: e.target.value })}>{["Reach new people", "Grow followers", "Saves & shares", "Sell a piece", "Community / story"].map((g) => <option key={g}>{g}</option>)}</select></label>
          <label className="field md:col-span-2"><span className="lbl">Direction</span><textarea value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })} placeholder="What should happen, how it should feel, what you've seen that you want to riff on" /></label>
          <label className="field"><span className="lbl">Product or collection</span><input value={f.product} onChange={(e) => setF({ ...f, product: e.target.value })} /></label>
          <label className="field"><span className="lbl">Hook to build on</span><select className="input" value={f.hook_id} onChange={(e) => setF({ ...f, hook_id: e.target.value })}><option value="">Let Atelier pick</option>{p.hooks.map((h) => <option key={h.id} value={h.id}>{h.spoken.slice(0, 70)}</option>)}</select></label>
          <label className="field"><span className="lbl">Quote to use</span><select className="input" value={f.quote_id} onChange={(e) => setF({ ...f, quote_id: e.target.value })}><option value="">Let Atelier pick</option>{p.quotes.map((q) => <option key={q.id} value={q.id}>{q.text.slice(0, 70)}</option>)}</select></label>
          <label className="field"><span className="lbl">Aesthetic</span><select className="input" value={f.aes} onChange={(e) => setF({ ...f, aes: e.target.value })}><option value="">Let Atelier pick</option>{LIB.aes.items.filter((i) => i.fit !== "off").map((i) => <option key={i.k}>{i.name}</option>)}</select></label>
        </div>
        <div className="flex gap-3 flex-wrap items-center"><button className="btn" disabled={!!busy} onClick={() => saveBrief(true)}>{busy ? "Writing… (30–90 s)" : "Save & draft 3 reels"}</button><button className="btn ghost" onClick={() => saveBrief(false)}>Save only</button></div>
      </section>

      <section className="grid gap-2">
        <div className="sechead"><h2>Directions</h2><span className="lbl">{briefs.length} saved</span></div>
        {briefs.map((b) => <div key={b.id} className="grid md:grid-cols-[1fr_auto] gap-4 py-4 border-b border-line"><div><h3 className="text-lg">{b.title}</h3><p className="mt-1 max-w-[70ch]">{b.direction}</p><div className="flex gap-1.5 flex-wrap mt-2"><span className="chip">{b.goal}</span>{b.product && <span className="chip">{b.product}</span>}{b.aes && <span className="chip">{b.aes}</span>}<span className="chip">{reels.filter((r) => r.brief_id === b.id).length} reels</span></div></div><div className="flex gap-3 items-start"><button className="btn sm" disabled={!!busy} onClick={() => draftFor(b.id)}>Draft 3 more</button><DangerButton onConfirm={async () => { await sb.from("briefs").delete().eq("id", b.id); setBriefs(briefs.filter((x) => x.id !== b.id)); }} /></div></div>)}
        {!briefs.length && <div className="empty">No directions yet.</div>}
      </section>

      <section className="grid gap-6">
        <div className="sechead"><h2>Reels</h2><div className="flex gap-1.5 flex-wrap">{["all", ...STATUS].map((s) => <button key={s} className={"btn sm " + (filter === s ? "" : "ghost")} style={{ borderRadius: 20 }} onClick={() => setFilter(s)}>{s} {s === "all" ? reels.length : reels.filter((r) => r.status === s).length}</button>)}</div></div>
        <p className="intro">Approve a concept, generate the first beat as a 9:16 clip, get a pre-score, post it, log the numbers, run the post-mortem.</p>
        {list.map((r) => { const m = metrics(r, p.followers), v = verdict(m.multiple), video = p.videoUrls[r.id] || r.video?.url; return (
          <article key={r.id} className="grid md:grid-cols-[200px_1fr] gap-7 pb-7 border-b border-line">
            <div className="frame9 relative max-w-[220px]">{video ? <video src={video} className="absolute inset-0 w-full h-full object-cover" controls muted playsInline preload="metadata" /> : <><div className="font-mono text-[10px] opacity-75">0:00 — {r.duration}S · 9:16</div><div className="font-bold text-[17px] leading-tight uppercase tracking-wide">{r.hook || r.title}</div><div className="font-bold text-[10px] tracking-[.3em] opacity-80">{r.text_card || "—"}</div></>}</div>
            <div className="grid gap-4 content-start min-w-0">
              <div className="flex justify-between gap-3 flex-wrap items-start"><div><span className="lbl">{r.format}</span><h3 className="text-xl">{r.title}</h3></div><span className="pill" style={{ color: r.status === "reviewed" ? "var(--good)" : r.status === "posted" ? "var(--warn)" : "var(--accent)" }}>{r.status}</span></div>
              {r.why && <p className="text-muted max-w-[65ch]">{r.why}</p>}
              <div className="flex gap-2 flex-wrap items-center">
                {r.status === "idea" && <button className="btn sm" onClick={() => patch(r.id, { status: "approved" })}>Approve</button>}
                {["approved", "generated", "scored"].includes(r.status) && !video && <button className="btn sm accent" disabled={busy === r.id} onClick={() => generate(r)}>Generate first beat</button>}
                {r.status !== "idea" && <button className="btn sm ghost" disabled={busy === r.id} onClick={() => prescore(r)}>{r.prediction ? "Re-score" : "Pre-score"}</button>}
                {["generated", "scored", "posted", "reviewed"].includes(r.status) && <button className="btn sm ghost" onClick={() => setLogFor(logFor === r.id ? null : r.id)}>{r.live ? "Edit results" : "Log results"}</button>}
                {r.live && <button className="btn sm accent" disabled={busy === r.id} onClick={() => postmortem(r)}>{r.postmortem ? "Re-run post-mortem" : "Run post-mortem"}</button>}
                {busy === r.id && <span className="lbl" style={{ color: "var(--accent)" }}>Working…</span>}
              </div>
              {(r.prediction || r.live) && <div className="grid md:grid-cols-2 gap-3">
                {r.prediction && <div className="panel"><span className="lbl">Pre-score · Claude's creative review</span><div className="flex gap-3 items-center"><div className="dial" style={{ ["--v" as string]: r.prediction.score }}><b>{r.prediction.score}</b></div><div><div className="font-bold uppercase tracking-wide text-sm">{r.prediction.verdict}</div><div className="lbl">Hook {r.prediction.hook} · Retention risk {r.prediction.retention}</div></div></div><p className="text-sm">{r.prediction.notes}</p><ul className="text-sm list-disc pl-4">{r.prediction.fixes.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
                {r.live && m.views > 0 && <div className="panel"><span className="lbl">Live on Instagram{r.live.postedAt ? " · " + r.live.postedAt : ""}</span>{v && <div className="font-bold uppercase tracking-wide text-sm" style={{ color: v[1] }}>{v[0]} · {m.multiple!.toFixed(1)}× followers</div>}<div className="grid grid-cols-3 gap-2">{[["Views", fmt(m.views)], ["Watched", pct(m.watchPct)], ["Engaged", pct(m.er)], ["Shared", pct(m.shareRate)], ["Saved", pct(m.saveRate)], ["Follows", fmt(m.follows)]].map(([l, x]) => <div key={l}><div className="text-xl font-semibold">{x}</div><span className="lbl">{l}</span></div>)}</div></div>}
              </div>}
              {r.postmortem && <div className="panel"><span className="lbl">Post-mortem</span><div className="font-bold uppercase tracking-wide text-sm">{r.postmortem.verdict}</div><p className="max-w-[70ch]">{r.postmortem.summary}</p><div className="grid md:grid-cols-3 gap-3">{[["Why", r.postmortem.why], ["Keep", r.postmortem.keep], ["Change next time", r.postmortem.change]].map(([l, xs]) => <div key={l as string}><span className="lbl">{l as string}</span><ul className="text-sm list-disc pl-4">{(xs as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></div>)}</div></div>}
              {logFor === r.id && <form className="panel" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const live: Record<string, string | number> = {}; LOGF.forEach(([k, , t]) => { const v = String(fd.get(k) || ""); if (v !== "") live[k] = t ? v : +v; }); await patch(r.id, { live, status: r.status === "reviewed" ? "reviewed" : "posted" }); setLogFor(null); toast("Results saved."); }}>
                <span className="lbl">Instagram numbers · Reel → View insights</span>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2">{LOGF.map(([k, l, t]) => <label key={k} className="field"><span className="lbl">{l}</span><input name={k} type={t || "number"} step="any" min={t ? undefined : 0} className="input text-sm" defaultValue={String(r.live?.[k] ?? (k === "followers" ? p.followers ?? "" : k === "lengthSec" ? r.duration : ""))} /></label>)}</div>
                <div className="flex gap-2"><button className="btn sm">Save results</button><button type="button" className="btn sm ghost" onClick={() => setLogFor(null)}>Cancel</button></div></form>}
              <details className="more"><summary>Script, caption & video prompt</summary><div className="grid gap-4 mt-3">
                {r.beats?.length > 0 && <ol className="grid border-t border-line">{r.beats.map((b, i) => <li key={i} className="grid grid-cols-[64px_1fr] gap-3 py-2 border-b border-line text-sm"><span className="font-mono text-[11px]" style={{ color: "var(--accent)" }}>{b.t}</span><span>{b.shot}{b.camera && <span className="lbl"> · {b.camera}</span>}{b.text && <em className="not-italic font-semibold"> “{b.text}”</em>}</span></li>)}</ol>}
                <dl className="grid grid-cols-[110px_1fr] gap-x-4 gap-y-1.5 text-sm"><dt className="lbl">Caption</dt><dd>{r.caption}</dd><dt className="lbl">Hashtags</dt><dd>{r.hashtags.map((h) => "#" + h).join(" ")}</dd><dt className="lbl">Audio</dt><dd>{r.audio}</dd><dt className="lbl">Cover</dt><dd>{r.cover}</dd></dl>
                <div><span className="lbl">Video prompt</span><div className="prompt mt-1">{r.prompt}</div></div>
                <div className="flex gap-3 flex-wrap"><button className="btn sm ghost" onClick={() => copy(r.caption + "\n\n" + r.hashtags.map((h) => "#" + h).join(" "))}>Copy caption</button><DangerButton onConfirm={async () => { await sb.from("reels").delete().eq("id", r.id); setReels(reels.filter((x) => x.id !== r.id)); }}>Delete reel</DangerButton></div>
              </div></details>
            </div>
          </article>); })}
        {!list.length && <div className="empty">{reels.length ? "Nothing in this stage." : "No reels yet. Write a direction above."}</div>}
      </section>
    </div>
  );
}
