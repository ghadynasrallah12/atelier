import Link from "next/link";

const WALL = ["shots.ecu", "pose.hood", "lsrc.neon", "shots.ews", "ldir.side", "aes.cinematic", "pose.floor", "lens.uw", "lq.warm", "comp.negative", "aes.editorial", "ldir.rim", "pose.stride", "lsrc.fire", "comp.leading", "shots.worm", "aes.retro", "tex.cotton"];
const PRICE = process.env.NEXT_PUBLIC_PRICE || "$39 / month";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
        <div className="font-bold tracking-[.32em]">ATELIER</div>
        <nav className="flex gap-2"><Link className="btn ghost sm" href="/login">Sign in</Link><Link className="btn sm" href="/login?mode=signup">Get access</Link></nav>
      </header>
      <section className="glow">
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-10 grid gap-6 max-w-3xl">
          <span className="lbl">An AI content studio for fashion brands</span>
          <h1 className="text-4xl md:text-6xl leading-[1.04] font-semibold">Your product photo, on a model, in your brand&rsquo;s light.</h1>
          <p className="text-lg text-muted max-w-2xl">Atelier turns a flat photo of a tee or a pair of pants into on-model images and reels, keeps the same face across your feed, and connects to your Instagram to tell you why a post reached or didn&rsquo;t. You bring your own Higgsfield key, so every generation is at cost.</p>
          <div className="flex gap-3 flex-wrap"><Link className="btn accent" href="/login?mode=signup">Get access · {PRICE}</Link><a className="btn ghost" href="#inside">What&rsquo;s inside</a></div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-16"><div className="mosaic">{WALL.map((k) => <img key={k} src={`/library/${k}.webp`} alt="" loading="lazy" />)}</div><p className="lbl mt-3">One model, one outfit, one studio: 74 reference shots from the library. Every card shows what the word actually does.</p></div>
      </section>
      <section id="inside" className="mx-auto max-w-6xl px-4 py-16 grid md:grid-cols-3 gap-4">
        {[["01 · The House", "Paste your website. Atelier writes the brand bible: story, voice, pillars, visual rules, eight hooks, and a quote bank. Add your moodboard."],
          ["02 · Library", "Shot types, lenses, light, composition, materials, camera moves, aesthetics, poses. Each with a real reference photo or looping clip and the exact prompt line."],
          ["03 · Shoot", "Drop the product photo of the top or the pants, pick the fit, pose, background and camera, and queue it. Images or 9:16 reels, on your Higgsfield balance."],
          ["04 · Models", "Lock a house model with a fixed DNA so the same face runs across the whole feed."],
          ["05 · Reels", "Write a direction, get three reel concepts with a hook, beats, camera lines and caption. Generate the first beat, pre-score it."],
          ["06 · Reach", "Connect the brand's Instagram. Every post comes in with reach, views, saves and shares. Tap Why? and get the reason in plain words."]].map(([t, d]) => (
          <div key={t} className="panel"><span className="lbl">{t}</span><p className="text-sm text-muted">{d}</p></div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20 grid md:grid-cols-2 gap-6 items-start">
        <div className="panel"><span className="lbl">Membership</span><div className="text-3xl font-semibold">{PRICE}</div><p className="text-sm">Unlimited brands, the full library, house models, reels drafting, Instagram reach reports and post-mortems.</p><Link className="btn accent" href="/login?mode=signup">Get access</Link></div>
        <div className="panel"><span className="lbl">Generations · at cost</span><p className="text-sm">You top up a Higgsfield API balance from $5 at open.higgsfield.ai, paste the key once, and every image or reel is deducted at Higgsfield&rsquo;s published rate. No credit packs, no mark-up, failed generations are free.</p><p className="text-sm text-muted">Drafting, onboarding and reach reports use Claude on our side and are included.</p></div>
      </section>
      <footer className="mx-auto max-w-6xl px-4 py-8 lbl">Atelier · built for small fashion houses</footer>
    </main>
  );
}
