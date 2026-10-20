"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, useToast, DangerButton } from "./ui";
import type { MoodItem, ShotItem } from "@/lib/load";
import { SL, SCENE_KEYS, CAM_KEYS, DEFAULT_CAM, buildPrompt, type Spec, type SlotKey, type Ref } from "@/lib/prompt";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/higgsfield";

type Model = { id: string; name: string; look: string; dna: string; ref_mood_id: string | null };
type State = { kind: "image" | "reel"; v: Spec; custom: Partial<Record<SlotKey, boolean>>; out: { aspect: string; count: number; duration: number; audio: boolean; imageModel: string; videoModel: string }; refs: string[]; garments: { top: string | null; bottom: string | null } };
const DEF = (): State => ({ kind: "image", v: {}, custom: {}, out: { aspect: "4:5", count: 2, duration: 8, audio: true, imageModel: "grok-image-2", videoModel: "seedance-2.5" }, refs: [], garments: { top: null, bottom: null } });
const art = (p: string) => (/^[aeiou]/i.test(p) ? "an " : "a ");

export function Shoot({ brand, mood: m0, shots: s0, models }: { brand: { id: string; name: string; line: string }; mood: MoodItem[]; shots: ShotItem[]; models: Model[] }) {
  const toast = useToast(); const key = `atelier-shot-${brand.id}`;
  const [S, setS] = useState<State>(DEF()); const [mood, setMood] = useState(m0); const [shots, setShots] = useState(s0); const [busy, setBusy] = useState(false);
  const [gTarget, setGTarget] = useState<"top" | "bottom">("top"); const gUp = useRef<HTMLInputElement>(null);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) || "null"); if (s?.v) setS({ ...DEF(), ...s, out: { ...DEF().out, ...(s.out || {}) }, garments: { ...DEF().garments, ...(s.garments || {}) } }); } catch { /* ignore */ } }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(S)); } catch { /* ignore */ } }, [S, key]);

  const moodById = (id: string | null) => mood.find((m) => m.id === id);
  const garmentsList = mood.filter((m) => m.garment && m.url);
  const styleList = mood.filter((m) => !m.garment && m.url && m.kind === "image");
  const hasGarment = !!(S.garments.top || S.garments.bottom || S.v.top?.trim() || S.v.bottom?.trim());
  const modelRefId = (() => { const v = S.v.model || ""; if (!v.startsWith("house:")) return null; return models.find((m) => m.id === v.slice(6))?.ref_mood_id || null; })();

  const refs: Ref[] = useMemo(() => {
    const out: Ref[] = [];
    if (S.garments.top) out.push({ moodId: S.garments.top, role: "garment-top" });
    if (S.garments.bottom) out.push({ moodId: S.garments.bottom, role: "garment-bottom" });
    if (modelRefId) out.push({ moodId: modelRefId, role: "model" });
    S.refs.forEach((id) => { if (id !== modelRefId && !out.some((r) => r.moodId === id)) out.push({ moodId: id, role: "style" }); });
    return out;
  }, [S.garments, S.refs, modelRefId]);
  const { prompt, autos } = useMemo(() => buildPrompt(S.v, S.kind, S.out, refs, models, brand.name, brand.line), [S, refs, models, brand]);

  const set = (k: SlotKey, val: string) => setS((s) => { const custom = { ...s.custom }; if (val === "__other") { custom[k] = true; return { ...s, custom, v: { ...s.v, [k]: "" } }; } delete custom[k]; return { ...s, custom, v: { ...s.v, [k]: val } }; });
  function Blank({ k, cls = "blank" }: { k: SlotKey; cls?: string }) {
    const s = SL[k], v = S.v[k] || "", custom = S.custom[k];
    const req = (k === "top" || k === "bottom") && !hasGarment;
    return (<span className={cls + (req ? " req" : "")}>
      <select aria-label={s.name} className={v || custom ? "" : "empty"} value={custom ? "__other" : v} onChange={(e) => set(k, e.target.value)}>
        <option value="">{s.empty || "your call"}</option>
        {k === "model" && models.length > 0 && <optgroup label="House models">{models.map((m) => <option key={m.id} value={"house:" + m.id}>{m.name} · {m.look}</option>)}</optgroup>}
        {s.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other">type my own…</option>
      </select>
      {custom && <input aria-label={"Your own " + s.name} value={v} placeholder={s.name} onChange={(e) => setS((x) => ({ ...x, v: { ...x.v, [k]: e.target.value } }))} />}
      <span className="tag">{s.name}</span>
    </span>);
  }
  const gt = !!S.garments.top, gb = !!S.garments.bottom;
  const topP = [S.v.topFit, S.v.topColor, S.v.top].filter(Boolean).join(" ");

  async function uploadGarment(f: File, slot: "top" | "bottom") {
    const fd = new FormData(); fd.append("brandId", brand.id); fd.append("file", f); fd.append("garment", slot); fd.append("note", (slot === "top" ? "Top garment: " : "Pants garment: ") + f.name.replace(/\.[^.]+$/, ""));
    try { const m = await api<MoodItem>("/api/media", "POST", undefined, fd); setMood((x) => [m, ...x]); setS((s) => ({ ...s, garments: { ...s.garments, [slot]: m.id } })); toast((slot === "top" ? "Top" : "Pants") + " photo set."); } catch (err) { toast((err as Error).message); }
  }
  async function save(status: "queued" | "draft") {
    if (!hasGarment) return toast("Add a top or pants: a product photo, or pick the type.");
    setBusy(true);
    try {
      const out = S.kind === "image" ? { aspect: S.out.aspect, count: S.out.count, model: S.out.imageModel } : { aspect: "9:16", duration: S.out.duration, audio: S.out.audio, model: S.out.videoModel };
      const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId: brand.id, kind: S.kind, spec: S.v, out, refs, status });
      setShots((x) => [...r.shots, ...x]);
      toast(status === "queued" ? "Queued. Generating on your Higgsfield balance." : "Draft saved.");
    } catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }

  // Poll shots that are queued or generating while this tab is open.
  useEffect(() => {
    const active = shots.filter((s) => s.status === "queued" || s.status === "generating");
    if (!active.length) return;
    const t = setTimeout(async () => {
      for (const s of active.slice(0, 6)) { try { const next = await api<ShotItem>(`/api/shots/${s.id}`, "GET"); setShots((x) => x.map((y) => (y.id === s.id ? next : y))); } catch { /* retry next tick */ } }
    }, 6000);
    return () => clearTimeout(t);
  }, [shots]);

  const SH_LABEL: Record<string, string> = { draft: "Draft", queued: "Queued", generating: "Generating", done: "Done", failed: "Failed" };
  const SH_COLOR: Record<string, string> = { draft: "var(--muted)", queued: "var(--olive)", generating: "var(--accent)", done: "var(--good)", failed: "var(--bad)" };

  return (
    <div className="grid gap-12">
      <div><div className="sechead"><h2>Build a shot</h2><span className="lbl">A top or pants required · blanks are filled for you</span></div>
        <p className="intro">Drop the product photo (top, pants or both) and set the fit. The sentence is the scene; the row under it is the camera. Anything left on “your call” is filled from the brand's visual rules.</p></div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
        <div className="grid gap-5 min-w-0">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="inline-flex border border-ink rounded-sm">{(["image", "reel"] as const).map((k) => <button key={k} type="button" className="px-4 py-2 font-mono text-xs uppercase tracking-widest" style={{ background: S.kind === k ? "var(--ink)" : "transparent", color: S.kind === k ? "var(--bg)" : "var(--ink)" }} onClick={() => setS({ ...S, kind: k })}>{k}</button>)}</div>
            <button className="btn ghost sm" onClick={() => setS({ ...S, v: { ...S.v, ...DEFAULT_CAM } })}>Studio camera defaults</button>
            <button className="linkbtn" onClick={() => setS(DEF())}>Clear</button>
          </div>
          <p className="sentence">
            A <Blank k="model" />, <Blank k="expr" />, wearing {gt ? <>the <Blank k="top" /> shown in image 1, <Blank k="topFit" /> fit</> : <><span>{art(topP || "top")}</span><Blank k="topFit" /> <Blank k="topColor" /> <Blank k="top" /> with <Blank k="topBrand" /></>}, and {gb ? <>the <Blank k="bottom" /> shown in image {gt ? 2 : 1}, <Blank k="botFit" /> fit</> : <><Blank k="botFit" /> <Blank k="botColor" /> <Blank k="bottom" /> with <Blank k="botBrand" /></>}. On the feet, <Blank k="shoes" />; <Blank k="acc" />. The model is <Blank k="pose" />, in <Blank k="bg" />.
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 pt-4 border-t border-line">
            {[...CAM_KEYS, ...(S.kind === "reel" ? (["move", "act"] as SlotKey[]) : [])].map((k) => (
              <label key={k} className="field"><span className="lbl">{SL[k].name}</span>
                <select className={"input text-sm " + (S.v[k] || S.custom[k] ? "" : "text-muted")} value={S.custom[k] ? "__other" : S.v[k] || ""} onChange={(e) => set(k, e.target.value)}><option value="">your call</option>{SL[k].opts.map((o) => <option key={o} value={o}>{o}</option>)}<option value="__other">type my own…</option></select>
                {S.custom[k] && <input className="input text-sm" value={S.v[k] || ""} onChange={(e) => setS((x) => ({ ...x, v: { ...x.v, [k]: e.target.value } }))} placeholder={SL[k].name} />}
              </label>))}
          </div>
          <div className="flex gap-5 flex-wrap items-end">
            {S.kind === "image" ? (<>
              <label className="field"><span className="lbl">Format</span><select className="input" value={S.out.aspect} onChange={(e) => setS({ ...S, out: { ...S.out, aspect: e.target.value } })}>{[["4:5", "4:5 feed"], ["1:1", "1:1 square"], ["3:4", "3:4 portrait"], ["9:16", "9:16 story"], ["16:9", "16:9 wide"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
              <label className="field"><span className="lbl">Variations</span><select className="input" value={S.out.count} onChange={(e) => setS({ ...S, out: { ...S.out, count: +e.target.value } })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
              <label className="field"><span className="lbl">Model</span><select className="input" value={S.out.imageModel} onChange={(e) => setS({ ...S, out: { ...S.out, imageModel: e.target.value } })}>{Object.entries(IMAGE_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</select></label>
            </>) : (<>
              <label className="field"><span className="lbl">Length</span><select className="input" value={S.out.duration} onChange={(e) => setS({ ...S, out: { ...S.out, duration: +e.target.value } })}>{[5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} s · 9:16</option>)}</select></label>
              <label className="field"><span className="lbl">Model</span><select className="input" value={S.out.videoModel} onChange={(e) => setS({ ...S, out: { ...S.out, videoModel: e.target.value } })}>{Object.entries(VIDEO_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</select></label>
              <label className="field"><span className="lbl">Sound</span><select className="input" value={S.out.audio ? "on" : "off"} onChange={(e) => setS({ ...S, out: { ...S.out, audio: e.target.value === "on" } })}><option value="on">Generated ambience</option><option value="off">Silent</option></select></label>
              <span className="lbl">One camera line per shot.</span>
            </>)}
          </div>
          <div className="flex gap-3 flex-wrap items-center"><button className="btn" disabled={busy} onClick={() => save("queued")}>{busy ? "Sending…" : "Shoot it"}</button><button className="btn ghost" disabled={busy} onClick={() => save("draft")}>Save draft</button><span className="text-sm text-muted">Billed to your Higgsfield balance at the model's listed rate.</span></div>
          <details className="more"><summary>Prompt that will be sent</summary><div className="prompt mt-3">{prompt}{autos.length ? `\n\nFilled for you from the brand's visual rules: ${autos.join(", ")}.` : ""}</div></details>
        </div>
        <aside className="grid gap-3 lg:sticky lg:top-24">
          <div className="sechead pb-1"><span className="lbl">Garments · the pieces in the shot</span></div>
          <p className="text-sm text-muted">Upload the product photo of the top and/or the pants. The prompt says “wearing the piece in image 1”, so the model copies it. One is enough.</p>
          <div className="grid grid-cols-2 gap-2">
            {(["top", "bottom"] as const).map((slot) => { const m = moodById(S.garments[slot]); const n = slot === "top" ? 1 : gt ? 2 : 1; return (
              <div key={slot} className="border border-dashed border-line bg-surface p-2 grid gap-2" style={m ? { borderStyle: "solid", borderColor: "var(--accent)" } : {}} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadGarment(f, slot); }}>
                <span className="lbl">{slot === "top" ? "Top" : "Pants"}{m ? ` · image ${n}` : ""}</span>
                {m?.url ? <img src={m.url} alt={m.note} className="w-full aspect-square object-contain bg-sunk" /> : <div className="aspect-square bg-sunk grid place-items-center lbl text-center p-2">drop the product photo</div>}
                <div className="flex gap-2 flex-wrap"><button className="linkbtn" onClick={() => { setGTarget(slot); gUp.current?.click(); }}>{m ? "Replace" : "Upload"}</button>{m && <button className="linkbtn danger" onClick={() => setS({ ...S, garments: { ...S.garments, [slot]: null } })}>Clear</button>}</div>
              </div>); })}
          </div>
          <input ref={gUp} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadGarment(f, gTarget); }} />
          {garmentsList.length > 0 && <details className="more"><summary>Pick from garments already uploaded</summary><div className="grid grid-cols-4 gap-1 mt-2">{garmentsList.map((m) => <button key={m.id} type="button" title={m.note} className="aspect-square bg-sunk border-2 border-transparent overflow-hidden" onClick={() => setS({ ...S, garments: { ...S.garments, [m.garment_slot === "bottom" ? "bottom" : "top"]: m.id } })}><img src={m.url!} alt={m.note} className="w-full h-full object-contain" /></button>)}</div></details>}
          <div className="sechead pb-1 mt-3"><span className="lbl">Style references · up to 3</span><span className="lbl">{S.refs.length} picked</span></div>
          <p className="text-sm text-muted">Tap looks from the moodboard to copy their styling. A house model's reference is added by itself (M).</p>
          <div className="grid grid-cols-4 gap-1">{styleList.map((m) => { const n = S.refs.indexOf(m.id) + 1; const isM = m.id === modelRefId; return <button key={m.id} type="button" title={m.note} className="relative aspect-[4/5] bg-sunk overflow-hidden border-2" style={{ borderColor: n || isM ? "var(--accent)" : "transparent" }} onClick={() => setS((s) => { const i = s.refs.indexOf(m.id); if (i >= 0) return { ...s, refs: s.refs.filter((x) => x !== m.id) }; if (s.refs.length >= 3) { toast("Up to 3 style references."); return s; } return { ...s, refs: [...s.refs, m.id] }; })}><img src={m.url!} alt={m.note} className="w-full h-full object-cover" loading="lazy" />{(n || isM) && <span className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink font-mono text-[11px] grid place-items-center">{isM ? "M" : n}</span>}</button>; })}
            {!styleList.length && <div className="empty col-span-4 p-3 text-sm">Upload looks in The House → Moodboard.</div>}</div>
        </aside>
      </div>

      <div className="grid gap-4">
        <div className="sechead"><h2>Shoot queue</h2><span className="lbl">{shots.filter((s) => s.status === "generating" || s.status === "queued").length} running · {shots.filter((s) => s.status === "done").length} done</span></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {shots.map((s) => { const sp = s.spec || {}; const gT = s.refs?.some((r) => r.role === "garment-top"), gB = s.refs?.some((r) => r.role === "garment-bottom"); const line = [gT ? [sp.topFit, sp.top || "top", "(photo)"].filter(Boolean).join(" ") : [sp.topFit, sp.topColor, sp.top].filter(Boolean).join(" "), gB ? [sp.botFit, sp.bottom || "pants", "(photo)"].filter(Boolean).join(" ") : [sp.botFit, sp.botColor, sp.bottom].filter(Boolean).join(" ")].filter(Boolean).join(" + ") || "brand look"; return (
            <article key={s.id} className="panel">
              <div className="flex justify-between gap-2 items-start"><span className="lbl">{s.title ? s.title + " · " : ""}{s.kind === "reel" ? `Reel · ${s.out.duration || 8} s` : `Image · ${s.out.aspect || "4:5"}`}{s.hf_model ? ` · ${s.hf_model}` : ""}</span><span className="pill" style={{ color: SH_COLOR[s.status] }}>{SH_LABEL[s.status] || s.status}</span></div>
              <p className="text-sm"><strong>{line}</strong>{sp.model ? ` on ${sp.model.startsWith("house:") ? models.find((m) => m.id === sp.model.slice(6))?.name || "house model" : sp.model}` : ""}{[sp.pose, sp.bg].filter(Boolean).length ? ". " + [sp.pose, sp.bg].filter(Boolean).join(", ") : ""}</p>
              {s.refs?.length > 0 && <div className="flex gap-1">{s.refs.map((r, i) => { const m = moodById(r.moodId); return m?.url ? <span key={i} className="grid justify-items-center gap-0.5"><img src={m.url} alt={m.note} className="w-[34px] h-[42px] object-cover bg-sunk" /><span className="lbl" style={{ fontSize: 9 }}>{r.role.replace("garment-", "")} {i + 1}</span></span> : null; })}</div>}
              {s.results?.length > 0 && <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1.5">{s.results.map((r, i) => r.url ? <a key={i} href={r.url} target="_blank" rel="noopener" className="block bg-sunk border border-line overflow-hidden" style={{ aspectRatio: s.kind === "reel" ? "9/16" : "4/5" }}>{s.kind === "reel" ? <video src={r.url} muted loop playsInline preload="metadata" className="w-full h-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} /> : <img src={r.url} alt={`Result ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />}</a> : null)}</div>}
              {s.error && <p className="text-sm" style={{ color: "var(--bad)" }}>{s.error}</p>}
              {s.note && !s.error && <p className="text-sm text-muted">{s.note}</p>}
              <div className="flex gap-3 flex-wrap items-center">
                {(s.status === "draft" || s.status === "failed") && <button className="btn sm" onClick={async () => { try { const n = await api<ShotItem>(`/api/shots/${s.id}`, "PATCH", { status: "queued" }); setShots((x) => x.map((y) => (y.id === s.id ? n : y))); } catch (err) { toast((err as Error).message); } }}>{s.status === "failed" ? "Retry" : "Shoot it"}</button>}
                {s.status === "done" && s.kind === "image" && s.results?.[0] && <button className="btn sm accent" onClick={async () => { try { const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId: brand.id, kind: "reel", spec: { ...sp, move: sp.move || "slow push-in toward the subject", act: sp.act || "breathes and barely moves" }, out: { aspect: "9:16", duration: 6, audio: true, model: "kling-o3" }, refs: s.refs, status: "queued", title: "Animated from image" }); setShots((x) => [...r.shots, ...x]); toast("Reel queued."); } catch (err) { toast((err as Error).message); } }}>Animate into a reel</button>}
                <button className="btn sm ghost" onClick={() => { setS((x) => ({ ...x, kind: s.kind, v: { ...sp }, refs: (s.refs || []).filter((r) => r.role === "style").map((r) => r.moodId), garments: { top: s.refs?.find((r) => r.role === "garment-top")?.moodId || null, bottom: s.refs?.find((r) => r.role === "garment-bottom")?.moodId || null } })); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Load into builder</button>
                <DangerButton onConfirm={async () => { try { await api(`/api/shots/${s.id}`, "DELETE"); setShots((x) => x.filter((y) => y.id !== s.id)); } catch (err) { toast((err as Error).message); } }} />
              </div>
            </article>); })}
          {!shots.length && <div className="empty col-span-full">No shots yet. Build one above.</div>}
        </div>
      </div>
    </div>
  );
}
