"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, DangerButton } from "./ui";
import type { MoodItem, ShotItem } from "@/lib/load";
import { DEFAULT_CAM } from "@/lib/prompt";

type Model = { id: string; name: string; look: string; dna: string; ref_mood_id: string | null; note: string };

export function Models({ brandId, models: m0, mood, candidates: c0 }: { brandId: string; models: Model[]; mood: MoodItem[]; candidates: ShotItem[] }) {
  const sb = supabaseBrowser(); const toast = useToast();
  const [models, setModels] = useState(m0); const [moodList, setMoodList] = useState(mood);
  const [name, setName] = useState(""); const [look, setLook] = useState(""); const [dna, setDna] = useState(""); const [file, setFile] = useState<File | null>(null); const [busy, setBusy] = useState("");
  const refUrl = (m: Model) => moodList.find((x) => x.id === m.ref_mood_id)?.url || null;
  const [cands, setCands] = useState(c0); const [picking, setPicking] = useState("");
  useEffect(() => {
    const active = cands.filter((s) => s.status === "queued" || s.status === "generating");
    if (!active.length) return;
    const t = setTimeout(async () => { for (const s of active.slice(0, 6)) { try { const n = await api<ShotItem>(`/api/shots/${s.id}`, "GET"); setCands((x) => x.map((y) => (y.id === s.id ? n : y))); } catch { /* retry */ } } }, 6000);
    return () => clearTimeout(t);
  }, [cands]);
  /** Four faces from the DNA alone (no reference), so the owner can approve one before it becomes the house model. */
  async function candidates(m: Model) {
    try {
      const spec = { model: "house:" + m.id, expr: "calm, eyes soft", top: "plain white T-shirt", topFit: "regular-fit", bottom: "black trousers", botFit: "regular", pose: "standing straight, centered, arms relaxed", bg: "a seamless grey studio with a matte beige micro-concrete floor", shot: "close-up", lens: "85mm portrait lens, shallow depth of field", angle: "eye level", lsrc: "natural light from an overcast sky", ldir: "front-lit", lq: "soft, wrapping light", temp: "neutral daylight 5000K", comp: "centered symmetrical composition", tex: "realistic skin with visible pores and natural imperfections", aes: "minimalist aesthetic: neutral palette, negative space, soft diffused light", anchor: "Zara lookbook, clean catalogue", mood: "calm, reverent, light after darkness" };
      const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId, kind: "image", spec, out: { aspect: "3:4", count: 4 }, refs: [], status: "queued", forModel: m.id, title: "Candidate · " + m.name });
      setCands((x) => [...r.shots, ...x]); toast("4 candidates queued on your balance. Pick the one you like.");
    } catch (err) { toast((err as Error).message); }
  }
  async function pick(m: Model, shotId: string, index: number) {
    setPicking(shotId + index);
    try { const { moodId } = await api<{ moodId: string }>("/api/models/reference", "POST", { modelId: m.id, shotId, index }); const url = cands.find((s) => s.id === shotId)?.results[index]?.url || null; setMoodList((x) => [{ id: moodId, kind: "image", path: null, url, note: `Model reference: ${m.name}`, garment: false, garment_slot: null, tags: ["model"], created_at: new Date().toISOString() }, ...x]); setModels((x) => x.map((y) => (y.id === m.id ? { ...y, ref_mood_id: moodId } : y))); toast(`${m.name} now has a reference face.`); }
    catch (err) { toast((err as Error).message); } finally { setPicking(""); }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy("Saving…");
    try {
      let ref_mood_id: string | null = null;
      if (file) { const fd = new FormData(); fd.append("brandId", brandId); fd.append("file", file); fd.append("note", `Model reference: ${name}`); const m = await api<MoodItem>("/api/media", "POST", undefined, fd); setMoodList((x) => [m, ...x]); ref_mood_id = m.id; }
      const { data, error } = await sb.from("models").insert({ brand_id: brandId, name, look, dna, ref_mood_id }).select("*").single();
      if (error) throw error; setModels([...models, data]); setName(""); setLook(""); setDna(""); setFile(null); toast("Model added.");
    } catch (err) { toast((err as Error).message); } finally { setBusy(""); }
  }
  async function writeDna() {
    if (!file) return toast("Pick a reference photo first."); setBusy("Reading the photo…");
    try { const fd = new FormData(); fd.append("file", file); const r = await api<{ dna: string }>("/api/claude/dna", "POST", undefined, fd); setDna(r.dna); } catch (err) { toast((err as Error).message); } finally { setBusy(""); }
  }
  async function sheet(m: Model) {
    try {
      await api("/api/shots", "POST", { brandId, kind: "image", spec: { ...DEFAULT_CAM, model: "house:" + m.id, top: "plain white T-shirt", topFit: "regular-fit", bottom: "black trousers", botFit: "regular", pose: "standing straight, centered, arms relaxed", bg: "a seamless grey studio with a matte beige micro-concrete floor", expr: "calm, eyes soft" }, out: { aspect: "3:4", count: 2 }, refs: m.ref_mood_id ? [{ moodId: m.ref_mood_id, role: "model" }] : [], status: "queued", title: "Reference sheet · " + m.name });
      toast("Reference sheet queued (2 images on your balance).");
    } catch (err) { toast((err as Error).message); }
  }
  const [openCand, setOpenCand] = useState<string | null>(null);
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>House models</h2><span className="lbl">One face · same skin · same vibe</span></div>
        <p className="intro">A house model is one approved face. Its fixed DNA (biology only) goes into every prompt unchanged and its reference photo rides along, so the same person runs across your whole feed. Generate candidates, approve one, then pick the model in Shoot.</p></div>

      <div className="grid gap-6">
        {models.map((m) => { const src = refUrl(m); const mine = cands.filter((c) => c.for_model === m.id); const tiles = mine.flatMap((c): { c: ShotItem; r: { url?: string } | null; i: number }[] => (c.status === "done" ? c.results.map((r, i) => ({ c, r, i })) : c.status === "failed" ? [] : [{ c, r: null, i: 0 }])); const failed = mine.find((c) => c.status === "failed"); return (
          <article key={m.id} className="card grid md:grid-cols-[320px_1fr] min-w-0">
            <div className="relative bg-sunk md:min-h-[420px]" style={{ aspectRatio: "3/4" }}>
              {src ? <img src={src} alt={m.name} className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 grid place-items-center text-center p-6"><div className="grid gap-3 justify-items-center"><span className="w-16 h-16 rounded-full bg-raise grid place-items-center text-2xl">?</span><span className="text-sm text-muted">No approved face yet.<br />Generate candidates and pick one.</span></div></div>}
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent"><div className="text-xl font-semibold">{m.name}</div>{m.look && <div className="text-sm text-white/70 line-clamp-2">{m.look}</div>}</div>
              {src && <span className="absolute top-3 left-3 pill bg-bg/80" style={{ color: "var(--good)" }}>Approved</span>}
            </div>
            <div className="p-5 grid gap-4 content-start min-w-0">
              <div className="flex gap-2 flex-wrap items-center">
                <button className="btn sm accent" onClick={() => candidates(m)}>{src ? "More candidates" : "Generate 4 candidates"}</button>
                <button className="btn sm ghost" onClick={() => sheet(m)} disabled={!src} title={src ? "" : "Approve a face first"}>Reference sheet</button>
                <DangerButton onConfirm={async () => { await sb.from("models").delete().eq("id", m.id); setModels(models.filter((x) => x.id !== m.id)); }}>Delete model</DangerButton>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="field"><span className="lbl">Name</span><input className="input text-sm" defaultValue={m.name} onBlur={async (e) => { const v = e.target.value.trim(); if (v && v !== m.name) { await sb.from("models").update({ name: v }).eq("id", m.id); setModels((x) => x.map((y) => (y.id === m.id ? { ...y, name: v } : y))); toast("Saved."); } }} /></label>
                <label className="field"><span className="lbl">Look · 3–6 words</span><input className="input text-sm" defaultValue={m.look} maxLength={60} placeholder="Dark skin, short locs, lean" onBlur={async (e) => { const v = e.target.value.trim(); if (v !== m.look) { await sb.from("models").update({ look: v }).eq("id", m.id); setModels((x) => x.map((y) => (y.id === m.id ? { ...y, look: v } : y))); toast("Saved."); } }} /></label>
              </div>
              <label className="field"><span className="lbl">Fixed DNA · biology only · goes into every prompt</span>
                <textarea className="input text-sm leading-snug resize-y min-h-[88px]" defaultValue={m.dna} onBlur={async (e) => { if (e.target.value !== m.dna) { await sb.from("models").update({ dna: e.target.value }).eq("id", m.id); setModels((x) => x.map((y) => (y.id === m.id ? { ...y, dna: e.target.value } : y))); toast("DNA saved."); } }} /></label>
              {(tiles.length > 0 || failed) && (
                <div className="grid gap-2">
                  <div className="flex justify-between items-baseline"><span className="lbl">Candidates · tap the one you approve</span><span className="lbl">{tiles.filter((t) => t.r).length}</span></div>
                  {failed && <div className="text-sm" style={{ color: "var(--bad)" }}>{failed.error}</div>}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-2">
                    {tiles.slice(0, 16).map(({ c, r, i }) => r?.url ? (
                      <div key={c.id + i} className="relative group rounded-lg overflow-hidden border border-line bg-sunk" style={{ aspectRatio: "3/4" }}>
                        <button type="button" className="absolute inset-0 w-full h-full" onClick={() => setOpenCand(r.url!)} aria-label="View"><img src={r.url} alt="" className="w-full h-full object-cover" loading="lazy" /></button>
                        <button type="button" className="btn sm accent absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity" disabled={picking === c.id + i} onClick={() => pick(m, c.id, i)}>{picking === c.id + i ? "…" : "Use this face"}</button>
                      </div>
                    ) : (
                      <div key={c.id + i} className="rounded-lg bg-sunk grid place-items-center lbl animate-pulse" style={{ aspectRatio: "3/4" }}>{c.status === "queued" ? "queued" : "generating…"}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>); })}
        {!models.length && <div className="empty">No house models yet. Add one below: a name, a short look, and the DNA (or let Claude write it from a photo).</div>}
      </div>

      {openCand && <div className="fixed inset-0 z-50 bg-black/92 grid place-items-center p-4" onClick={() => setOpenCand(null)}><img src={openCand} alt="" className="max-h-[92vh] max-w-full rounded-lg" /><button className="btn ghost sm absolute top-4 right-4">Close ✕</button></div>}

      <form onSubmit={add} className="panel max-w-2xl">
        <span className="lbl">Add a house model</span>
        <div className="grid md:grid-cols-2 gap-3"><label className="field"><span className="lbl">Name</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="James" required /></label><label className="field"><span className="lbl">Look · 3–6 words</span><input value={look} onChange={(e) => setLook(e.target.value)} placeholder="Dark skin, short locs, lean" maxLength={60} /></label></div>
        <label className="field"><span className="lbl">Fixed DNA · biology only, under 50 words. No clothes, no background, no light.</span><textarea value={dna} onChange={(e) => setDna(e.target.value)} placeholder="Dark-skinned man, 25, sharp features, defined jawline, short natural black hair, lean athletic build, calm eyes." required /></label>
        <div className="flex gap-3 items-center flex-wrap"><label className="btn ghost sm" htmlFor="modelUp">Reference photo (optional)</label><input id="modelUp" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="lbl">{file ? file.name : "none · you can generate candidates instead"}</span><button type="button" className="btn ghost sm" onClick={writeDna} disabled={!file || !!busy}>Write DNA from the photo</button></div>
        <div className="flex gap-3 items-center"><button className="btn" disabled={!!busy}>Add model</button><span className="lbl" style={{ color: "var(--accent)" }}>{busy}</span></div>
      </form>
    </div>
  );
}
