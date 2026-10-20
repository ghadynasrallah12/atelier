"use client";
import { useState } from "react";
import { api, useToast, DangerButton } from "./ui";

type P = { email: string; plan: string; hint: string | null; hasCustomer: boolean; daysLeft: number | null; entitled: boolean; billing: boolean; admin: boolean; price: string; until: string | null };

export function SettingsClient({ profile }: { profile: P }) {
  const [hint, setHint] = useState(profile.hint); const [key, setKey] = useState(""); const [busy, setBusy] = useState(false); const toast = useToast();
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await api<{ hint: string }>("/api/settings/key", "POST", { key }); setHint(r.hint); setKey(""); toast("Key verified and saved."); }
    catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  async function billing(path: string) { try { const { url } = await api<{ url: string }>(path, "POST"); location.href = url; } catch (err) { toast((err as Error).message); } }
  const steps = [["Access", profile.entitled, profile.admin ? "Admin" : profile.plan === "active" ? "Subscribed" : profile.entitled ? `${profile.daysLeft} days left` : "Locked"], ["Higgsfield key", !!hint, hint ? "Connected" : "Paste it below"], ["First brand", true, "Add it from Brands"]];
  return (
    <div className="grid gap-8 max-w-3xl">
      <div><div className="sechead"><h2>Settings</h2><span className="lbl">{profile.email}</span></div></div>
      <div className="grid grid-cols-3 gap-px bg-line border border-line rounded-xl overflow-hidden">{steps.map(([l, ok, s], i) => <div key={l as string} className="bg-surface p-4 grid gap-1"><span className="lbl">{i + 1} · {l as string}</span><div className="font-semibold" style={{ color: ok ? "var(--good)" : "var(--warn)" }}>{s as string}</div></div>)}</div>

      <section className="panel">
        <span className="lbl">Higgsfield API key · pays for your generations</span>
        <p className="text-sm">1. Go to <a className="underline" href="https://open.higgsfield.ai" target="_blank" rel="noopener">open.higgsfield.ai</a> and sign in. &nbsp;2. Top up a balance (from $5). &nbsp;3. Create an API key and paste it here as <code className="font-mono text-xs">KEY_ID:KEY_SECRET</code>.</p>
        <p className="text-sm text-muted">Every image or reel you queue is charged to that balance at Higgsfield&rsquo;s listed rate, with no mark-up. The key is encrypted at rest and only ever used server-side. Failed generations aren&rsquo;t charged.</p>
        {hint ? <div className="flex items-center gap-4 flex-wrap"><span className="pill" style={{ color: "var(--good)" }}>Connected · {hint}</span><DangerButton onConfirm={async () => { await api("/api/settings/key", "DELETE"); setHint(null); toast("Key removed."); }}>Remove key</DangerButton></div> : <span className="pill" style={{ color: "var(--warn)" }}>Not connected</span>}
        <form onSubmit={save} className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-[240px]" value={key} onChange={(e) => setKey(e.target.value)} placeholder={hint ? "Paste a new key to replace it" : "KEY_ID:KEY_SECRET"} autoComplete="off" />
          <button className="btn" disabled={busy || key.length < 8}>{busy ? "Verifying…" : "Verify & save"}</button>
        </form>
      </section>

      <section className="panel">
        <span className="lbl">Membership · {profile.price}</span>
        <p className="text-sm">{profile.admin ? "You're the admin: the studio is always open for you." : profile.plan === "active" ? "Subscription active." : profile.entitled ? `Access open until ${profile.until ? new Date(profile.until).toLocaleDateString() : "—"} (${profile.daysLeft} days).` : "No access yet."}</p>
        <div className="flex gap-2 flex-wrap">
          {profile.billing && profile.plan !== "active" && !profile.admin && <button className="btn accent" onClick={() => billing("/api/stripe/checkout")}>Subscribe · {profile.price}</button>}
          {profile.billing && profile.hasCustomer && <button className="btn ghost" onClick={() => billing("/api/stripe/portal")}>Manage billing</button>}
        </div>
        <p className="text-sm text-muted">The membership covers the studio: the library, the shoot builder, Claude drafting and the Instagram reach reports. Your generations are separate and go straight to Higgsfield.</p>
      </section>
    </div>
  );
}
