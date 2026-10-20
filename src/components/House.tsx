"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { api, useToast, DangerButton } from "./ui";
import type { MoodItem } from "@/lib/load";
import type { Bible } from "@/lib/context";
import { LIB, LIB_ORDER, tagOf } from "@/lib/library";

type Quote = { id: string; text: string; source: string };
const FIELDS: [keyof Bible, string][] = [["line", "One-line descriptor"], ["story", "The story"], ["voice", "Voice & tone"], ["audience", "Who it's for"], ["pillars", "Content pillars (one per line)"], ["always", "Always"], ["never", "Never"], ["visual", "Visual rules (settings, light, palette, silhouettes, branding, type, sound)"]];
const ALL_TAGS = LIB_ORDER.flatMap((s) => LIB[s].items.map((i) => ({ tag: tagOf(s, i.k), label: `${LIB[s].title.split(" ·")[0]}: ${i.name}` })));

export function House({ brand, quotes: q0, mood: m0 }: { brand: { id: string; name: string; website: string | null; bible: Bible }; quotes: Quote[]; mood: MoodItem[] }) {
  const sb = supabaseBrowser(); const toast = useToast();
  const [name, setName] = useState(brand.name); const [bible, setBible] = useState<Bible>(brand.bible); const [dirty, setDirty] = useState(false);
  const [quotes, setQuotes] = useState(q0); const [qt, setQt] = useState(""); const [qs, setQs] = useState("");
  const [mood, setMood] = useState(m0); const [note, setNote] = useState(""); const [url, setUrl] = useState(""); const [tagFor, setTagFor] = useState<string | null>(null);

  async function saveBible() {
    const { error } = await sb.from("brands").update({ name, bible }).eq("id", brand.id);
    toast(error ? error.message : "Bible saved."); if (!error) setDirty(false);
  }
  async function addQuote(e: React.FormEvent) {
    e.preventDefault(); if (!qt.trim()) return;
    const { data, error } = await sb.from("quotes").insert({ brand_id: brand.id, text: qt.trim(), source: qs.trim() }).select("*").single();
    if (error) return toast(error.message); setQuotes([data, ...quotes]); setQt(""); setQs("");
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    for (const f of Array.from(files)) {
      const fd = new FormData(); fd.append("brandId", brand.id); fd.append("file", f);
      try { const m = await api<MoodItem>("/api/media", "POST", undefined, fd); setMood((x) => [m, ...x]); } catch (err) { toast((err as Error).message); }
    }
    toast("Moodboard updated.");
  }
  async function addLink(e: React.FormEvent) {
    e.preventDefault(); if (!note.trim()) return;
    let u = url.trim(); if (u && !/^https?:\/\//i.test(u)) u = "https://" + u;
    const { data, error } = await sb.from("mood").insert({ brand_id: brand.id, kind: "link", note: note.trim(), url: u || null }).select("*").single();
    if (error) return toast(error.message); setMood([data as MoodItem, ...mood]); setNote(""); setUrl("");
  }
  async function patchMood(id: string, patch: Partial<MoodItem>) {
    const { error } = await sb.from("mood").update(patch).eq("id", id);
    if (error) toast(error.message); else setMood((x) => x.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  async function delMood(m: MoodItem) {
    try { if (m.path) await api("/api/media", "DELETE", { id: m.id, brandId: brand.id }); else await sb.from("mood").delete().eq("id", m.id); setMood((x) => x.filter((y) => y.id !== m.id)); } catch (err) { toast((err as Error).message); }
  }

  return (
    <div className="grid gap-12">
      <section className="grid gap-5">
        <div className="sechead"><h2>Brand bible</h2><span className="lbl">{dirty ? "Unsaved changes" : "Saved"}</span></div>
        <p className="intro">Everything Atelier reads before writing a shot, a reel or a post-mortem. Edit freely.</p>
        <div className="grid md:grid-cols-2 gap-5">
          <label className="field"><span className="lbl">Brand name</span><input value={name} onChange={(e) => { setName(e.target.value); setDirty(true); }} /></label>
          {FIELDS.map(([k, l]) => (
            <label key={k} className={"field " + (["visual", "story"].includes(k) ? "md:col-span-2" : "")}><span className="lbl">{l}</span>
              {k === "line" ? <input value={bible[k] || ""} onChange={(e) => { setBible({ ...bible, [k]: e.target.value }); setDirty(true); }} /> : <textarea value={(bible[k] as string) || ""} onChange={(e) => { setBible({ ...bible, [k]: e.target.value }); setDirty(true); }} />}
            </label>
          ))}
        </div>
        <div><button className="btn" onClick={saveBible} disabled={!dirty}>Save bible</button></div>
      </section>

      <section className="grid gap-4">
        <div className="sechead"><h2>Quote bank</h2><span className="lbl">{quotes.length} lines</span></div>
        <form onSubmit={addQuote} className="grid md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
          <label className="field"><span className="lbl">Quote or line</span><input value={qt} onChange={(e) => setQt(e.target.value)} placeholder="A line for a reel or a caption" required /></label>
          <label className="field"><span className="lbl">Source</span><input value={qs} onChange={(e) => setQs(e.target.value)} /></label>
          <button className="btn">Add</button>
        </form>
        <div>{quotes.map((q) => <div key={q.id} className="flex justify-between gap-3 py-3 border-b border-line"><div><blockquote className="text-lg font-medium">{q.text}</blockquote>{q.source && <span className="lbl">{q.source}</span>}</div><DangerButton onConfirm={async () => { await sb.from("quotes").delete().eq("id", q.id); setQuotes(quotes.filter((x) => x.id !== q.id)); }}>Remove</DangerButton></div>)}
          {!quotes.length && <div className="empty">No lines yet.</div>}</div>
      </section>

      <section className="grid gap-4">
        <div className="sechead"><h2>Moodboard</h2><span className="lbl">{mood.length} references</span></div>
        <p className="intro">Reference images with a note on what to copy. Tag a reference with library items (a pose, a light, a shot) and it becomes the example on that library card and a style reference in the builder.</p>
        <div className="flex gap-3 flex-wrap items-center">
          <label className="btn" htmlFor="moodUp">Upload images</label><input id="moodUp" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={(e) => upload(e.target.files)} />
          <form onSubmit={addLink} className="flex gap-2 flex-wrap flex-1 min-w-[280px]"><input className="input flex-1 min-w-[120px]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link (optional)" /><input className="input flex-[2] min-w-[160px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you like about it" required /><button className="btn ghost">Add reference</button></form>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {mood.map((m) => (
            <div key={m.id} className="card grid min-w-0">
              {m.url && m.kind === "image" ? <img src={m.url} alt={m.note} className="w-full aspect-[4/5] object-cover bg-sunk" loading="lazy" /> : <div className="aspect-[4/5] p-3 bg-sunk grid content-between"><span className="lbl">Reference</span><p className="font-medium">{m.note}</p>{m.url && <a className="lbl" href={m.url} target="_blank" rel="noopener">Open ↗</a>}</div>}
              <div className="p-2 grid gap-1">
                {m.garment && <span className="lbl" style={{ color: "var(--accent)" }}>Garment · {m.garment_slot}</span>}
                {m.kind === "image" && <input className="bg-transparent border-0 border-b border-line text-sm py-1 w-full" defaultValue={m.note} placeholder="What you like here" onBlur={(e) => e.target.value !== m.note && patchMood(m.id, { note: e.target.value })} />}
                <div className="flex justify-between gap-2"><button className="linkbtn" onClick={() => setTagFor(tagFor === m.id ? null : m.id)}>{m.tags?.length ? `${m.tags.length} tags` : "Tag"}</button><DangerButton onConfirm={() => delMood(m)}>Remove</DangerButton></div>
                {tagFor === m.id && <select multiple className="input text-xs h-40" value={m.tags || []} onChange={(e) => patchMood(m.id, { tags: Array.from(e.target.selectedOptions).map((o) => o.value) })}>{ALL_TAGS.map((t) => <option key={t.tag} value={t.tag}>{t.label}</option>)}</select>}
              </div>
            </div>
          ))}
          {!mood.length && <div className="empty col-span-full">Nothing on the board yet. Upload the photos and campaigns that feel like the brand.</div>}
        </div>
      </section>
    </div>
  );
}
