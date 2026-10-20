"use client";
import { useState } from "react";
import Link from "next/link";
import { PLANS, type Tier } from "@/lib/plans";
import { api, useToast } from "./ui";

type Props = {
  /** "checkout" → Stripe; "request" → records the ask for the admin; "landing" → links to sign-up. */
  mode: "checkout" | "request" | "landing";
  current?: string | null;
  requested?: string | null;
  compact?: boolean;
};

export function Plans({ mode, current, requested: r0, compact }: Props) {
  const [requested, setRequested] = useState<string | null>(r0 || null); const [busy, setBusy] = useState<string | null>(null); const toast = useToast();
  async function pick(tier: Tier) {
    setBusy(tier);
    try {
      if (mode === "checkout") { const { url } = await api<{ url: string }>("/api/stripe/checkout", "POST", { tier }); location.href = url; return; }
      await api("/api/access/request", "POST", { tier }); setRequested(tier); toast("Request sent. You'll be let in once it's approved.");
    } catch (err) { toast((err as Error).message); } finally { setBusy(null); }
  }
  return (
    <div className="grid md:grid-cols-3 gap-4" id="plans">
      {PLANS.map((p) => { const on = current === p.id; return (
        <div key={p.id} className={"panel relative " + (p.popular ? "border-accent" : "")} style={p.popular ? { boxShadow: "0 0 0 1px var(--accent) inset" } : undefined}>
          {p.popular && <span className="absolute -top-3 left-4 pill bg-bg" style={{ color: "var(--accent)" }}>Most chosen</span>}
          <div className="flex items-baseline justify-between"><span className="lbl">{p.name}</span>{on && <span className="pill" style={{ color: "var(--good)" }}>Current</span>}</div>
          <div className="text-3xl font-semibold">${p.price}<span className="text-sm text-muted font-normal"> / month</span></div>
          <p className="text-sm text-muted">{p.tagline}</p>
          {!compact && <ul className="grid gap-1 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><span style={{ color: "var(--accent)" }}>✓</span><span>{f}</span></li>)}</ul>}
          <div className="mt-1">
            {mode === "landing" ? <Link className={"btn w-full " + (p.popular ? "accent" : "ghost")} href={`/login?mode=signup&plan=${p.id}`}>Choose {p.name}</Link>
              : on ? <span className="btn ghost w-full" aria-disabled>Your offer</span>
              : requested === p.id ? <span className="btn ghost w-full" aria-disabled>Requested ✓</span>
              : <button className={"btn w-full " + (p.popular ? "accent" : "ghost")} disabled={!!busy} onClick={() => pick(p.id)}>{busy === p.id ? "…" : mode === "checkout" ? `Subscribe · $${p.price}/mo` : `Request ${p.name}`}</button>}
          </div>
        </div>); })}
      <p className="md:col-span-3 text-xs text-muted">All offers: generations are billed by Higgsfield to your own API key at cost, no mark-up. Cancel any time.</p>
    </div>
  );
}
