"use client";
import { Plans } from "./Plans";

const TEASE = ["shots.ecu", "shots.ews", "ldir.side", "lsrc.neon", "pose.floor", "aes.cinematic", "lens.uw", "comp.negative", "lq.warm", "pose.hood", "ldir.rim", "aes.editorial"];

/** Shown in place of the studio when the account has no access: the three offers, paid by card or requested from the admin. */
export function Locked({ reason, requested, requestedTier, email, billing, contact }: { reason: string; requested: boolean; requestedTier?: string | null; email: string; billing?: boolean; contact?: string }) {
  return (
    <div className="grid gap-8 max-w-5xl">
      <div className="relative card glow">
        <div className="mosaic p-3 blur-lock" aria-hidden>{TEASE.map((k) => <img key={k} src={`/library/${k}.webp`} alt="" loading="lazy" />)}</div>
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="grid gap-2 text-center max-w-lg">
            <span className="lbl">Members only</span>
            <h2 className="text-3xl">Pick an offer to open the studio</h2>
            <p className="text-muted text-sm">{reason}</p>
            {requested && <span className="pill mx-auto" style={{ color: "var(--good)" }}>Access requested{requestedTier ? ` · ${requestedTier}` : ""} — this page unlocks by itself once approved</span>}
          </div>
        </div>
      </div>
      <Plans mode={billing ? "checkout" : "request"} requested={requested ? requestedTier || "atelier" : null} />
      <p className="text-xs text-muted">Signed in as {email}. {billing ? "Card payments are handled by Stripe; the studio opens the moment the payment goes through." : "After you request, we confirm the payment with you directly and open the studio."}{contact && <> Questions? <a className="underline" href={contact} target="_blank" rel="noopener">Message us</a>.</>}</p>
    </div>
  );
}
