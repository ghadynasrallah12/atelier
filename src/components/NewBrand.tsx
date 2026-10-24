"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useToast } from "./ui";

export function NewBrand() {
  const [website, setWebsite] = useState(""); const [name, setName] = useState(""); const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false); const toast = useToast(); const router = useRouter();
  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const { brand } = await api<{ brand: { id: string } }>("/api/brands/onboard", "POST", { website, name, notes }); router.push(`/b/${brand.id}`); }
    catch (err) { toast((err as Error).message); setBusy(false); }
  }
  return (
    <form onSubmit={go} className="panel">
      <span className="lbl">New brand</span>
      <label className="field"><span className="lbl">Website</span><input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yourbrand.com" /></label>
      <label className="field"><span className="lbl">Name (optional)</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="field"><span className="lbl">Notes (optional)</span><textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything the site doesn't say: who it's for, the vibe, what to avoid" /></label>
      <button className="btn" disabled={busy || (!website && !name)}>{busy ? "Reading the brand… (30–60 s)" : "Create the studio"}</button>
      <p className="text-sm text-muted">Atelier reads the homepage and the about pages, then writes the bible, eight hooks and a quote bank. You can edit everything after.</p>
    </form>
  );
}
