"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, useToast, DangerButton } from "./ui";
import type { MoodItem, ShotItem } from "@/lib/load";
import { SL, CAM_KEYS, LOOKS, buildPrompt, type Spec, type SlotKey, type Ref } from "@/lib/prompt";
import { IMAGE_MODELS, VIDEO_MODELS } from "@/lib/higgsfield";
import { LIB } from "@/lib/library";

type Model = { id: string; name: string; look: string; dna: string; ref_mood_id: string | null };
type Mode = "top" | "bottom" | "both";
type State = { mode: Mode | null; look: string; kind: "image" | "reel"; v: Spec; custom: Partial<Record<SlotKey, boolean>>; out: { aspect: string; count: number; duration: number; audio: boolean; imageModel: string; videoModel: string }; refs: string[]; garments: { top: string | null; bottom: string | null } };
const DEF = (): State => ({ mode: null, look: "studio", kind: "image", v: { ...LOOKS[0].cam }, custom: {}, out: { aspect: "4:5", count: 2, duration: 8, audio: true, imageModel: "grok-image-2", videoModel: "seedance-2.5" }, refs: [], garments: { top: null, bottom: null } });

export function Shoot({ brand, mood: m0, shots: s0, models }: { brand: { id: string; name: string; line: string }; mood: MoodItem[]; shots: ShotItem[]; models: Model[] }) {
  const toast = useToast(); const key = `atelier-shoot2-${brand.id}`;
  const [S, setS] = useState<State>(DEF()); const [mood, setMood] = useState(m0); const [shots, setShots] = useState(s0); const [busy, setBusy] = useState(false);
  const [gTarget, setGTarget] = useState<"top" | "bottom">("top"); const gUp = useRef<HTMLInputElement>(null); const [adv, setAdv] = useState(false);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(key) || "null"); if (s?.v) setS({ ...DEF(), ...s, out: { ...DEF().out, ...(s.out || {}) }, garments: { ...DEF().garments, ...(s.garments || {}) } }); } catch { /* ignore */ } }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(S)); } catch { /* ignore */ } }, [S, key]);

  const moodById = (id: string | null) => mood.find((m) => m.id === id);
  const garmentsList = mood.filter((m) => m.garment && m.url);
  const styleList = mood.filter((m) => !m.garment && m.url && m.kind === "image");
  const needTop = S.mode === "top" || S.mode === "both", needBot = S.mode === "bottom" || S.mode === "both";
  const gt = !!S.garments.top, gb = !!S.garments.bottom;
  const ready = !!S.mode && (!needTop || gt) && (!needBot || gb);
  const houseId = S.v.model?.startsWith("house:") ? S.v.model.slice(6) : null;
  const modelRefId = houseId ? models.find((m) => m.id === houseId)?.ref_mood_id || null : null;

  const refs: Ref[] = useMemo(() => {
    const out: Ref[] = [];
    if (needTop && S.garments.top) out.push({ moodId: S.garments.top, role: "garment-top" });
    if (needBot && S.garments.bottom) out.push({ moodId: S.garments.bottom, role: "garment-bottom" });
    if (modelRefId) out.push({ moodId: modelRefId, role: "model" });
    S.refs.forEach((id) => { if (id !== modelRefId && !out.some((r) => r.moodId === id)) out.push({ moodId: id, role: "style" }); });
    return out;
  }, [S.garments, S.refs, modelRefId, needTop, needBot]);
  // Only the chosen pieces travel; the other half is filled plain server-side.
  const specOut: Spec = useMemo(() => { const v = { ...S.v }; if (!needTop) { delete v.top; delete v.topFit; delete v.topColor; delete v.topBrand; } if (!needBot) { delete v.bottom; delete v.botFit; delete v.botColor; delete v.botBrand; } return v; }, [S.v, needTop, needBot]);
  const { prompt, autos } = useMemo(() => buildPrompt(specOut, S.kind, S.out, refs, models, brand.name, brand.line), [specOut, S.kind, S.out, refs, models, brand]);

  const set = (k: SlotKey, val: string) => setS((s) => { const custom = { ...s.custom }; if (val === "__other") { custom[k] = true; return { ...s, custom, v: { ...s.v, [k]: "" } }; } delete custom[k]; return { ...s, custom, v: { ...s.v, [k]: val } }; });
  function Blank({ k, house }: { k: SlotKey; house?: boolean }) {
    const s = SL[k], v = S.v[k] || "", custom = S.custom[k];
    return (<span className="blank">
      <select aria-label={s.name} className={v || custom ? "" : "empty"} value={custom ? "__other" : v} onChange={(e) => set(k, e.target.value)}>
        <option value="">{s.empty || "your call"}</option>
        {house && models.length > 0 && <optgroup label="House models">{models.map((m) => <option key={m.id} value={"house:" + m.id}>{m.name} · {m.look}</option>)}</optgroup>}
        {s.opts.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other">type my own…</option>
      </select>
      {custom && <input aria-label={"Your own " + s.name} value={v} placeholder={s.name} onChange={(e) => setS((x) => ({ ...x, v: { ...x.v, [k]: e.target.value } }))} />}
      <span className="tag">{s.name}</span>
    </span>);
  }
  function applyLook(id: string) { const L = LOOKS.find((l) => l.id === id)!; setS((s) => ({ ...s, look: id, v: { ...s.v, ...L.cam, bg: s.v.bg || L.bg || "" } })); }

  async function uploadGarment(f: File, slot: "top" | "bottom") {
    const fd = new FormData(); fd.append("brandId", brand.id); fd.append("file", f); fd.append("garment", slot); fd.append("note", (slot === "top" ? "Top garment: " : "Pants garment: ") + f.name.replace(/\.[^.]+$/, ""));
    try { const m = await api<MoodItem>("/api/media", "POST", undefined, fd); setMood((x) => [m, ...x]); setS((s) => ({ ...s, garments: { ...s.garments, [slot]: m.id } })); toast((slot === "top" ? "Top" : "Pants") + " photo set."); } catch (err) { toast((err as Error).message); }
  }
  async function save(status: "queued" | "draft") {
    if (!S.mode) return toast("First pick what you're shooting: top, pants or both.");
    if (!ready) return toast(`Add the product photo of the ${needTop && !gt ? "top" : "pants"}.`);
    setBusy(true);
    try {
      const out = S.kind === "image" ? { aspect: S.out.aspect, count: S.out.count, model: S.out.imageModel } : { aspect: "9:16", duration: S.out.duration, audio: S.out.audio, model: S.out.videoModel };
      const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId: brand.id, kind: S.kind, spec: specOut, out, refs, status });
      setShots((x) => [...r.shots, ...x]);
      toast(status === "queued" ? "Queued. Generating on your Higgsfield balance." : "Draft saved.");
      document.getElementById("queue")?.scrollIntoView({ behavior: "smooth" });
    } catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  useEffect(() => {
    const active = shots.filter((s) => s.status === "queued" || s.status === "generating");
    if (!active.length) return;
    const t = setTimeout(async () => { for (const s of active.slice(0, 6)) { try { const next = await api<ShotItem>(`/api/shots/${s.id}`, "GET"); setShots((x) => x.map((y) => (y.id === s.id ? next : y))); } catch { /* retry */ } } }, 6000);
    return () => clearTimeout(t);
  }, [shots]);

  const SH_LABEL: Record<string, string> = { draft: "Draft", queued: "Queued", generating: "Generating", done: "Done", failed: "Failed" };
  const SH_COLOR: Record<string, string> = { draft: "var(--muted)", queued: "var(--olive)", generating: "var(--accent)", done: "var(--good)", failed: "var(--bad)" };
  const Step = ({ n, title, hint, done }: { n: number; title: string; hint?: string; done?: boolean }) => (
    <div className="flex items-baseline gap-3 flex-wrap"><span className="w-7 h-7 rounded-full grid place-items-center font-mono text-xs flex-none" style={{ background: done ? "var(--accent)" : "var(--raise)", color: done ? "var(--accent-ink)" : "var(--muted)" }}>{done ? "✓" : n}</span><h3 className="text-lg">{title}</h3>{hint && <span className="text-sm text-muted">{hint}</span>}</div>
  );
  const GarmentBox = ({ slot }: { slot: "top" | "bottom" }) => { const m = moodById(S.garments[slot]); const n = slot === "top" ? 1 : needTop ? 2 : 1; const fitK: SlotKey = slot === "top" ? "topFit" : "botFit", typeK: SlotKey = slot === "top" ? "top" : "bottom"; return (
    <div className="card p-3 grid gap-3" style={m ? { borderColor: "var(--accent)" } : {}} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadGarment(f, slot); }}>
      <div className="flex justify-between items-baseline"><span className="lbl">{slot === "top" ? "Top" : "Pants"} · image {n}</span>{m && <button className="linkbtn danger" onClick={() => setS({ ...S, garments: { ...S.garments, [slot]: null } })}>Clear</button>}</div>
      <button type="button" className="aspect-square bg-sunk rounded-lg overflow-hidden grid place-items-center" onClick={() => { setGTarget(slot); gUp.current?.click(); }}>{m?.url ? <img src={m.url} alt={m.note} className="w-full h-full object-contain" /> : <span className="lbl text-center p-3">Tap to upload the product photo<br />or drop it here</span>}</button>
      <div className="grid grid-cols-2 gap-2">
        <label className="field"><span className="lbl">It's a</span><select className="input text-sm" value={S.v[typeK] || ""} onChange={(e) => set(typeK, e.target.value)}><option value="">{slot === "top" ? "top" : "pants"}</option>{SL[typeK].opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
        <label className="field"><span className="lbl">Fit</span><select className="input text-sm" value={S.v[fitK] || ""} onChange={(e) => set(fitK, e.target.value)}><option value="">as in the photo</option>{SL[fitK].opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
      </div>
      {garmentsList.some((g) => (g.garment_slot || "top") === slot) && <details className="more"><summary>Already uploaded</summary><div className="grid grid-cols-4 gap-1 mt-2">{garmentsList.filter((g) => (g.garment_slot || "top") === slot).map((g) => <button key={g.id} type="button" title={g.note} className="aspect-square bg-sunk rounded overflow-hidden border-2" style={{ borderColor: S.garments[slot] === g.id ? "var(--accent)" : "transparent" }} onClick={() => setS({ ...S, garments: { ...S.garments, [slot]: g.id } })}><img src={g.url!} alt={g.note} className="w-full h-full object-contain" /></button>)}</div></details>}
    </div>); };

  return (
    <div className="grid gap-10">
      <div><div className="sechead"><h2>Shoot</h2><span className="lbl">Five steps · every blank you skip is filled from the brand's rules</span></div>
        <p className="intro">Pick what you're shooting, upload its product photo, choose the model and the pose, pick a look, shoot. The product in the photo is copied exactly; everything else is yours to set or leave on “your call”.</p></div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <div className="grid gap-8 min-w-0">
          {/* 1 · What */}
          <section className="grid gap-4">
            <Step n={1} title="What are you shooting?" done={!!S.mode} />
            <div className="grid grid-cols-3 gap-3">{([["top", "Top only", "A tee, hoodie, jacket…"], ["bottom", "Pants only", "Trousers, shorts, a skirt…"], ["both", "Top + pants", "The full outfit"]] as const).map(([m, t, d]) => <button key={m} type="button" className="card p-4 text-left grid gap-1 transition-colors" style={S.mode === m ? { borderColor: "var(--accent)", background: "var(--raise)" } : {}} onClick={() => setS({ ...S, mode: m })}><div className="font-semibold">{t}</div><div className="text-xs text-muted">{d}</div></button>)}</div>
            {S.mode && <div className={"grid gap-3 " + (S.mode === "both" ? "sm:grid-cols-2" : "sm:grid-cols-2")}>{needTop && <GarmentBox slot="top" />}{needBot && <GarmentBox slot="bottom" />}</div>}
            <input ref={gUp} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadGarment(f, gTarget); }} />
          </section>

          {/* 2 · Who */}
          <section className="grid gap-4">
            <Step n={2} title="Who wears it?" hint={models.length ? "Your house models keep the same face across the feed." : "Create a house model to lock one face across the feed."} done={!!S.v.model} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
              {models.map((m) => { const ref = moodById(m.ref_mood_id); const on = houseId === m.id; return (
                <button key={m.id} type="button" className="card text-left grid grid-rows-[auto_auto]" style={on ? { borderColor: "var(--accent)" } : {}} onClick={() => set("model", "house:" + m.id)}>
                  <div className="aspect-[4/5] bg-sunk">{ref?.url ? <img src={ref.url} alt={m.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full grid place-items-center lbl">no photo</div>}</div>
                  <div className="p-2"><div className="text-sm font-semibold">{m.name}</div><div className="text-xs text-muted line-clamp-2">{m.look}</div></div>
                </button>); })}
              <Link href={`/b/${brand.id}/models`} className="card grid place-items-center text-center p-3 text-sm text-muted border-dashed min-h-[120px]">+ New house model</Link>
            </div>
            <div className="text-sm text-muted">Or describe one: <Blank k="model" /> · expression <Blank k="expr" /></div>
          </section>

          {/* 3 · Pose & place */}
          <section className="grid gap-4">
            <Step n={3} title="Pose and place" done={!!S.v.pose} />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">{LIB.pose.items.map((p) => { const on = S.v.pose === p.line; return <button key={p.k} type="button" title={p.eff} className="card text-left" style={on ? { borderColor: "var(--accent)" } : {}} onClick={() => set("pose", on ? "" : p.line)}><img src={`/library/pose.${p.k}.webp`} alt={p.name} className="w-full aspect-[4/5] object-cover" loading="lazy" /><div className="p-1.5 text-[11px] leading-tight">{p.name}</div></button>; })}</div>
            <p className="sentence">In <Blank k="bg" />. On the feet, <Blank k="shoes" />; <Blank k="acc" />.</p>
          </section>

          {/* 4 · Look */}
          <section className="grid gap-4">
            <Step n={4} title="The look" hint="Camera and light in one tap." done />
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">{LOOKS.map((L) => <button key={L.id} type="button" className="card p-3 text-left grid gap-1" style={S.look === L.id ? { borderColor: "var(--accent)", background: "var(--raise)" } : {}} onClick={() => applyLook(L.id)}><div className="font-semibold text-sm">{L.name}</div><div className="text-xs text-muted">{L.blurb}</div></button>)}</div>
            <button className="linkbtn justify-self-start" onClick={() => setAdv(!adv)}>{adv ? "– Hide" : "+ Fine-tune"} camera & light</button>
            {adv && <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {[...CAM_KEYS, ...(S.kind === "reel" ? (["move", "act"] as SlotKey[]) : [])].map((k) => (
                <label key={k} className="field"><span className="lbl">{SL[k].name}</span>
                  <select className={"input text-sm " + (S.v[k] || S.custom[k] ? "" : "text-muted")} value={S.custom[k] ? "__other" : S.v[k] || ""} onChange={(e) => set(k, e.target.value)}><option value="">your call</option>{SL[k].opts.map((o) => <option key={o} value={o}>{o}</option>)}<option value="__other">type my own…</option></select>
                  {S.custom[k] && <input className="input text-sm" value={S.v[k] || ""} onChange={(e) => setS((x) => ({ ...x, v: { ...x.v, [k]: e.target.value } }))} placeholder={SL[k].name} />}
                </label>))}
            </div>}
          </section>

          {/* 5 · Output */}
          <section className="grid gap-4">
            <Step n={5} title="Shoot" done={ready} />
            <div className="flex gap-4 flex-wrap items-end">
              <div className="inline-flex border border-line rounded-full overflow-hidden self-end">{(["image", "reel"] as const).map((k) => <button key={k} type="button" className="px-4 py-2 font-mono text-xs uppercase tracking-widest" style={{ background: S.kind === k ? "var(--ink)" : "transparent", color: S.kind === k ? "var(--bg)" : "var(--ink)" }} onClick={() => setS({ ...S, kind: k })}>{k}</button>)}</div>
              {S.kind === "image" ? (<>
                <label className="field"><span className="lbl">Format</span><select className="input" value={S.out.aspect} onChange={(e) => setS({ ...S, out: { ...S.out, aspect: e.target.value } })}>{[["4:5", "4:5 feed"], ["1:1", "1:1 square"], ["3:4", "3:4 portrait"], ["9:16", "9:16 story"], ["16:9", "16:9 wide"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
                <label className="field"><span className="lbl">Variations</span><select className="input" value={S.out.count} onChange={(e) => setS({ ...S, out: { ...S.out, count: +e.target.value } })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
                <label className="field"><span className="lbl">Engine</span><select className="input" value={S.out.imageModel} onChange={(e) => setS({ ...S, out: { ...S.out, imageModel: e.target.value } })}>{Object.entries(IMAGE_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</select></label>
              </>) : (<>
                <label className="field"><span className="lbl">Length</span><select className="input" value={S.out.duration} onChange={(e) => setS({ ...S, out: { ...S.out, duration: +e.target.value } })}>{[5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} s · 9:16</option>)}</select></label>
                <label className="field"><span className="lbl">Camera move</span><select className="input" value={S.v.move || ""} onChange={(e) => set("move", e.target.value)}><option value="">slow push-in (default)</option>{SL.move.opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>
                <label className="field"><span className="lbl">Engine</span><select className="input" value={S.out.videoModel} onChange={(e) => setS({ ...S, out: { ...S.out, videoModel: e.target.value } })}>{Object.entries(VIDEO_MODELS).map(([id, m]) => <option key={id} value={id}>{m.label}</option>)}</select></label>
                <label className="field"><span className="lbl">Sound</span><select className="input" value={S.out.audio ? "on" : "off"} onChange={(e) => setS({ ...S, out: { ...S.out, audio: e.target.value === "on" } })}><option value="on">Generated ambience</option><option value="off">Silent</option></select></label>
              </>)}
            </div>
            <div className="flex gap-3 flex-wrap items-center"><button className="btn accent" disabled={busy || !ready} onClick={() => save("queued")}>{busy ? "Sending…" : "Shoot it"}</button><button className="btn ghost" disabled={busy} onClick={() => save("draft")}>Save draft</button><button className="linkbtn" onClick={() => setS(DEF())}>Start over</button>
              {!ready && <span className="text-sm" style={{ color: "var(--warn)" }}>{!S.mode ? "Pick what you're shooting first." : `Upload the ${needTop && !gt ? "top" : "pants"} photo to shoot.`}</span>}
              {ready && <span className="text-sm text-muted">Billed to your Higgsfield balance at the engine's listed rate.</span>}</div>
            <details className="more"><summary>Prompt that will be sent</summary><div className="prompt mt-3">{prompt}{autos.length ? `\n\nFilled for you from the brand's visual rules: ${autos.join(", ")}.` : ""}</div></details>
          </section>
        </div>

        {/* Summary rail */}
        <aside className="grid gap-3 lg:sticky lg:top-6">
          <div className="card p-4 grid gap-3">
            <span className="lbl">Your shot</span>
            <div className="flex gap-2">{refs.map((r, i) => { const m = moodById(r.moodId); return m?.url ? <span key={i} className="grid justify-items-center gap-1"><img src={m.url} alt={m.note} className="w-[52px] h-[64px] object-cover rounded bg-sunk border border-line" /><span className="lbl" style={{ fontSize: 9 }}>{r.role === "model" ? "model" : r.role.replace("garment-", "")} · {i + 1}</span></span> : null; })}{!refs.length && <span className="text-sm text-muted">Nothing picked yet.</span>}</div>
            <ul className="text-sm grid gap-1">
              <li><span className="lbl">What</span> <b>{S.mode === "top" ? "Top only" : S.mode === "bottom" ? "Pants only" : S.mode === "both" ? "Top + pants" : "—"}</b>{needTop && S.v.topFit ? ` · ${S.v.topFit} top` : ""}{needBot && S.v.botFit ? ` · ${S.v.botFit} pants` : ""}</li>
              <li><span className="lbl">Who</span> {houseId ? models.find((m) => m.id === houseId)?.name : S.v.model || "your call"}</li>
              <li><span className="lbl">Pose</span> {LIB.pose.items.find((p) => p.line === S.v.pose)?.name || S.v.pose || "your call"}</li>
              <li><span className="lbl">Place</span> {S.v.bg || "your call"}</li>
              <li><span className="lbl">Look</span> {LOOKS.find((l) => l.id === S.look)?.name}</li>
              <li><span className="lbl">Out</span> {S.kind === "image" ? `${S.out.count} × ${S.out.aspect}` : `${S.out.duration}s reel`}</li>
            </ul>
          </div>
          <div className="card p-4 grid gap-2">
            <div className="flex justify-between"><span className="lbl">Style references · up to 3</span><span className="lbl">{S.refs.length}</span></div>
            <p className="text-xs text-muted">Tap looks from the moodboard to copy their styling.</p>
            <div className="grid grid-cols-4 gap-1">{styleList.map((m) => { const n = S.refs.indexOf(m.id) + 1; return <button key={m.id} type="button" title={m.note} className="relative aspect-[4/5] bg-sunk rounded overflow-hidden border-2" style={{ borderColor: n ? "var(--accent)" : "transparent" }} onClick={() => setS((s) => { const i = s.refs.indexOf(m.id); if (i >= 0) return { ...s, refs: s.refs.filter((x) => x !== m.id) }; if (s.refs.length >= 3) { toast("Up to 3 style references."); return s; } return { ...s, refs: [...s.refs, m.id] }; })}><img src={m.url!} alt={m.note} className="w-full h-full object-cover" loading="lazy" />{n > 0 && <span className="absolute top-0.5 right-0.5 w-[18px] h-[18px] rounded-full bg-accent text-accent-ink font-mono text-[11px] grid place-items-center">{n}</span>}</button>; })}
              {!styleList.length && <div className="col-span-4 text-xs text-muted">Upload looks in The House → Moodboard.</div>}</div>
          </div>
        </aside>
      </div>

      <div className="grid gap-4" id="queue">
        <div className="sechead"><h2>Shoot queue</h2><span className="lbl">{shots.filter((s) => s.status === "generating" || s.status === "queued").length} running · {shots.filter((s) => s.status === "done").length} done</span></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {shots.map((s) => { const sp = s.spec || {}; const gT = s.refs?.some((r) => r.role === "garment-top"), gB = s.refs?.some((r) => r.role === "garment-bottom"); const line = [gT ? [sp.topFit, sp.top || "top", "(photo)"].filter(Boolean).join(" ") : [sp.topFit, sp.topColor, sp.top].filter(Boolean).join(" "), gB ? [sp.botFit, sp.bottom || "pants", "(photo)"].filter(Boolean).join(" ") : [sp.botFit, sp.botColor, sp.bottom].filter(Boolean).join(" ")].filter(Boolean).join(" + ") || "brand look"; return (
            <article key={s.id} className="panel">
              <div className="flex justify-between gap-2 items-start"><span className="lbl">{s.title ? s.title + " · " : ""}{s.kind === "reel" ? `Reel · ${s.out.duration || 8} s` : `Image · ${s.out.aspect || "4:5"}`}{s.hf_model ? ` · ${s.hf_model}` : ""}</span><span className="pill" style={{ color: SH_COLOR[s.status] }}>{SH_LABEL[s.status] || s.status}</span></div>
              <p className="text-sm"><strong>{line}</strong>{sp.model ? ` on ${sp.model.startsWith("house:") ? models.find((m) => m.id === sp.model.slice(6))?.name || "house model" : sp.model}` : ""}{[sp.pose, sp.bg].filter(Boolean).length ? ". " + [sp.pose, sp.bg].filter(Boolean).join(", ") : ""}</p>
              {s.refs?.length > 0 && <div className="flex gap-1">{s.refs.map((r, i) => { const m = moodById(r.moodId); return m?.url ? <span key={i} className="grid justify-items-center gap-0.5"><img src={m.url} alt={m.note} className="w-[34px] h-[42px] object-cover rounded bg-sunk" /><span className="lbl" style={{ fontSize: 9 }}>{r.role.replace("garment-", "")} {i + 1}</span></span> : null; })}</div>}
              {s.results?.length > 0 && <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1.5">{s.results.map((r, i) => r.url ? <a key={i} href={r.url} target="_blank" rel="noopener" className="block bg-sunk border border-line rounded overflow-hidden" style={{ aspectRatio: s.kind === "reel" ? "9/16" : "4/5" }}>{s.kind === "reel" ? <video src={r.url} muted loop playsInline preload="metadata" className="w-full h-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} /> : <img src={r.url} alt={`Result ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />}</a> : null)}</div>}
              {s.error && <p className="text-sm" style={{ color: "var(--bad)" }}>{s.error}</p>}
              {s.note && !s.error && <p className="text-sm text-muted">{s.note}</p>}
              <div className="flex gap-3 flex-wrap items-center">
                {(s.status === "draft" || s.status === "failed") && <button className="btn sm" onClick={async () => { try { const n = await api<ShotItem>(`/api/shots/${s.id}`, "PATCH", { status: "queued" }); setShots((x) => x.map((y) => (y.id === s.id ? n : y))); } catch (err) { toast((err as Error).message); } }}>{s.status === "failed" ? "Retry" : "Shoot it"}</button>}
                {s.status === "done" && s.kind === "image" && s.results?.[0] && <button className="btn sm accent" onClick={async () => { try { const r = await api<{ shots: ShotItem[] }>("/api/shots", "POST", { brandId: brand.id, kind: "reel", spec: { ...sp, move: sp.move || "slow push-in toward the subject", act: sp.act || "breathes and barely moves" }, out: { aspect: "9:16", duration: 6, audio: true, model: "kling-o3" }, refs: s.refs, status: "queued", title: "Animated from image" }); setShots((x) => [...r.shots, ...x]); toast("Reel queued."); } catch (err) { toast((err as Error).message); } }}>Animate into a reel</button>}
                <button className="btn sm ghost" onClick={() => { setS((x) => ({ ...x, kind: s.kind, mode: gT && gB ? "both" : gB ? "bottom" : "top", v: { ...x.v, ...sp }, refs: (s.refs || []).filter((r) => r.role === "style").map((r) => r.moodId), garments: { top: s.refs?.find((r) => r.role === "garment-top")?.moodId || null, bottom: s.refs?.find((r) => r.role === "garment-bottom")?.moodId || null } })); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Load into builder</button>
                <DangerButton onConfirm={async () => { try { await api(`/api/shots/${s.id}`, "DELETE"); setShots((x) => x.filter((y) => y.id !== s.id)); } catch (err) { toast((err as Error).message); } }} />
              </div>
            </article>); })}
          {!shots.length && <div className="empty col-span-full">No shots yet. Build one above.</div>}
        </div>
      </div>
    </div>
  );
}
