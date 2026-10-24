import Link from "next/link";
import { requireBrand, requireProfile } from "@/lib/supabase/server";
import { loadMood, loadShots } from "@/lib/load";
import { I } from "@/components/Icons";

/** Brand overview: where things stand and what to do next. */
export default async function BrandIndex({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const { sb, brand } = await requireBrand(brandId);
  const { profile } = await requireProfile();
  const [mood, shots, { data: models }, { count: hooks }, { count: reels }, { data: ig }] = await Promise.all([
    loadMood(sb, brandId), loadShots(sb, brandId),
    sb.from("models").select("id,name,ref_mood_id").eq("brand_id", brandId),
    sb.from("hooks").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    sb.from("reels").select("id", { count: "exact", head: true }).eq("brand_id", brandId),
    sb.from("ig_accounts").select("username,followers").eq("brand_id", brandId).maybeSingle(),
  ]);
  const done = shots.filter((s) => s.status === "done" && s.results?.[0]?.url);
  const running = shots.filter((s) => s.status === "queued" || s.status === "generating").length;
  const garments = mood.filter((m) => m.garment).length, looks = mood.filter((m) => !m.garment && m.kind === "image").length;
  const bible = brand.bible || {};
  const steps: { ok: boolean; label: string; href: string; hint: string }[] = [
    { ok: !!profile.hf_key_hint, label: "Connect your Higgsfield key", href: "/settings", hint: "Generations run on your own balance." },
    { ok: !!bible.story, label: "Read the brand bible", href: `/b/${brandId}/house`, hint: "Written from your website. Edit anything." },
    { ok: garments > 0, label: "Upload a product photo", href: `/b/${brandId}/shoot`, hint: "A top or pants, flat or on a hanger." },
    { ok: (models || []).some((m) => m.ref_mood_id), label: "Approve a house model", href: `/b/${brandId}/models`, hint: "One face for the whole feed." },
    { ok: done.length > 0, label: "Shoot your first image", href: `/b/${brandId}/shoot`, hint: "Five steps, or freestyle." },
    { ok: !!ig, label: "Connect Instagram", href: `/b/${brandId}/reach`, hint: "See why each post reached." },
  ];
  const next = steps.find((s) => !s.ok);
  return (
    <div className="grid gap-8">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div><span className="lbl">Studio</span><h2 className="text-3xl">{brand.name}</h2>{bible.line && <p className="text-muted mt-1 max-w-[60ch]">{bible.line}</p>}</div>
        <div className="flex gap-2"><Link href={`/b/${brandId}/shoot`} className="btn accent">{I.shoot()} New shot</Link><Link href={`/b/${brandId}/gallery`} className="btn ghost">Gallery</Link></div>
      </div>
      {next && <div className="rule flex items-center justify-between gap-4 flex-wrap"><div><b>Next:</b> {next.label}. <span className="text-muted">{next.hint}</span></div><Link href={next.href} className="btn sm">Go</Link></div>}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-line border border-line rounded-xl overflow-hidden">
        {[["Generated", done.length, running ? `${running} running` : "images & reels"], ["Garments", garments, "product photos"], ["Looks", looks, "moodboard"], ["Models", (models || []).length, (models || []).filter((m) => m.ref_mood_id).length + " with a face"], ["Hooks", hooks || 0, "in the bank"], ["Reels", reels || 0, "concepts"]].map(([l, v, s]) => <div key={l as string} className="bg-surface p-4 grid gap-0.5"><span className="lbl">{l as string}</span><div className="text-2xl font-semibold tabular-nums">{v as number}</div><span className="text-xs text-muted">{s as string}</span></div>)}
      </div>
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">
        <div className="grid gap-3">
          <div className="sechead"><h3 className="text-lg">Latest generations</h3><Link href={`/b/${brandId}/gallery`} className="lbl">All →</Link></div>
          {done.length ? <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{done.slice(0, 10).map((s) => { const r = s.results.find((x) => x.url)!; return <Link key={s.id} href={`/b/${brandId}/gallery`} className="block bg-sunk rounded-lg overflow-hidden border border-line" style={{ aspectRatio: s.kind === "reel" ? "9/16" : "4/5" }}>{s.kind === "reel" ? <video src={r.url} muted playsInline preload="metadata" className="w-full h-full object-cover" /> : <img src={r.url} alt="" className="w-full h-full object-cover" loading="lazy" />}</Link>; })}</div> : <div className="empty">Nothing generated yet. <Link className="underline" href={`/b/${brandId}/shoot`}>Shoot the first one.</Link></div>}
        </div>
        <div className="grid gap-3">
          <div className="card p-4 grid gap-3"><span className="lbl">Setup</span><ul className="grid gap-2 text-sm">{steps.map((s) => <li key={s.label} className="flex gap-2 items-start"><span className="w-5 h-5 rounded-full grid place-items-center text-[11px] flex-none" style={{ background: s.ok ? "var(--accent)" : "var(--raise)", color: s.ok ? "var(--accent-ink)" : "var(--muted)" }}>{s.ok ? "✓" : ""}</span><Link href={s.href} className={s.ok ? "text-muted line-through" : ""}>{s.label}</Link></li>)}</ul></div>
          {(models || []).length > 0 && <div className="card p-4 grid gap-2"><span className="lbl">House models</span><div className="flex gap-2 flex-wrap">{(models || []).map((m) => { const ref = mood.find((x) => x.id === m.ref_mood_id); return <Link key={m.id} href={`/b/${brandId}/models`} className="grid justify-items-center gap-1 text-center">{ref?.url ? <img src={ref.url} alt="" className="w-14 h-14 rounded-full object-cover border border-line" /> : <span className="w-14 h-14 rounded-full bg-sunk grid place-items-center lbl">?</span>}<span className="text-xs max-w-[64px] truncate">{m.name}</span></Link>; })}</div></div>}
          {ig && <div className="card p-4 grid gap-1"><span className="lbl">Instagram</span><div className="font-semibold">@{ig.username}</div><div className="text-xs text-muted">{ig.followers?.toLocaleString()} followers</div></div>}
        </div>
      </div>
    </div>
  );
}
