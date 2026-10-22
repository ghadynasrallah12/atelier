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
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>House models</h2><span className="lbl">One face · same skin · same vibe</span></div>
        <p className="intro">A house model has a fixed DNA (biology only: face, skin, hair, build) that goes into every prompt unchanged, plus a reference photo the generator copies. Pick one in the shoot builder and the same person runs across your whole feed.</p></div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {models.map((m) => { const src = refUrl(m); return (
          <article key={m.id} className="card grid grid-cols-[96px_1fr] min-w-0">
            {src ? <img src={src} alt={m.name} className="w-24 h-32 object-cover bg-sunk" /> : <div className="w-24 h-32 bg-sunk grid place-items-center lbl text-center p-2">no reference</div>}
            <div className="p-3 grid gap-1 content-start min-w-0">
              <div className="flex justify-between gap-2"><h4 className="text-base">{m.name}</h4><span className="lbl">{m.look}</span></div>
              <textarea className="bg-transparent border border-transparent focus:border-line focus:bg-sunk text-sm leading-snug resize-y min-h-20 p-1 w-full" defaultValue={m.dna} onBlur={async (e) => { if (e.target.value !== m.dna) { await sb.from("models").update({ dna: e.target.value }).eq("id", m.id); toast("DNA saved."); } }} />
              <div className="flex gap-3 flex-wrap"><button className="btn sm accent" onClick={() => candidates(m)}>{src ? "More candidates" : "Generate candidates"}</button><button className="btn sm ghost" onClick={() => sheet(m)} disabled={!src} title={src ? "" : "Pick a reference face first"}>Reference sheet</button><DangerButton onConfirm={async () => { await sb.from("models").delete().eq("id", m.id); setModels(models.filter((x) => x.id !== m.id)); }} /></div>
            </div>
            {cands.some((c) => c.for_model === m.id) && (
              <div className="col-span-2 border-t border-line p-3 grid gap-2">
                <span className="lbl">Candidates · tap the one you approve</span>
                <div className="grid grid-cols-4 gap-2">{cands.filter((c) => c.for_model === m.id).flatMap((c): { c: ShotItem; r: { url?: string } | null; i: number }[] => (c.status === "done" ? c.results.map((r, i) => ({ c, r, i })) : [{ c, r: null, i: 0 }])).slice(0, 12).map(({ c, r, i }) => r?.url ? (
                  <button key={c.id + i} type="button" className="relative aspect-[3/4] bg-sunk rounded overflow-hidden border-2 border-transparent hover:border-accent" disabled={picking === c.id + i} onClick={() => pick(m, c.id, i)}><img src={r.url} alt="" className="w-full h-full object-cover" /><span className="absolute inset-x-0 bottom-0 text-[10px] text-center py-1 bg-bg/80">{picking === c.id + i ? "…" : "Use this face"}</span></button>
                ) : (
                  <div key={c.id + i} className="aspect-[3/4] bg-sunk rounded grid place-items-center lbl text-center p-2" style={{ color: c.status === "failed" ? "var(--bad)" : undefined }}>{c.status === "failed" ? c.error || "failed" : c.status === "queued" ? "queued" : "generating…"}</div>
                ))}</div>
              </div>
            )}
          </article>); })}
        {!models.length && <div className="empty col-span-full">No house models yet. Add one below.</div>}
      </div>
      <form onSubmit={add} className="panel max-w-2xl">
        <span className="lbl">Add a house model</span>
        <div className="grid md:grid-cols-2 gap-3"><label className="field"><span className="lbl">Name</span><input value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="field"><span className="lbl">Look, in a few words</span><input value={look} onChange={(e) => setLook(e.target.value)} placeholder="Shoulder-length locs" /></label></div>
        <label className="field"><span className="lbl">Fixed DNA · biology only, under 50 words. No clothes, no background, no light.</span><textarea value={dna} onChange={(e) => setDna(e.target.value)} required /></label>
        <div className="flex gap-3 items-center flex-wrap"><label className="btn ghost sm" htmlFor="modelUp">Reference photo</label><input id="modelUp" type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} /><span className="lbl">{file ? file.name : "none"}</span><button type="button" className="btn ghost sm" onClick={writeDna} disabled={!file || !!busy}>Write DNA from the photo</button></div>
        <div className="flex gap-3 items-center"><button className="btn" disabled={!!busy}>Add model</button><span className="lbl" style={{ color: "var(--accent)" }}>{busy}</span></div>
      </form>
    </div>
  );
}
