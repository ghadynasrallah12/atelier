"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LIB, LIB_ORDER, FIT_LABEL, AES_DIALS, MATRIX, tagOf, slotOf } from "@/lib/library";
import { diagram } from "@/lib/diagrams";
import { DEFAULT_CAM } from "@/lib/prompt";
import { api, useToast } from "./ui";

export function Library({ brandId, examples }: { brandId: string; examples: Record<string, { url: string; alt: string }[]> }) {
  const [sec, setSec] = useState<string>("shots"); const toast = useToast(); const router = useRouter();
  const S = LIB[sec];
  function use(slot: string, val: string) {
    try { const cur = JSON.parse(localStorage.getItem(`atelier-shot-${brandId}`) || "{}"); cur.v = { ...(cur.v || {}), [slot]: val }; localStorage.setItem(`atelier-shot-${brandId}`, JSON.stringify(cur)); } catch { /* ignore */ }
    toast("Set in the builder."); router.push(`/b/${brandId}/shoot`);
  }
  async function example(tag: string, slot: string, val: string, name: string) {
    try {
      const spec = { ...DEFAULT_CAM, top: "heavyweight T-shirt", topFit: "oversized", topColor: "cream", bottom: "elastic-waist trousers", botFit: "wide-leg", botColor: "taupe", pose: "standing straight, centered, arms relaxed", bg: "a seamless grey studio with a matte beige micro-concrete floor", [slot]: val };
      await api("/api/shots", "POST", { brandId, kind: slot === "move" ? "reel" : "image", spec, out: slot === "move" ? { aspect: "9:16", duration: 6 } : { aspect: "4:5", count: 1 }, refs: [], status: "queued", exampleFor: tag, title: "Library example · " + name });
      toast("Example queued on your Higgsfield balance. See the Shoot queue.");
    } catch (err) { toast((err as Error).message); }
  }
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>Library</h2><span className="lbl">The art director's vocabulary</span></div>
        <p className="intro">Shot, lens, light, composition, texture, camera, aesthetic, pose. Each card shows what it does, the exact line to put in a prompt, and your own images that already do it. “Use” drops it into the shoot builder; “Shoot example” generates one on your balance.</p>
        <div className="flex gap-2 flex-wrap mt-4">{LIB_ORDER.map((k) => <button key={k} className={"btn sm " + (sec === k ? "" : "ghost")} style={{ borderRadius: 20 }} onClick={() => setSec(k)}>{LIB[k].title}</button>)}</div></div>
      <div className="rule"><b>{S.title}.</b> {S.note}</div>
      {sec === "move" && <div className="rule" style={{ borderColor: "var(--bad)" }}><b>Three mistakes.</b> “Cinematic camera” is not an instruction. Two movements in one prompt cause jitter: split into two shots. No camera line means the model decides for you.</div>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
        {S.items.map((it) => { const tag = tagOf(sec, it.k), ex = examples[tag] || [], slot = slotOf(sec, it.k); return (
          <article key={it.k} className="bg-surface border border-line grid grid-rows-[auto_1fr_auto] min-w-0">
            <div className="diag h-[120px] grid place-items-center border-b border-line bg-sunk p-2" dangerouslySetInnerHTML={{ __html: diagram(it.d) }} />
            <div className="p-3 grid gap-1 content-start"><div className="flex justify-between gap-2 items-baseline"><h4 className="text-base">{it.name}</h4><span className="lbl" style={{ color: it.fit === "core" ? "var(--good)" : it.fit === "ok" ? "var(--warn)" : undefined }}>{FIT_LABEL[it.fit]}</span></div>
              <div className="text-sm text-muted">{it.eff}{it.dur && <span className="lbl"> · {it.dur}</span>}</div><div className="font-mono text-[11px]" style={{ color: "var(--accent)" }}>“{it.line}”</div></div>
            <div className="flex justify-between items-center gap-2 px-3 pb-3"><div className="flex gap-1">{ex.length ? ex.slice(0, 4).map((x, i) => <img key={i} src={x.url} alt={x.alt} title={x.alt} className="w-[30px] h-[38px] object-cover border border-line bg-sunk" loading="lazy" />) : <span className="lbl" style={{ fontSize: 10 }}>no example yet</span>}</div>
              <div className="flex gap-1"><button className="btn sm ghost" onClick={() => use(slot, it.line)}>Use</button>{!ex.length && <button className="btn sm" onClick={() => example(tag, slot, it.line, it.name)}>Shoot example</button>}</div></div>
          </article>); })}
      </div>
      {sec === "aes" && (<>
        <div className="sechead"><h3 className="text-lg">Style dials</h3><span className="lbl">Keep the look coherent</span></div>
        <div className="grid gap-2 max-w-2xl">{AES_DIALS.map(([n, l, v, r]) => <div key={n} className="grid grid-cols-[90px_1fr_1fr] gap-2 items-center text-sm"><span className="lbl">{n}</span><span className="text-muted">{l}</span><span className="text-muted text-right">{r}</span><div className="col-start-2 col-span-2 relative h-[2px] bg-line"><i className="absolute -top-1 w-2.5 h-2.5 rounded-full bg-accent -translate-x-1/2" style={{ left: `${v * 100}%` }} /></div></div>)}</div>
        <div className="sechead"><h3 className="text-lg">Goal → emotion → aesthetic</h3></div>
        <div className="overflow-x-auto border border-line"><table className="t min-w-[620px]"><thead><tr><th>Goal</th><th>Target emotion</th><th>Base aesthetic</th><th>Substyles</th></tr></thead><tbody>{MATRIX.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
        <div className="rule"><b>Prompt formula.</b> [Subject], [action]. Style: [base] + [substyle]. Palette: [3–5 colour words]. Lighting: [soft/hard + direction + contrast]. Composition: [centered / thirds / negative space]. Texture: [clean / grain / haze]. Camera: [lens + depth of field]. Mood: [2–3 words]. Post: [filmic / matte]. Negative: low-res, text, watermark, messy background.</div>
      </>)}
      {sec === "shots" && <div className="rule"><b>The three pillars.</b> Structure (camera, light, materials, composition) + Reference (photographers, campaigns, eras) + Vision (how the viewer should feel). Technical beats emotional: say “85 mm, f/1.4, soft side light, 3200 K”, not “moody”.</div>}
    </div>
  );
}
