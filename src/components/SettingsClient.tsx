"use client";
import { useState } from "react";
import { api, useToast, DangerButton } from "./ui";

type P = { email: string; plan: string; hint: string | null; hasCustomer: boolean; daysLeft: number; entitled: boolean; billing: boolean };

export function SettingsClient({ profile }: { profile: P }) {
  const [hint, setHint] = useState(profile.hint); const [key, setKey] = useState(""); const [busy, setBusy] = useState(false); const toast = useToast();
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await api<{ hint: string }>("/api/settings/key", "POST", { key }); setHint(r.hint); setKey(""); toast("Key verified and saved."); }
    catch (err) { toast((err as Error).message); } finally { setBusy(false); }
  }
  async function billing(path: string) { try { const { url } = await api<{ url: string }>(path, "POST"); location.href = url; } catch (err) { toast((err as Error).message); } }
  return (
    <div className="grid gap-10 max-w-3xl">
      <div><div className="sechead"><h2>Settings</h2><span className="lbl">{profile.email}</span></div></div>
      <section className="panel">
        <span className="lbl">Higgsfield API key · pays for your generations</span>
        <p className="text-sm">Create an API account at <a className="underline" href="https://open.higgsfield.ai" target="_blank" rel="noopener">open.higgsfield.ai</a>, top up a balance (from $5), create a key and paste it here as <code>KEY_ID:KEY_SECRET</code>. Each image or reel you queue is charged to that balance at Higgsfield&rsquo;s listed rate. The key is encrypted at rest and only used server-side.</p>
        {hint ? <div className="flex items-center gap-4 flex-wrap"><span className="pill" style={{ color: "var(--good)" }}>Connected · {hint}</span><DangerButton onConfirm={async () => { await api("/api/settings/key", "DELETE"); setHint(null); toast("Key removed."); }}>Remove key</DangerButton></div> : <span className="pill" style={{ color: "var(--warn)" }}>Not connected</span>}
        <form onSubmit={save} className="flex gap-2 flex-wrap">
          <input className="input flex-1 min-w-[240px]" value={key} onChange={(e) => setKey(e.target.value)} placeholder={hint ? "Paste a new key to replace it" : "KEY_ID:KEY_SECRET"} autoComplete="off" />
          <button className="btn" disabled={busy || key.length < 8}>{busy ? "Verifying…" : "Verify & save"}</button>
        </form>
        <p className="text-sm text-muted">Verifying makes one free read-only call to Higgsfield. Nothing is generated.</p>
      </section>
      <section className="panel">
        <span className="lbl">Subscription</span>
        {!profile.billing ? <p className="text-sm text-muted">Billing isn&rsquo;t configured on this deployment, so the studio is open.</p> : (
          <>
            <p>{profile.plan === "active" ? "Studio plan · active." : profile.plan === "trial" ? (profile.entitled ? `Free trial · ${profile.daysLeft} day${profile.daysLeft === 1 ? "" : "s"} left.` : "Your trial has ended.") : profile.plan === "past_due" ? "Payment failed. Update your card." : "Subscription canceled."}</p>
            <div className="flex gap-2 flex-wrap">
              {profile.plan !== "active" && <button className="btn accent" onClick={() => billing("/api/stripe/checkout")}>Subscribe · $39/month</button>}
              {profile.hasCustomer && <button className="btn ghost" onClick={() => billing("/api/stripe/portal")}>Manage billing</button>}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
