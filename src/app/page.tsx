import Link from "next/link";
import { Plans } from "@/components/Plans";
import { ToastProvider } from "@/components/ui";
import { Logo } from "@/components/Icons";

const WALL = ["shots.ecu", "pose.hood", "lsrc.neon", "shots.ews", "ldir.side", "aes.cinematic", "pose.floor", "lens.uw", "lq.warm", "comp.negative", "aes.editorial", "ldir.rim", "pose.stride", "lsrc.fire", "comp.leading", "shots.worm", "aes.retro", "tex.cotton"];
const PRICE = process.env.NEXT_PUBLIC_PRICE || "from $29 / month";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line"><div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        <Logo />
        <nav className="flex gap-2"><Link className="btn ghost sm" href="/login">Sign in</Link><Link className="btn sm" href="/login?mode=signup">Get access</Link></nav>
      </div></header>
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
      <section className="mx-auto max-w-6xl px-4 pb-20 grid gap-6">
        <div><span className="lbl">Three offers</span><h2 className="text-3xl mt-1">Pick the size of your house</h2><p className="text-muted max-w-2xl mt-2">Every offer runs generations on your own Higgsfield key (top up from $5 at open.higgsfield.ai, no mark-up, failed generations are free). The offers differ by how many brands you run and whether you want the Reels and Reach rooms.</p></div>
        <ToastProvider><Plans mode="landing" /></ToastProvider>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20 grid gap-6">
        <div><span className="lbl">Questions</span><h2 className="text-3xl mt-1">Before you ask</h2></div>
        <div className="grid md:grid-cols-2 gap-3">
          {[["Do I need my own photographer or model?", "No. You upload the product photo (flat, on a hanger, anything). Atelier puts it on a house model you approve once, in your light, from any angle in the library."],
            ["What do generations cost?", "Whatever Higgsfield and Google charge, at cost: roughly $0.05–0.15 per image on Grok, about $0.13–0.24 on Nano Banana Pro (2K/4K), a few cents per second of video. You top up their balances directly; Atelier adds nothing on top."],
            ["Can I fix a small detail without starting over?", "Yes. Open any image, tap Refine, write the one thing to change (“remove the print on the knee”), and it re-renders with everything else identical, up to 4K."],
            ["Does the same face stay across the feed?", "Yes. A house model has a fixed DNA and an approved reference photo that rides along in every prompt."],
            ["Can I write the prompt myself?", "Freestyle mode is a blank page: your words, your references, your engine. Nothing is added."],
            ["Where do my images live?", "In your own private storage, with a download link for every file. Delete anything at any time."]].map(([q, a]) => <details key={q} className="card p-4"><summary className="font-semibold cursor-pointer">{q}</summary><p className="text-sm text-muted mt-2">{a}</p></details>)}
        </div>
      </section>
      <footer className="border-t border-line"><div className="mx-auto max-w-6xl px-4 py-8 flex items-center justify-between gap-4 flex-wrap"><Logo size={18} /><span className="lbl">Built for small fashion houses</span><div className="flex gap-4"><Link className="lbl" href="/login">Sign in</Link><a className="lbl" href="#plans">Offers</a></div></div></footer>
    </main>
  );
}
