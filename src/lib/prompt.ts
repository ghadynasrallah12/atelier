import { LIB } from "./library";

/** Builder slots. Garment type + colour + branding are only used when no product photo is attached. */
export type Spec = Partial<Record<SlotKey, string>>;
export type SlotKey = "model" | "expr" | "topFit" | "topColor" | "top" | "topBrand" | "botFit" | "botColor" | "bottom" | "botBrand" | "shoes" | "acc" | "pose" | "bg" | "shot" | "lens" | "angle" | "lsrc" | "ldir" | "lq" | "temp" | "comp" | "tex" | "aes" | "anchor" | "mood" | "move" | "act";

const COLORS = ["black", "washed black", "off-white", "cream", "mushroom-brown", "taupe", "olive", "heather grey", "white", "navy", "sand"];
const lines = (sec: string) => LIB[sec].items.map((i) => i.line);

export const SL: Record<SlotKey, { name: string; empty?: string; opts: string[] }> = {
  model: { name: "model", opts: ["young Black man with shoulder-length locs", "young Black man with an afro", "young man with a buzz cut", "young Mediterranean man with dark wavy hair", "young Arab man with a trimmed beard", "young European man with tousled brown hair", "young East Asian man with short hair", "young woman with a slicked-back bun", "young woman with long curly hair", "young woman wearing a hijab", "young woman with a blonde bob", "man and a woman, two models together"] },
  expr: { name: "expression", opts: ["stoic and expressionless", "calm, eyes soft", "head bowed, eyes down", "eyes closed", "looking off frame", "with a direct, intense gaze", "a small smile"] },
  topFit: { name: "top fit", opts: ["oversized", "boxy", "relaxed", "regular-fit", "fitted", "cropped"] },
  topColor: { name: "top colour", opts: COLORS },
  top: { name: "top", empty: "no top / your call", opts: ["heavyweight T-shirt", "long-sleeve tee", "hoodie", "zip hoodie", "crewneck sweatshirt", "crop top", "tank top", "ribbed knit hoodie", "knit sweater", "short-sleeve open shirt over a white tee", "overshirt", "bomber jacket", "track jacket", "denim jacket", "blazer", "dress"] },
  topBrand: { name: "top branding", opts: ["a small logo on the chest", "a large print on the back", "a script signature on the chest", "no visible logo"] },
  botFit: { name: "pants fit", opts: ["baggy", "wide-leg", "relaxed straight", "regular", "slim", "skinny", "stacked"] },
  botColor: { name: "pants colour", opts: COLORS },
  bottom: { name: "pants", empty: "no pants / your call", opts: ["sweatpants", "joggers with cuffs", "parachute pants", "pleated trousers", "elastic-waist trousers", "cargo pants", "jeans", "track pants", "knit pants", "shorts", "sweat shorts", "basketball shorts", "skirt"] },
  botBrand: { name: "pants branding", opts: ["a small logo at the hip", "no visible logo"] },
  shoes: { name: "shoes", opts: ["chunky white sneakers", "cream retro runners", "beige suede low-tops", "black leather sneakers", "minimal white sneakers", "grey suede sneakers", "slides with white socks", "black boots", "bare feet"] },
  acc: { name: "extras", opts: ["no accessories", "black wraparound sunglasses", "silver rings", "a thin silver chain", "a small stud earring", "a black beanie", "a cap", "a leather bag"] },
  pose: { name: "pose", opts: lines("pose") },
  bg: { name: "background", opts: ["a seamless grey studio with a matte beige micro-concrete floor", "a warm cream seamless backdrop", "a soft grey gradient backdrop", "a teal painted backdrop", "misty desert dunes under an overcast sky", "a white fog void", "an overcast empty beach", "a city rooftop at dusk", "a brutalist concrete building", "an empty city street at dawn", "a sunlit apartment with white walls"] },
  shot: { name: "shot", opts: lines("shots") }, lens: { name: "lens", opts: lines("lens") },
  angle: { name: "angle", opts: ["eye level", "slightly low angle", "low angle", "slightly high angle", "high angle"] },
  lsrc: { name: "light source", opts: lines("lsrc") }, ldir: { name: "light direction", opts: lines("ldir") },
  lq: { name: "light quality", opts: LIB.lq.items.filter((i) => ["soft", "diffused", "hard"].includes(i.k)).map((i) => i.line) },
  temp: { name: "temperature", opts: LIB.lq.items.filter((i) => ["warm", "daylight", "cool"].includes(i.k)).map((i) => i.line) },
  comp: { name: "composition", opts: lines("comp") }, tex: { name: "texture note", opts: lines("tex") }, aes: { name: "aesthetic", opts: lines("aes") },
  anchor: { name: "style anchor", opts: ["quiet luxury editorial (Fear of God)", "Dune's sandy monumentality", "Roger Deakins haze, muted palette", "Helmut Newton fashion rigour, in colour", "Jil Sander minimal campaign", "90s Calvin Klein campaign, in colour", "Zara lookbook, clean catalogue"] },
  mood: { name: "mood", opts: ["exclusivity, status, quiet power", "calm, reverent, light after darkness", "grounded, humble, resolute", "cold, lonely, cinematic", "warm, intimate, unhurried", "playful, young, effortless"] },
  move: { name: "camera", opts: lines("move") },
  act: { name: "action", opts: ["breathes and barely moves", "turns slowly to face the camera", "walks toward the camera", "lets the wind move the fabric", "looks up into the light", "adjusts the collar once", "turns away to show the back"] },
};
export const SCENE_KEYS: SlotKey[] = ["model", "expr", "topFit", "topColor", "top", "topBrand", "botFit", "botColor", "bottom", "botBrand", "shoes", "acc", "pose", "bg"];
export const CAM_KEYS: SlotKey[] = ["shot", "lens", "angle", "lsrc", "ldir", "lq", "temp", "comp", "tex", "aes", "anchor", "mood"];

/** One-tap camera + light looks. Each sets the whole camera row; the background is only suggested if empty. */
export const LOOKS: { id: string; name: string; blurb: string; cam: Spec; bg?: string }[] = [
  { id: "studio", name: "Studio clean", blurb: "Soft, centered, catalogue-premium. The safe default.", cam: { shot: "full shot, head to toe", lens: "50mm lens, natural perspective", angle: "eye level", lsrc: "soft studio strobes through a large softbox", ldir: "backlit, light wrapping the edges", lq: "soft, wrapping light", temp: "neutral daylight 5000K", comp: "centered symmetrical composition", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "minimalist aesthetic: neutral palette, negative space, soft diffused light", anchor: "quiet luxury editorial (Fear of God)", mood: "exclusivity, status, quiet power" }, bg: "a seamless grey studio with a matte beige micro-concrete floor" },
  { id: "editorial", name: "Editorial", blurb: "Hard side light, sculpted shadows, magazine finish.", cam: { shot: "full shot, head to toe", lens: "85mm portrait lens, shallow depth of field", angle: "slightly low angle", lsrc: "soft studio strobes through a large softbox", ldir: "side-lit from camera left, Rembrandt shadow", lq: "hard light with sharp shadows", temp: "neutral daylight 5000K", comp: "centered symmetrical composition", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "editorial fashion aesthetic: studio light, bold pose, glossy textures", anchor: "Helmut Newton fashion rigour, in colour", mood: "exclusivity, status, quiet power" }, bg: "a soft grey gradient backdrop" },
  { id: "night", name: "Cinematic night", blurb: "Low-key, haze, neon edges, filmic grade.", cam: { shot: "medium shot, waist up", lens: "50mm lens, natural perspective", angle: "eye level", lsrc: "neon and LED accents", ldir: "rim light outlining the silhouette", lq: "hard light with sharp shadows", temp: "cool 6500K tone", comp: "subject on the rule-of-thirds line", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "cinematic aesthetic: low-key, haze, shallow depth of field, filmic grade", anchor: "Roger Deakins haze, muted palette", mood: "cold, lonely, cinematic" }, bg: "an empty city street at dawn" },
  { id: "golden", name: "Golden hour", blurb: "Warm backlight, long shadows, soft and intimate.", cam: { shot: "full shot, head to toe", lens: "85mm portrait lens, shallow depth of field", angle: "eye level", lsrc: "natural light from an overcast sky", ldir: "backlit, light wrapping the edges", lq: "soft, wrapping light", temp: "warm 3200K tone", comp: "generous negative space around the subject", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "dreamy aesthetic: soft haze, bloom, pastel light", anchor: "Jil Sander minimal campaign", mood: "warm, intimate, unhurried" }, bg: "a city rooftop at dusk" },
  { id: "street", name: "Gritty street", blurb: "Flash, wide lens, concrete, high contrast.", cam: { shot: "full shot, head to toe", lens: "28mm wide lens", angle: "slightly low angle", lsrc: "hard on-camera flash", ldir: "front-lit", lq: "hard light with sharp shadows", temp: "neutral daylight 5000K", comp: "leading lines converging on the subject", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "gritty aesthetic: high contrast, desaturated, harsh side light, urban texture", anchor: "90s Calvin Klein campaign, in colour", mood: "grounded, humble, resolute" }, bg: "a brutalist concrete building" },
];

export const DEFAULT_CAM: Spec = { shot: "full shot, head to toe", lens: "50mm lens, natural perspective", angle: "eye level", lsrc: "soft studio strobes through a large softbox", ldir: "backlit, light wrapping the edges", lq: "soft, wrapping light", temp: "neutral daylight 5000K", comp: "centered symmetrical composition", tex: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", aes: "minimalist aesthetic: neutral palette, negative space, soft diffused light", anchor: "quiet luxury editorial (Fear of God)", mood: "exclusivity, status, quiet power" };

export type RefRole = "garment-top" | "garment-bottom" | "model" | "style";
export type Ref = { moodId: string; role: RefRole; note?: string };
export type HouseModel = { id: string; name: string; dna: string };

const art = (p: string) => (/^[aeiou]/i.test(p) ? "an " : "a ");

/** Builds the layered prompt. Image numbers refer to the order of `refs`. */
export function buildPrompt(spec: Spec, kind: "image" | "reel", out: { duration?: number }, refs: Ref[], models: HouseModel[], brandName: string, brandLine: string) {
  const autos: string[] = [];
  const g = (k: SlotKey) => { const x = (spec[k] || "").trim(); if (!x) autos.push(SL[k].name); return x; };
  const idx = (role: RefRole) => { const i = refs.findIndex((r) => r.role === role); return i < 0 ? 0 : i + 1; };
  const gi = idx("garment-top"), gb = idx("garment-bottom"), mi = idx("model");
  const mv = g("model"); let model = mv, dna = "";
  if (mv.startsWith("house:")) { const m = models.find((x) => x.id === mv.slice(6)); if (m) { model = m.name; dna = m.dna; } }
  const expr = g("expr"), po = g("pose"), bg = g("bg"), sh = g("shoes"), ac = g("acc");
  const t = (k: SlotKey) => (spec[k] || "").trim();
  const tf = t("topFit"), tc = t("topColor"), top = t("top"), tb = t("topBrand"), bf = t("botFit"), bc = t("botColor"), bot = t("bottom"), bb = t("botBrand");
  const shot = g("shot"), lens = g("lens"), angle = g("angle"), lsrc = g("lsrc"), ldir = g("ldir"), lq = g("lq"), temp = g("temp"), comp = g("comp"), tex = g("tex"), aes = g("aes"), anchor = g("anchor"), mood = g("mood");
  let topP = "", botP = "";
  if (gi) { topP = `the ${top || "top"} shown in image ${gi}, reproduced exactly (same cut, colour, fabric and any print or embroidery)${tf ? ", worn " + tf : ""}`; if (!tf) autos.push("top fit"); }
  else if (top) topP = art([tf, tc, top].filter(Boolean).join(" ")) + [tf, tc, top].filter(Boolean).join(" ") + (tb ? " with " + tb : "");
  else autos.push("top (your call)");
  if (gb) { botP = `the ${bot || "pants"} shown in image ${gb}, reproduced exactly (same cut, colour, fabric and any print or embroidery)${bf ? ", worn " + bf : ""}`; if (!bf) autos.push("pants fit"); }
  else if (bot) botP = [bf, bc, bot].filter(Boolean).join(" ") + (bb ? " with " + bb : "");
  else autos.push("pants (your call)");
  const wearing = [topP, botP].filter(Boolean).join(", and ") || "the brand's look";
  let s = (kind === "reel" ? "Ultra-realistic luxury fashion film" : "Ultra-realistic fashion editorial photograph") + ` for ${brandName}${brandLine ? ", " + brandLine : ""}.\n\n`;
  if (gi || gb) s += `GARMENTS: ${gi ? `image ${gi} is the top` : ""}${gi && gb ? "; " : ""}${gb ? `image ${gb} is the pants` : ""}. These are the products: copy them exactly, do not redesign them. Any logo, print or embroidery appears only where it sits on the product photo, at the same size, and nowhere else: never add, move, enlarge or repeat a print on another part of the garment.\n`;
  if (mi) s += `MODEL: image ${mi} is the model. Identity lock: the same exact person, same face, hair, skin tone and build.\n`;
  if (gi || gb || mi) s += "\n";
  s += `SUBJECT: ${dna ? dna + " " : model ? "A " + model : "A model"}${expr ? (dna ? "Expression: " + expr + ". " : ", " + expr + ", ") : dna ? "" : " "}${dna ? "Wearing " : "wearing "}${wearing}.${sh || ac ? ` On the feet, ${sh || "shoes that suit the look"}${ac ? "; " + ac : ""}.` : ""}${po ? ` The model is ${po}.` : ""}\n\n`;
  s += `CAMERA: ${[shot, comp, lens, angle ? "at " + angle : ""].filter(Boolean).join(", ") || "to be decided"}.\n`;
  s += `LIGHTING: ${[lsrc, ldir, lq, temp].filter(Boolean).join(", ") || "to be decided"}.\n`;
  s += `SETTING: ${bg || "to be decided"}.\n`;
  s += `MATERIALS: ${tex || "realistic fabric with natural drape"}; realistic skin with visible pores and natural imperfections; the garments drape as they would in real life on this body.\n`;
  s += `STYLE: ${[aes, anchor ? "inspired by " + anchor : ""].filter(Boolean).join("; ") || "to be decided"}.\nMOOD: ${mood || "to be decided"}.\n`;
  if (kind === "reel") { const cm = g("move"), ax = g("act"); s += `\nVIDEO: vertical 9:16, ${out.duration || 8} seconds, ${cm || "one camera line to be decided"}; the model ${ax || "moves subtly"}. One shot, one movement. Ambient sound only.\n`; }
  s += "\nUltra-detailed, sharp fabric texture, natural anatomy, correct hands, premium editorial finish. No text overlays, no logos beyond those on the garments shown, no props.";
  return { prompt: s, autos: [...new Set(autos)] };
}

/** Fill "your call" blanks from the brand's visual rules before sending to the model. */
export function fillBlanks(spec: Spec, brand: { visual?: string }, kind: "image" | "reel", has: { top: boolean; bottom: boolean } = { top: !!spec.top, bottom: !!spec.bottom }) {
  const out: Spec = { ...spec };
  const v = (brand.visual || "").toLowerCase();
  const prefer = (k: SlotKey, pick: string) => { if (!out[k]) out[k] = pick; };
  prefer("expr", "stoic and expressionless");
  // Shooting one piece only: keep the other half of the outfit plain so it never competes with the product.
  if (!has.bottom && !out.bottom) { out.bottom = "plain trousers in a neutral tone that do not compete with the top"; out.botFit = out.botFit || ""; out.botColor = ""; out.botBrand = ""; }
  if (!has.top && !out.top) { out.top = "plain T-shirt in a neutral tone that does not compete with the pants"; out.topFit = out.topFit || ""; out.topColor = ""; out.topBrand = ""; }
  prefer("shoes", "minimal white sneakers");
  prefer("acc", "no accessories");
  prefer("pose", "standing straight, centered, arms relaxed");
  prefer("bg", v.includes("dune") || v.includes("desert") ? "misty desert dunes under an overcast sky" : v.includes("fog") ? "a white fog void" : "a seamless grey studio with a matte beige micro-concrete floor");
  (Object.keys(DEFAULT_CAM) as SlotKey[]).forEach((k) => prefer(k, DEFAULT_CAM[k]!));
  if (v.includes("hard") || v.includes("flash")) out.lq = out.lq || "hard light with sharp shadows";
  if (kind === "reel") { prefer("move", "slow push-in toward the subject"); prefer("act", "breathes and barely moves"); }
  return out;
}
