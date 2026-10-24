"use client";
import { useRef, useState } from "react";
import { api, useToast } from "./ui";
import type { MoodItem, ShotItem } from "@/lib/load";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/higgsfield";
import { GOOGLE_IMAGE_MODELS, isGoogleModel } from "@/lib/google";

/** Write the whole prompt yourself. References are numbered in the order you pick them. */
export function Freestyle({ brandId, mood, onMood, onShots }: { brandId: string; mood: MoodItem[]; onMood: (m: MoodItem) => void; onShots: (s: ShotItem[]) => void }) {
  const toast = useToast(); const up = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<"image" | "reel">("image"); const [prompt, setPrompt] = useState(""); const [refs, setRefs] = useState<string[]>([]);
  const [engine, setEngine] = useState("grok-image-2"); const [vengine, setVengine] = useState("seedance-2.5"); const [aspect, setAspect] = useState("4:5"); const [count, setCount] = useState(1); const [size, setSize] = useState("2K"); const [duration, setDuration] = useState(6); const [busy, setBusy] = useState(false);
  const imgs = mood.filter((m) => m.url && m.kind === "image");
  const limit = kind === "reel" ? 10 : isGoogleModel(engine) ? GOOGLE_IMAGE_MODELS[engine].refs : (IMAGE_MODELS as Record<string, { refs: number }>)[engine]?.refs ?? 10;
  async function upload(f: File) { const fd = new FormData(); fd.append("brandId", brandId); fd.append("file", f); fd.append("note", f.name.replace(/\.[^.]+$/, "")); try { const m = await api<MoodItem>("/api/media", "POST", undefined, fd); onMood(m); setRefs((r) => (r.length < limit ? [...r, m.id] : r)); } catch (err) { toast((err as Error).message); } }
  async function go() {
    setBusy(true);
    try {
      const out = kind === "image" ? { aspect, count, model: engine, ...(isGoogleModel(engine) ? { size } : {}) } : { aspect: "9:16", duration, audio: true, model: vengine };
      const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId, kind, spec: {}, out, refs: refs.map((id) => ({ moodId: id, role: "style" })), status: "queued", mode: "freestyle", promptOverride: prompt, title: "Freestyle" });
      onShots(r.shots); toast("Queued on your balance."); document.getElementById("queue")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
      <div className="grid gap-4 min-w-0">
        <div className="flex gap-3 items-center flex-wrap"><div className="inline-flex border border-line rounded-full overflow-hidden">{(["image", "reel"] as const).map((k) => <button key={k} type="button" className="px-4 py-2 font-mono text-xs uppercase tracking-widest" style={{ background: kind === k ? "var(--ink)" : "transparent", color: kind === k ? "var(--bg)" : "var(--ink)" }} onClick={() => setKind(k)}>{k}</button>)}</div><span className="text-sm text-muted">Nothing is added to your prompt. Say “image 1”, “image 2” to point at references.</span></div>
        <textarea className="prompt w-full min-h-[260px] text-[13px]" value={prompt} onChange={(e) => setPrompt(e.target.value)} spellCheck={false} placeholder={"Ultra-realistic fashion photograph. A model wearing the hoodie shown in image 1, oversized, hood up, standing in a white fog void. 85mm lens, soft backlight, centered, minimal. No text."} />
        <div className="flex gap-4 flex-wrap items-end">
          {kind === "image" ? (<>
            <label className="field"><span className="lbl">Engine</span><select className="input" value={engine} onChange={(e) => setEngine(e.target.value)}><optgroup label="Higgsfield key">{Object.entries(IMAGE_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</optgroup><optgroup label="Google AI key">{Object.entries(GOOGLE_IMAGE_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</optgroup></select></label>
            {isGoogleModel(engine) && <label className="field"><span className="lbl">Resolution</span><select className="input" value={size} onChange={(e) => setSize(e.target.value)}>{GOOGLE_IMAGE_MODELS[engine].sizes.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>}
            <label className="field"><span className="lbl">Format</span><select className="input" value={aspect} onChange={(e) => setAspect(e.target.value)}>{[["4:5", "4:5 feed"], ["1:1", "1:1"], ["3:4", "3:4"], ["9:16", "9:16 story"], ["16:9", "16:9"], ["3:2", "3:2"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
            <label className="field"><span className="lbl">Variations</span><select className="input" value={count} onChange={(e) => setCount(+e.target.value)}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          </>) : (<>
            <label className="field"><span className="lbl">Engine</span><select className="input" value={vengine} onChange={(e) => setVengine(e.target.value)}>{Object.entries(VIDEO_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</select></label>
            <label className="field"><span className="lbl">Length</span><select className="input" value={duration} onChange={(e) => setDuration(+e.target.value)}>{[4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} s · 9:16</option>)}</select></label>
          </>)}
          <button className="btn accent" disabled={busy || prompt.trim().length < 5} onClick={go}>{busy ? "Sending…" : "Generate"}</button>
        </div>
      </div>
      <aside className="card p-4 grid gap-3 lg:sticky lg:top-6">
        <div className="flex justify-between items-center"><span className="lbl">References · in order</span><button className="btn sm ghost" onClick={() => up.current?.click()}>Upload</button></div>
        <input ref={up} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(f); }} />
        {refs.length > 0 && <div className="flex gap-2 flex-wrap">{refs.map((id, i) => { const m = imgs.find((x) => x.id === id); return m ? <span key={id} className="relative"><img src={m.url!} alt="" className="w-[56px] h-[70px] object-cover rounded border border-line" /><span className="absolute -top-1 -left-1 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink font-mono text-[11px] grid place-items-center">{i + 1}</span></span> : null; })}<button className="linkbtn self-center" onClick={() => setRefs([])}>clear</button></div>}
        <p className="text-xs text-muted">Tap any image from the board (garments, models, looks, past results) to attach it. This engine takes up to {limit}.</p>
        <div className="grid grid-cols-4 gap-1 max-h-[50vh] overflow-y-auto">{imgs.map((m) => { const n = refs.indexOf(m.id) + 1; return <button key={m.id} type="button" title={m.note} className="relative aspect-[4/5] bg-sunk rounded overflow-hidden border-2" style={{ borderColor: n ? "var(--accent)" : "transparent" }} onClick={() => setRefs((r) => (r.includes(m.id) ? r.filter((x) => x !== m.id) : r.length < limit ? [...r, m.id] : (toast(`This engine takes up to ${limit} references.`), r)))}><img src={m.url!} alt={m.note} className="w-full h-full object-cover" loading="lazy" />{n > 0 && <span className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink font-mono text-[11px] grid place-items-center">{n}</span>}</button>; })}</div>
      </aside>
    </div>
  );
}
