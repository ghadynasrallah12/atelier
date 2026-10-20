import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireAccess } from "@/lib/supabase/server";
import { askJSON } from "@/lib/claude";
import type { Bible } from "@/lib/context";

const strip = (html: string) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

async function fetchPage(url: string) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; AtelierBot/1.0)" }, signal: AbortSignal.timeout(12000) });
    if (!r.ok) return { text: "", links: [] as string[] };
    const html = await r.text();
    const links = [...html.matchAll(/href="([^"#?]+)"/g)].map((m) => m[1]);
    return { text: strip(html).slice(0, 12000), links };
  } catch { return { text: "", links: [] as string[] }; }
}

/** Reads a brand's website into a bible with Claude, then creates the brand. */
export const POST = handler(async (req: Request) => {
  const { sb, user } = await requireAccess();
  const body = z.object({ website: z.string().optional(), name: z.string().optional(), notes: z.string().optional() }).parse(await req.json());
  let site = "", pages: string[] = [];
  let website = (body.website || "").trim();
  if (website && !/^https?:\/\//i.test(website)) website = "https://" + website;
  if (website) {
    const home = await fetchPage(website);
    site = home.text;
    const origin = new URL(website).origin;
    const about = [...new Set(home.links.filter((l) => /about|story|designer|brand|manifest|mission/i.test(l)).map((l) => (l.startsWith("http") ? l : origin + (l.startsWith("/") ? "" : "/") + l)).filter((l) => l.startsWith(origin)))].slice(0, 3);
    for (const u of about) { const p = await fetchPage(u); if (p.text) pages.push(`PAGE ${u}\n${p.text.slice(0, 6000)}`); }
  }
  if (!site && !body.notes && !body.name) return fail("Give a website, or a name and a few notes about the brand.");
  const prompt = `Read this brand and write its content bible for an AI content studio. Be specific and concrete; quote the brand's own words where they exist. If something is unknown, write a sensible best guess and mark it with "(guess)".

NAME HINT: ${body.name || "-"}
NOTES FROM THE OWNER: ${body.notes || "-"}
WEBSITE: ${website || "-"}
HOMEPAGE TEXT:
${site || "-"}
${pages.join("\n\n")}

Return JSON: {"name": brand name, "line": one-line descriptor (e.g. "a quiet premium streetwear house from Beirut"), "story": 3-5 sentences, "voice": tone of voice in 3-4 sentences, "audience": who it is for, "pillars": 4-6 content pillars one per line with a short dash description, "always": 4 rules one per line, "never": 4 rules one per line, "visual": visual rules in 4-6 sentences (settings, light, palette, silhouettes, branding placement, type, sound), "colors": [4-6 hex colours], "quotes": [{"text": a line from the site worth putting on screen, "source": where it came from}] up to 6, "hooks": [{"spoken": a Reel opening line using Context Lean → Scroll Stop → Contrarian Snapback, "visual": what plays under it, "text": 1-3 word caps text card, "pillar": pillar name}] exactly 8}`;
  const r = await askJSON<Bible & { name: string; quotes?: { text: string; source: string }[]; hooks?: { spoken: string; visual: string; text: string; pillar: string }[] }>(prompt, { maxTokens: 6000 });
  const bible: Bible = { line: r.line, story: r.story, voice: r.voice, audience: r.audience, pillars: r.pillars, always: r.always, never: r.never, visual: r.visual, colors: r.colors };
  const { data: brand, error } = await sb.from("brands").insert({ owner: user.id, name: body.name || r.name || "New brand", website: website || null, bible }).select("*").single();
  if (error || !brand) return fail(error?.message || "could not create brand", 500);
  if (r.quotes?.length) await sb.from("quotes").insert(r.quotes.slice(0, 6).map((q) => ({ brand_id: brand.id, text: q.text, source: q.source || "" })));
  if (r.hooks?.length) await sb.from("hooks").insert(r.hooks.slice(0, 8).map((h) => ({ brand_id: brand.id, spoken: h.spoken, visual: h.visual || "", text: (h.text || "").toUpperCase(), pillar: h.pillar || "" })));
  return json({ brand });
});
