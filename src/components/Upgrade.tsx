import Link from "next/link";
import { PLANS } from "@/lib/plans";

/** Shown in place of a room the current offer doesn't include. */
export function Upgrade({ room, tier }: { room: string; tier: string }) {
  const need = PLANS.find((p) => (room === "Reels" ? p.reels : p.reach))!;
  return (
    <div className="panel max-w-xl glow">
      <span className="lbl">{room} · not in {PLANS.find((p) => p.id === tier)?.name || "your"} </span>
      <h2 className="text-xl">{room === "Reels" ? "Reel concepts, pre-scores and post-mortems" : "Connect Instagram and learn why each post reached"}</h2>
      <p className="text-sm text-muted">{room} is part of the <b>{need.name}</b> offer (${need.price}/month) and up. Your generations stay on your own Higgsfield key either way.</p>
      <div><Link className="btn accent" href="/settings#plans">See the offers</Link></div>
    </div>
  );
}
