import Link from "next/link";

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 grid gap-16">
      <header className="flex items-center justify-between">
        <div className="font-bold tracking-[.32em]">ATELIER</div>
        <nav className="flex gap-3"><Link className="btn ghost sm" href="/login">Sign in</Link><Link className="btn sm" href="/login?mode=signup">Start free</Link></nav>
      </header>
      <section className="grid gap-6 max-w-3xl">
        <span className="lbl">An AI content studio for fashion brands</span>
        <h1 className="text-4xl md:text-6xl leading-[1.05]">Your product photos, on a model, in your brand&rsquo;s light. Every shot and reel, from one studio.</h1>
        <p className="text-lg text-muted max-w-2xl">Atelier reads your brand into a bible, keeps a library of shots, light and camera moves, locks a house model so the same face runs across your feed, and turns a product photo into on-model images and reels. Generations run on your own Higgsfield balance, so you only pay for what you make.</p>
        <div className="flex gap-3 flex-wrap"><Link className="btn" href="/login?mode=signup">Start a 7-day trial</Link><a className="btn ghost" href="#how">How it works</a></div>
      </section>
      <section id="how" className="grid md:grid-cols-3 gap-px bg-line border border-line">
        {[["01 · The House", "Paste your website. Atelier writes the brand bible: story, voice, pillars, visual rules, eight hooks, and a quote bank. Add your moodboard."],
          ["02 · Shoot", "Drop the product photo of the top or the pants, pick the fit, pose, background and camera from the library, and queue it. Images or 9:16 reels."],
          ["03 · Reels & reach", "Write a direction, get three reel concepts with a hook, beats, camera lines and caption. Log results, get a plain-language post-mortem."]].map(([t, d]) => (
          <div key={t} className="bg-surface p-6 grid gap-2"><span className="lbl">{t}</span><p>{d}</p></div>
        ))}
      </section>
      <section className="grid md:grid-cols-2 gap-8 items-start">
        <div className="panel"><span className="lbl">Pricing</span><div className="text-3xl font-semibold">$39<span className="text-base text-muted"> / month</span></div><p>Unlimited brands, the full library, house models, reels drafting, post-mortems. 7-day free trial, cancel any time.</p><p className="text-muted text-sm">Generations are billed by Higgsfield to your own API balance at their published per-image and per-second rates. Atelier never marks them up.</p></div>
        <div className="grid gap-3"><span className="lbl">Why bring your own key</span><p>You top up a Higgsfield API balance from $5, paste the key once, and every image or reel is deducted at cost. No bundles, no credit packs, no surprise bills at month end. Failed generations are free.</p><p className="text-muted">Drafting, onboarding and post-mortems use Claude on our side and are included in the subscription.</p></div>
      </section>
      <footer className="lbl py-8">Atelier · built for small fashion houses</footer>
    </main>
  );
}
