"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, DangerButton } from "./ui";

type Hook = { id: string; spoken: string; visual: string; text: string; pillar: string; note: string };

export function Hooks({ brandId, hooks: h0, pillars }: { brandId: string; hooks: Hook[]; pillars: string[] }) {
  const sb = supabaseBrowser(); const toast = useToast(); const router = useRouter();
  const [hooks, setHooks] = useState(h0); const [spoken, setSpoken] = useState(""); const [visual, setVisual] = useState(""); const [text, setText] = useState(""); const [pillar, setPillar] = useState(pillars[0]); const [busy, setBusy] = useState(false);
  async function add(e: React.FormEvent) {
    e.preventDefault(); const { data, error } = await sb.from("hooks").insert({ brand_id: brandId, spoken, visual, text: text.toUpperCase(), pillar }).select("*").single();
    if (error) return toast(error.message); setHooks([...hooks, data]); setSpoken(""); setVisual(""); setText("");
  }
  async function more() { setBusy(true); try { const r = await api<{ hooks: Hook[] }>("/api/claude/hooks", "POST", { brandId }); setHooks([...hooks, ...r.hooks]); toast("5 hooks added."); } catch (err) { toast((err as Error).message); } finally { setBusy(false); } }
  function direction(h: Hook) {
    try { localStorage.setItem(`atelier-brief-${brandId}`, JSON.stringify({ title: h.text ? h.text[0] + h.text.slice(1).toLowerCase() : h.spoken.slice(0, 40), direction: `Open on the hook “${h.spoken}”. Visual under it: ${h.visual || "your call"}. Text card: ${h.text || "your call"}.`, hookId: h.id })); } catch { /* ignore */ }
    router.push(`/b/${brandId}/reels`);
  }
  return (
    <div className="grid gap-8">
      <div><div className="sechead"><h2>Hooks</h2><span className="lbl">{hooks.length} hooks</span></div>
        <p className="intro">The first 1.5 seconds. Each hook has three layers: the spoken or on-screen line, the visual under it, and the two-word text card.</p></div>
      <div className="grid md:grid-cols-3 gap-px bg-line border border-line rounded-xl overflow-hidden">
        {[["1 · Context lean", "Start inside their world", "A sentence they already agree with or recognise."], ["2 · Scroll stop", "Break the pattern", "A claim, a number or an image that doesn't fit."], ["3 · Contrarian snapback", "Promise the payoff", "Why they should stay to the end: the reveal, the meaning, the piece."]].map(([a, b, c]) => <div key={a} className="bg-surface p-4 grid gap-1"><span className="lbl">{a}</span><b>{b}</b><p className="text-sm text-muted">{c}</p></div>)}
      </div>
      <form onSubmit={add} className="panel max-w-3xl">
        <span className="lbl">Add a hook</span>
        <label className="field"><span className="lbl">Spoken / on-screen line</span><input value={spoken} onChange={(e) => setSpoken(e.target.value)} required /></label>
        <div className="grid md:grid-cols-2 gap-3"><label className="field"><span className="lbl">Visual hook</span><input value={visual} onChange={(e) => setVisual(e.target.value)} placeholder="What plays under it" /></label><label className="field"><span className="lbl">Text card</span><input value={text} onChange={(e) => setText(e.target.value)} placeholder="TWO WORDS" /></label></div>
        <div className="flex gap-3 flex-wrap items-center"><select className="input w-auto" value={pillar} onChange={(e) => setPillar(e.target.value)}>{pillars.map((p) => <option key={p}>{p}</option>)}</select><button className="btn">Add hook</button><button type="button" className="btn ghost" disabled={busy} onClick={more}>{busy ? "Writing…" : "Write 5 more"}</button></div>
      </form>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
        {hooks.map((h) => <article key={h.id} className="panel"><span className="lbl">{h.pillar}</span><div className="text-lg font-medium leading-tight">“{h.spoken}”</div>{h.visual && <div className="text-sm text-muted"><span className="lbl">Visual</span> {h.visual}</div>}{h.text && <div className="font-bold tracking-[.12em] uppercase text-xs bg-ink text-bg px-2.5 py-1.5 w-max max-w-full">{h.text}</div>}
          <div className="flex gap-3 flex-wrap"><button className="btn sm ghost" onClick={() => direction(h)}>Make a direction</button><DangerButton onConfirm={async () => { await sb.from("hooks").delete().eq("id", h.id); setHooks(hooks.filter((x) => x.id !== h.id)); }} /></div></article>)}
        {!hooks.length && <div className="empty col-span-full">No hooks yet.</div>}
      </div>
    </div>
  );
}
