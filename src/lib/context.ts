import type { SupabaseClient } from "@supabase/supabase-js";

export type Bible = { story?: string; voice?: string; audience?: string; pillars?: string; always?: string; never?: string; visual?: string; line?: string; colors?: string[] };

/** Everything Claude reads before writing for a brand. */
export async function brandContext(sb: SupabaseClient, brand: { id: string; name: string; website?: string | null; bible: Bible }) {
  const b = brand.bible || {};
  const [{ data: quotes }, { data: mood }, { data: models }, { data: hooks }, { data: tracks }] = await Promise.all([
    sb.from("quotes").select("text,source").eq("brand_id", brand.id),
    sb.from("mood").select("note,garment").eq("brand_id", brand.id),
    sb.from("models").select("name,dna").eq("brand_id", brand.id),
    sb.from("hooks").select("spoken,visual,text").eq("brand_id", brand.id),
    sb.from("tracks").select("title,note").eq("brand_id", brand.id),
  ]);
  return `BRAND: ${brand.name}${brand.website ? " (" + brand.website + ")" : ""}${b.line ? " — " + b.line : ""}
STORY: ${b.story || "-"}
VOICE: ${b.voice || "-"}
AUDIENCE: ${b.audience || "-"}
CONTENT PILLARS: ${b.pillars || "-"}
ALWAYS: ${b.always || "-"}
NEVER: ${b.never || "-"}
VISUAL RULES: ${b.visual || "-"}
HOUSE MODELS: ${(models || []).map((m) => m.name + ": " + m.dna).join(" | ") || "none"}
QUOTE BANK:
${(quotes || []).map((q) => "- " + q.text + (q.source ? " (" + q.source + ")" : "")).join("\n") || "- none"}
MOODBOARD NOTES:
${(mood || []).filter((m) => m.note && !m.garment).map((m) => "- " + m.note).join("\n") || "- none"}
HOOK BANK:
${(hooks || []).map((h) => "- " + h.spoken + " | visual: " + h.visual + " | text: " + h.text).join("\n") || "- none"}
SOUND BEDS: ${(tracks || []).map((t) => t.title + (t.note ? " (" + t.note + ")" : "")).join(", ") || "none"}`;
}

export const LIBRARY_RULES = `CAMERA RULES: one camera line per shot (static locked / slow push-in / pan / tracking / tilt up / aerial / slow orbit / steady handheld); static shots longest, tracking shorter; never two movements in one prompt. SHOT TYPES: extreme close-up, close-up, medium, full, long, extreme wide, over-the-shoulder, POV, bird's eye, worm's eye. LIGHT: always name source, direction, quality and temperature. AESTHETIC BASES: minimalist, editorial, cinematic, gritty, dreamy, retro.`;

export type ReelRow = { title: string; hook: string; live?: Record<string, number | string> | null; postmortem?: { keep?: string[]; change?: string[] } | null };
export function metrics(r: { live?: Record<string, number | string> | null }, followers?: number | null) {
  const L = r.live || {};
  const n = (k: string) => Number(L[k] || 0);
  const views = n("views"), reach = n("reach") || views, fol = n("followers") || followers || 0;
  const eng = n("likes") + n("comments") + n("shares") + n("saves");
  return { views, reach, er: reach ? eng / reach : null, shareRate: reach ? n("shares") / reach : null, saveRate: reach ? n("saves") / reach : null, watchPct: n("lengthSec") && n("avgWatch") ? Math.min(1, n("avgWatch") / n("lengthSec")) : null, multiple: fol && views ? views / fol : null, follows: n("follows") };
}
export const pct = (x: number | null) => (x == null || !isFinite(x) ? "—" : (x * 100).toFixed(x < 0.1 ? 1 : 0) + "%");
export function learnings(reels: ReelRow[], followers?: number | null) {
  const done = reels.filter((r) => r.live && Number(r.live.views));
  if (!done.length) return "No reels have results logged yet.";
  return done.sort((a, b) => Number(b.live!.views) - Number(a.live!.views)).slice(0, 8).map((r) => { const m = metrics(r, followers); return `- "${r.title}" | hook: ${r.hook} | views ${m.views}${m.multiple != null ? ` (${m.multiple.toFixed(1)}x followers)` : ""} | share ${pct(m.shareRate)} | save ${pct(m.saveRate)} | watch ${pct(m.watchPct)}${r.postmortem ? ` | keep: ${(r.postmortem.keep || []).join("; ")}; change: ${(r.postmortem.change || []).join("; ")}` : ""}`; }).join("\n");
}
