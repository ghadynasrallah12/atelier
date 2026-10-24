"use client";
import { useEffect, useState } from "react";
import { api, useToast, DangerButton } from "./ui";
import type { ShotItem, MoodItem } from "@/lib/load";
import { IMAGE_MODELS } from "@/lib/higgsfield";
import { GOOGLE_IMAGE_MODELS, isGoogleModel } from "@/lib/google";

export type Pick = { shot: ShotItem; index: number };
const ENGINES: { id: string; label: string; google?: boolean }[] = [
  { id: "qwen-image-3", label: "Qwen Image 3 · edit (Higgsfield)" }, { id: "grok-image-2", label: "Grok Image 2.0 (Higgsfield)" },
  { id: "nano-banana-2", label: "Nano Banana 2.1 (Google)", google: true }, { id: "nano-banana-pro", label: "Nano Banana Pro · up to 4K (Google)", google: true },
];
export const ENGINE_LABEL: Record<string, string> = { ...Object.fromEntries(Object.entries(IMAGE_MODELS).map(([k, v]) => [k, v.label])), ...Object.fromEntries(Object.entries(GOOGLE_IMAGE_MODELS).map(([k, v]) => [k, v.label])), "seedance-2.5": "Seedance 2.5", "kling-o3": "Kling O3" };
export const STATUS_LABEL: Record<string, string> = { draft: "Draft", queued: "Queued", generating: "Generating", done: "Done", failed: "Failed" };
export const STATUS_COLOR: Record<string, string> = { draft: "var(--muted)", queued: "var(--olive)", generating: "var(--accent)", done: "var(--good)", failed: "var(--bad)" };

/** Downloads a stored result through the signed download route. */
export const downloadHref = (r: { path?: string }, name: string) => (r.path ? `/api/media/download?path=${encodeURIComponent(r.path)}&name=${encodeURIComponent(name)}` : "#");

/** One generated image/video tile with hover actions. */
export function ResultTile({ shot, index, onOpen, size = "md" }: { shot: ShotItem; index: number; onOpen: (p: Pick) => void; size?: "sm" | "md" }) {
  const r = shot.results[index]; if (!r?.url) return null;
  return (
    <div className={"group relative bg-sunk rounded-lg overflow-hidden border border-line " + (size === "sm" ? "" : "")} style={{ aspectRatio: shot.kind === "reel" ? "9/16" : String(shot.out?.aspect || "4:5").replace(":", "/") }}>
      <button type="button" className="absolute inset-0 w-full h-full" onClick={() => onOpen({ shot, index })} aria-label="Open">
        {shot.kind === "reel" ? <video src={r.url} muted loop playsInline preload="metadata" className="w-full h-full object-cover" onMouseEnter={(e) => e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} /> : <img src={r.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
      </button>
      {shot.favorite && <span className="absolute top-2 left-2 text-[12px]" style={{ color: "var(--accent)" }}>★</span>}
      {shot.mode === "refine" && <span className="absolute top-2 right-2 pill bg-bg/80" style={{ fontSize: 9 }}>refined</span>}
      <div className="absolute inset-x-0 bottom-0 p-2 flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/70 to-transparent pointer-events-none">
        <button type="button" className="btn sm pointer-events-auto" onClick={() => onOpen({ shot, index })}>Open</button>
      </div>
    </div>
  );
}

/** Fullscreen viewer with the whole action set. */
export function Lightbox({ pick, list, onClose, onChange, brandId, models, onShots, onMood }: { pick: Pick; list: Pick[]; onClose: () => void; onChange: (p: Pick) => void; brandId: string; models: { id: string; name: string }[]; onShots: (fn: (x: ShotItem[]) => ShotItem[]) => void; onMood?: (m: MoodItem) => void }) {
  const toast = useToast(); const [refine, setRefine] = useState(false); const [busy, setBusy] = useState("");
  const { shot, index } = pick; const r = shot.results[index];
  const i = list.findIndex((p) => p.shot.id === shot.id && p.index === index);
  const go = (d: number) => { const n = list[(i + d + list.length) % list.length]; if (n) { onChange(n); setRefine(false); } };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") go(1); if (e.key === "ArrowLeft") go(-1); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [i, list]);
  const sp = shot.spec || {};
  const modelName = sp.model?.startsWith("house:") ? models.find((m) => m.id === sp.model!.slice(6))?.name || "house model" : sp.model;
  async function fav() { try { const n = await api<ShotItem>(`/api/shots/${shot.id}`, "PATCH", { favorite: !shot.favorite }); onShots((x) => x.map((y) => (y.id === shot.id ? { ...y, favorite: n.favorite } : y))); onChange({ shot: { ...shot, favorite: n.favorite }, index }); } catch (err) { toast((err as Error).message); } }
  async function keep() { setBusy("keep"); try { const m = await api<MoodItem>("/api/shots/keep", "POST", { brandId, shotId: shot.id, index, note: shot.title || "Generated look" }); onMood?.(m); toast("Saved to the moodboard as a style reference."); } catch (err) { toast((err as Error).message); } finally { setBusy(""); } }
  const [anim, setAnim] = useState(false);
  async function animate(move: string, act: string, engine: string) { setBusy("anim"); try { const { shot: ns } = await api<{ shot: ShotItem }>("/api/shots/refine", "POST", { brandId, shotId: shot.id, index, kind: "reel", instruction: act, move, engine, duration: 6 }); onShots((x) => [ns, ...x]); toast("Reel queued: it starts from this exact image."); setAnim(false); } catch (err) { toast((err as Error).message); } finally { setBusy(""); } }
  if (!r?.url) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/92 backdrop-blur-sm grid md:grid-cols-[1fr_360px]" role="dialog" aria-modal>
      <div className="relative grid place-items-center p-4 min-h-0">
        {shot.kind === "reel" ? <video src={r.url} controls autoPlay loop playsInline className="max-h-[92vh] max-w-full rounded-lg" /> : <img src={r.url} alt="" className="max-h-[92vh] max-w-full object-contain rounded-lg" />}
        {list.length > 1 && <><button className="btn ghost sm absolute left-4 top-1/2 -translate-y-1/2" onClick={() => go(-1)} aria-label="Previous">←</button><button className="btn ghost sm absolute right-4 top-1/2 -translate-y-1/2" onClick={() => go(1)} aria-label="Next">→</button></>}
        <button className="btn ghost sm absolute top-4 left-4 md:hidden" onClick={onClose}>Close</button>
      </div>
      <aside className="bg-surface border-l border-line p-5 grid gap-4 content-start overflow-y-auto">
        <div className="flex justify-between items-start gap-2"><div><div className="lbl">{shot.kind === "reel" ? "Reel" : "Image"} · {ENGINE_LABEL[shot.hf_model || shot.out?.model as string] || shot.hf_model || "—"}{shot.out?.size ? ` · ${shot.out.size}` : ""}</div><div className="text-sm text-muted">{new Date(shot.created_at).toLocaleString()}</div></div><button className="btn ghost sm hidden md:inline-flex" onClick={onClose}>Close ✕</button></div>
        {shot.title && <div className="font-semibold">{shot.title}</div>}
        <div className="text-sm text-muted">{[modelName, sp.pose, sp.bg].filter(Boolean).join(" · ") || shot.note}</div>
        <div className="grid grid-cols-2 gap-2">
          <a className="btn sm" href={downloadHref(r, `atelier-${shot.id.slice(0, 8)}-${index + 1}`)}>Download</a>
          <button className={"btn sm " + (refine ? "accent" : "ghost")} onClick={() => setRefine(!refine)} disabled={shot.kind === "reel"}>Refine</button>
          <button className="btn sm ghost" onClick={fav}>{shot.favorite ? "★ Favorited" : "☆ Favorite"}</button>
          <button className="btn sm ghost" onClick={keep} disabled={busy === "keep" || shot.kind === "reel"}>Save to board</button>
          {shot.kind === "image" && <button className={"btn sm col-span-2 " + (anim ? "accent" : "ghost")} onClick={() => setAnim(!anim)} disabled={busy === "anim"}>Animate into a reel</button>}
        </div>
        {anim && <AnimatePanel busy={busy === "anim"} onGo={animate} />}
        {refine && <RefinePanel brandId={brandId} shot={shot} index={index} onDone={(s) => { onShots((x) => [s, ...x]); setRefine(false); onClose(); }} />}
        <details className="more"><summary>Prompt</summary><div className="prompt mt-2 max-h-64 overflow-y-auto">{shot.prompt}</div></details>
        {shot.refs?.length > 0 && <div className="lbl">References: {shot.refs.map((x, j) => `${j + 1} ${x.role.replace("garment-", "")}`).join(" · ")}</div>}
        <div className="pt-2 border-t border-line"><DangerButton onConfirm={async () => { try { await api(`/api/shots/${shot.id}`, "DELETE"); onShots((x) => x.filter((y) => y.id !== shot.id)); onClose(); } catch (err) { toast((err as Error).message); } }}>Delete this generation</DangerButton></div>
      </aside>
    </div>
  );
}

/** "Keep everything, change one thing." */
export function RefinePanel({ brandId, shot, index, onDone }: { brandId: string; shot: ShotItem; index: number; onDone: (s: ShotItem) => void }) {
  const toast = useToast(); const [text, setText] = useState(""); const [engine, setEngine] = useState("qwen-image-3"); const [size, setSize] = useState("2K"); const [keep, setKeep] = useState(true); const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try { const { shot: s } = await api<{ shot: ShotItem }>("/api/shots/refine", "POST", { brandId, shotId: shot.id, index, instruction: text, engine, keepRefs: keep, ...(isGoogleModel(engine) ? { size } : {}) }); toast("Refining on your balance. It appears in the queue."); onDone(s); }
    catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="panel bg-raise">
      <span className="lbl">Refine · keep everything, change one thing</span>
      <textarea className="input text-sm min-h-[90px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. remove the print on the right knee · make the T-shirt sleeves longer · close the mouth · swap the sneakers for black boots" autoFocus />
      <div className="grid grid-cols-2 gap-2">
        <label className="field"><span className="lbl">Engine</span><select className="input text-sm" value={engine} onChange={(e) => setEngine(e.target.value)}>{ENGINES.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}</select></label>
        {isGoogleModel(engine) && <label className="field"><span className="lbl">Resolution</span><select className="input text-sm" value={size} onChange={(e) => setSize(e.target.value)}>{GOOGLE_IMAGE_MODELS[engine].sizes.map((z) => <option key={z} value={z}>{z}</option>)}</select></label>}
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Re-attach the product and model references so the engine can check the details</label>
      <div className="flex gap-2 items-center"><button className="btn accent sm" disabled={busy || text.trim().length < 3} onClick={go}>{busy ? "Sending…" : "Refine"}</button><span className="text-xs text-muted">Tip: for a 4K master, pick Nano Banana Pro → 4K and write “no changes”.</span></div>
    </div>
  );
}

/** Turn one still into a 6-second reel that starts from that exact frame. */
export function AnimatePanel({ busy, onGo }: { busy: boolean; onGo: (move: string, act: string, engine: string) => void }) {
  const [move, setMove] = useState("slow push-in toward the subject"); const [act, setAct] = useState("breathes and barely moves"); const [engine, setEngine] = useState("kling-o3");
  const MOVES = ["static shot, locked camera", "slow push-in toward the subject", "slow pan left across the scene", "tracking shot following the subject from the side, smooth and steady", "slow tilt up from the shoes to the face", "very slow orbit around the subject", "steady controlled handheld"];
  const ACTS = ["breathes and barely moves", "turns slowly to face the camera", "lets the wind move the fabric", "looks up into the light", "adjusts the collar once", "turns away to show the back", "walks toward the camera"];
  return (
    <div className="panel bg-raise">
      <span className="lbl">Animate · starts from this exact image</span>
      <label className="field"><span className="lbl">Camera</span><select className="input text-sm" value={move} onChange={(e) => setMove(e.target.value)}>{MOVES.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label className="field"><span className="lbl">The model</span><select className="input text-sm" value={act} onChange={(e) => setAct(e.target.value)}>{ACTS.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
      <label className="field"><span className="lbl">Engine</span><select className="input text-sm" value={engine} onChange={(e) => setEngine(e.target.value)}><option value="kling-o3">Kling O3</option><option value="seedance-2.5">Seedance 2.5</option></select></label>
      <div><button className="btn accent sm" disabled={busy} onClick={() => onGo(move, act, engine)}>{busy ? "Sending…" : "Animate · 6 s"}</button></div>
    </div>
  );
}
