"use client";
import { useState } from "react";
import { api, useToast } from "./ui";

const TEASE = ["shots.ecu", "shots.ews", "ldir.side", "lsrc.neon", "pose.floor", "aes.cinematic", "lens.uw", "comp.negative", "lq.warm", "pose.hood", "ldir.rim", "aes.editorial"];

/** Shown in place of the studio when the account has no access. */
export function Locked({ reason, requested: r0, email, price, billing, contact }: { reason: string; requested: boolean; email: string; price?: string; billing?: boolean; contact?: string }) {
  const [requested, setRequested] = useState(r0); const [busy, setBusy] = useState(false); const toast = useToast();
  async function request() { setBusy(true); try { await api("/api/access/request", "POST"); setRequested(true); toast("Request sent."); } catch (err) { toast((err as Error).message); } finally { setBusy(false); } }
  async function subscribe() { setBusy(true); try { const { url } = await api<{ url: string }>("/api/stripe/checkout", "POST"); location.href = url; } catch (err) { toast((err as Error).message); setBusy(false); } }
  return (
    <div className="grid gap-8 max-w-5xl">
      <div className="relative card glow">
        <div className="mosaic p-3 blur-lock" aria-hidden>{TEASE.map((k) => <img key={k} src={`/library/${k}.webp`} alt="" loading="lazy" />)}</div>
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="panel max-w-md text-center bg-bg/90 backdrop-blur">
            <span className="lbl">Members only</span>
            <h2 className="text-2xl">The studio is locked</h2>
            <p className="text-muted text-sm">{reason}</p>
            <div className="grid gap-2 mt-2">
              {billing && <button className="btn accent" disabled={busy} onClick={subscribe}>Subscribe · {price}</button>}
              {requested ? <span className="pill mx-auto" style={{ color: "var(--good)" }}>Access requested</span> : <button className={"btn " + (billing ? "ghost" : "accent")} disabled={busy} onClick={request}>Request access{price && !billing ? ` · ${price}` : ""}</button>}
              {contact && <a className="btn ghost" href={contact} target="_blank" rel="noopener">Message us</a>}
            </div>
            <p className="text-xs text-muted">Signed in as {email}. {requested ? "You'll be let in as soon as it's approved; this page unlocks by itself." : "Generations are paid by you, directly to Higgsfield; the membership covers the studio."}</p>
          </div>
        </div>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {[["Library", "74 cards: shot types, lenses, light, composition, materials, camera moves, aesthetics, poses. Each with a real reference photo or clip and the exact prompt line."],
          ["Shoot", "Drop a product photo of the top or the pants, fill in fit, pose, background and camera, and get on-model images and 9:16 reels on your own Higgsfield balance."],
          ["Reach", "Connect the brand's Instagram. Every post comes in with its reach, saves and shares, and Atelier tells you why it travelled or didn't."]].map(([t, d]) => <div key={t} className="panel"><span className="lbl">{t}</span><p className="text-sm text-muted">{d}</p></div>)}
      </div>
    </div>
  );
}
