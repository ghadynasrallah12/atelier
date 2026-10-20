/** The art-director vocabulary. Every item has the line that goes into a prompt. */
export type LibItem = { k: string; name: string; line: string; eff: string; fit: "core" | "ok" | "off"; dur?: string; d: (string | number)[] };
export type LibSection = { title: string; note: string; items: LibItem[] };

export const LIB: Record<string, LibSection> = {
  shots: { title: "Shot types", note: "The camera is the viewer's point of view. Full shot, centered, with headroom is the safe default for fashion.", items: [
    { k: "ecu", name: "Extreme close-up", line: "extreme close-up", eff: "Ultra-tight: an eye, lips, a stitch, a logo. Intimacy and tension.", fit: "ok", d: ["frame", 30, 18, 60, 30] },
    { k: "cu", name: "Close-up", line: "close-up", eff: "Face and chest. Expression carries the frame.", fit: "ok", d: ["frame", 22, 6, 76, 60] },
    { k: "ms", name: "Medium shot", line: "medium shot, waist up", eff: "Waist up. Balance of emotion and context.", fit: "core", d: ["frame", 14, 2, 92, 105] },
    { k: "fs", name: "Full shot", line: "full shot, head to toe", eff: "Full body with a little environment. Shows the silhouette and the fit.", fit: "core", d: ["frame", 8, 0, 104, 200] },
    { k: "ls", name: "Long shot", line: "long shot, the figure small in the environment", eff: "Person small, environment dominates. Atmosphere.", fit: "core", d: ["small", 0.55] },
    { k: "ews", name: "Extreme wide", line: "extreme wide shot, the figure a dot in the landscape", eff: "The hero is a dot. Epic scale.", fit: "core", d: ["small", 0.3] },
    { k: "ots", name: "Over the shoulder", line: "over-the-shoulder shot from behind the model", eff: "From behind a character. Presence, cinematic.", fit: "ok", d: ["ots"] },
    { k: "pov", name: "POV", line: "first-person point-of-view shot", eff: "First person. Immersion: hands pulling on the hoodie, looking down at the shoes.", fit: "ok", d: ["pov"] },
    { k: "bird", name: "Bird's eye", line: "bird's-eye view from directly above", eff: "Top-down like a drone. Flat-lays and floors.", fit: "ok", d: ["bird"] },
    { k: "worm", name: "Worm's eye", line: "worm's-eye view from a low angle", eff: "From below. The subject looks powerful.", fit: "core", d: ["worm"] },
    { k: "dutch", name: "Dutch angle", line: "dutch angle, camera tilted", eff: "Tilted frame. Energy, instability. Use once per campaign at most.", fit: "off", d: ["dutch"] },
  ]},
  lens: { title: "Lens & focal length", note: "Focal length changes space, not just zoom. 35–50 mm for full shots, 85 mm for portraits.", items: [
    { k: "uw", name: "Ultra-wide · 14–24 mm", line: "14mm ultra-wide lens", eff: "Strong perspective, distortion, drama. Architecture and streets.", fit: "off", d: ["lens", 14] },
    { k: "wide", name: "Wide · 24–35 mm", line: "28mm wide lens", eff: "Lots of environment, dynamic. Street, floor-seated shots.", fit: "ok", d: ["lens", 28] },
    { k: "std", name: "Standard · 35–50 mm", line: "50mm lens, natural perspective", eff: "Human-eye look. Lookbook full shots.", fit: "core", d: ["lens", 50] },
    { k: "port", name: "Portrait · 85–135 mm", line: "85mm portrait lens, shallow depth of field", eff: "Compresses the background, isolates the subject.", fit: "core", d: ["lens", 85] },
    { k: "tele", name: "Telephoto · 200 mm+", line: "200mm telephoto lens, flat compressed background", eff: "Isolation, flat background.", fit: "ok", d: ["lens", 200] },
  ]},
  lsrc: { title: "Light · source", note: "Light is mood. Describe the source, the direction, the quality and the temperature, every time.", items: [
    { k: "natural", name: "Natural", line: "natural light from an overcast sky", eff: "Window or sun. Soft, realistic, alive.", fit: "core", d: ["src", "sun"] },
    { k: "strobe", name: "Studio strobes / softbox", line: "soft studio strobes through a large softbox", eff: "Controlled, clean, commercial.", fit: "core", d: ["src", "box"] },
    { k: "practical", name: "Practical lights", line: "practical lamps visible in frame", eff: "Visible lamps in frame. Realism, a lived-in room.", fit: "ok", d: ["src", "lamp"] },
    { k: "flash", name: "Hard direct flash", line: "hard on-camera flash", eff: "Candid, raw, Y2K. Night-out energy.", fit: "ok", d: ["src", "flash"] },
    { k: "neon", name: "Neon / LED", line: "neon and LED accents", eff: "Bright accents, futurism.", fit: "off", d: ["src", "neon"] },
    { k: "fire", name: "Candle / fire", line: "warm candlelight", eff: "Intimacy, warmth, mysticism.", fit: "ok", d: ["src", "fire"] },
  ]},
  ldir: { title: "Light · direction", note: "Top-down view: the camera at the bottom, the subject in the middle, the light where the sun is.", items: [
    { k: "front", name: "Front-lit", line: "front-lit", eff: "Flat, minimal shadows. Catalogue clean.", fit: "core", d: ["dir", 50, 82] },
    { k: "side", name: "Side-lit (Rembrandt)", line: "side-lit from camera left, Rembrandt shadow", eff: "Depth, drama, sculptural. Shows fabric texture.", fit: "core", d: ["dir", 10, 50] },
    { k: "back", name: "Backlit", line: "backlit, light wrapping the edges", eff: "Silhouette, halo.", fit: "core", d: ["dir", 50, 12] },
    { k: "rim", name: "Rim light", line: "rim light outlining the silhouette", eff: "Edge highlight that separates subject from background.", fit: "core", d: ["dir", 86, 16] },
    { k: "top", name: "Top light", line: "top light from directly above", eff: "Downward shadows, mystery.", fit: "ok", d: ["side", 50, 8] },
    { k: "under", name: "Under light", line: "light from below", eff: "Horror, surreal.", fit: "off", d: ["side", 50, 96] },
  ]},
  lq: { title: "Light · quality & temperature", note: "Quality is the size of the source. Temperature is the colour of it.", items: [
    { k: "soft", name: "Soft", line: "soft, wrapping light", eff: "Diffused, gentle, flattering.", fit: "core", d: ["q", "soft"] },
    { k: "diffused", name: "Diffused", line: "even diffused light", eff: "Even, clean, commercial. Overcast sky, big softbox.", fit: "core", d: ["q", "diff"] },
    { k: "hard", name: "Hard", line: "hard light with sharp shadows", eff: "Sharp shadows, drama, texture.", fit: "ok", d: ["q", "hard"] },
    { k: "warm", name: "Warm · 2700–3500 K", line: "warm 3200K tone", eff: "Cosy, nostalgic. Golden hour.", fit: "ok", d: ["temp", "#C98B4A"] },
    { k: "daylight", name: "Daylight · 5000–5600 K", line: "neutral daylight 5000K", eff: "Neutral, natural. Studio default.", fit: "core", d: ["temp", "#D9D2C4"] },
    { k: "cool", name: "Cool · 6000–7000 K", line: "cool 6500K tone", eff: "Cold, distant. Fog, overcast.", fit: "core", d: ["temp", "#8FA5B5"] },
  ]},
  comp: { title: "Composition", note: "Framing rules. Centered is formal and iconic; negative space is where the text lives.", items: [
    { k: "centered", name: "Centered", line: "centered symmetrical composition", eff: "Formal, iconic, minimal.", fit: "core", d: ["comp", "center"] },
    { k: "thirds", name: "Rule of thirds", line: "subject on the rule-of-thirds line", eff: "Balanced, natural. Landscape shots.", fit: "core", d: ["comp", "thirds"] },
    { k: "negative", name: "Negative space", line: "generous negative space around the subject", eff: "Emptiness for drama or on-screen text.", fit: "core", d: ["comp", "neg"] },
    { k: "leading", name: "Leading lines", line: "leading lines converging on the subject", eff: "Guide the eye. Corridors, streets.", fit: "ok", d: ["comp", "lines"] },
    { k: "layers", name: "Fore / mid / background", line: "layered foreground, midground and background", eff: "Depth. Something out of focus in front.", fit: "ok", d: ["comp", "layers"] },
    { k: "symmetry", name: "Symmetry", line: "strict symmetry", eff: "Harmony. Two models mirrored.", fit: "ok", d: ["comp", "sym"] },
  ]},
  tex: { title: "Materials & texture", note: "AI doesn't see like we do. Name the surface or it comes out plastic.", items: [
    { k: "cotton", name: "Heavyweight cotton", line: "100% premium heavyweight cotton, visibly weighty, realistic folds and natural drape", eff: "Tees, hoodies, sweats.", fit: "core", d: ["tex", "cotton"] },
    { k: "knit", name: "Ribbed knit", line: "chunky ribbed knit with visible rib texture", eff: "Knit sets.", fit: "core", d: ["tex", "knit"] },
    { k: "fleece", name: "Brushed fleece", line: "brushed fleece interior, matte cotton face", eff: "Hoodies and sweatpants.", fit: "core", d: ["tex", "fleece"] },
    { k: "concrete", name: "Micro-concrete floor", line: "matte beige micro-concrete floor, smooth minimal finish", eff: "The classic studio floor.", fit: "core", d: ["tex", "concrete"] },
    { k: "skin", name: "Real skin", line: "realistic skin with visible pores and natural imperfections", eff: "Kills the plastic look.", fit: "core", d: ["tex", "skin"] },
    { k: "suede", name: "Suede & leather", line: "worn suede with patina", eff: "Shoes, jackets.", fit: "ok", d: ["tex", "suede"] },
  ]},
  move: { title: "Camera movement", note: "One line = one movement = one shot. “Cinematic camera” is not an instruction. The more the camera moves, the shorter the shot.", items: [
    { k: "static", name: "Static · locked", line: "static shot, locked camera", eff: "Most stable. Portraits, products. Longest duration.", fit: "core", dur: "up to 10 s", d: ["mv", "static"] },
    { k: "push", name: "Slow push-in", line: "slow push-in toward the subject", eff: "Adds focus and tension. Keep it subtle and short.", fit: "core", dur: "5–8 s", d: ["mv", "push"] },
    { k: "pan", name: "Pan", line: "slow pan left across the scene", eff: "Reveals space. Simple subjects only.", fit: "ok", dur: "5–8 s", d: ["mv", "pan"] },
    { k: "track", name: "Tracking", line: "tracking shot following the subject from the side, smooth and steady", eff: "Camera follows the subject. Reliable and cinematic.", fit: "core", dur: "4–6 s", d: ["mv", "track"] },
    { k: "tilt", name: "Tilt up", line: "slow tilt up from the shoes to the face", eff: "Reveals the outfit bottom to top.", fit: "core", dur: "5–6 s", d: ["mv", "tilt"] },
    { k: "aerial", name: "Aerial", line: "aerial shot from above, slow and controlled", eff: "Scale and composition.", fit: "ok", dur: "5–8 s", d: ["mv", "aerial"] },
    { k: "orbit", name: "Orbit · careful", line: "very slow orbit around the subject", eff: "Hero moments only, and only slow. Fast orbit warps.", fit: "ok", dur: "3–5 s", d: ["mv", "orbit"] },
    { k: "handheld", name: "Handheld · careful", line: "steady controlled handheld", eff: "Realism, easily jitter. Say “steady”, never combine with another move.", fit: "ok", dur: "3–5 s", d: ["mv", "hand"] },
  ]},
  aes: { title: "Aesthetics", note: "Pick one base per piece. Minimalist sells premium; Editorial is the campaign; Cinematic tells the story; Gritty gives edge.", items: [
    { k: "minimal", name: "Minimalist", line: "minimalist aesthetic: neutral palette, negative space, soft diffused light", eff: "Clarity, trust, premium. Sell a piece.", fit: "core", d: ["aes", "minimal"] },
    { k: "editorial", name: "Editorial / Fashion", line: "editorial fashion aesthetic: studio light, bold pose, glossy textures", eff: "Luxury, confidence. Campaign hero shots.", fit: "core", d: ["aes", "editorial"] },
    { k: "cinematic", name: "Cinematic", line: "cinematic aesthetic: low-key, haze, shallow depth of field, filmic grade", eff: "Story, depth, emotion.", fit: "core", d: ["aes", "cinematic"] },
    { k: "gritty", name: "Gritty / Dark", line: "gritty aesthetic: high contrast, desaturated, harsh side light, urban texture", eff: "Edge, power, rebellion. Streetwear and night.", fit: "ok", d: ["aes", "gritty"] },
    { k: "dreamy", name: "Dreamy / Soft", line: "dreamy aesthetic: soft haze, bloom, pastel light", eff: "Gentle, nostalgic.", fit: "ok", d: ["aes", "dreamy"] },
    { k: "retro", name: "Retro / Vintage", line: "retro aesthetic: warm film tones, grain, slight softness", eff: "Memory, authenticity.", fit: "ok", d: ["aes", "retro"] },
    { k: "tech", name: "Futuristic / Tech", line: "futuristic aesthetic: neon rim, chrome, clean geometry", eff: "Innovation, speed.", fit: "off", d: ["aes", "tech"] },
  ]},
  pose: { title: "Poses", note: "What the body says. Stoic, back views and hands in pockets read premium.", items: [
    { k: "stand", name: "Standing, centered", line: "standing straight, centered, arms relaxed", eff: "Catalogue neutral. Shows the fit honestly.", fit: "core", d: ["pose", "stand"] },
    { k: "back", name: "Back to camera", line: "standing with the back to the camera", eff: "Back print reads first. Mystery over posing.", fit: "core", d: ["pose", "back"] },
    { k: "pockets", name: "Hands in pockets", line: "standing with both hands in the pockets", eff: "Relaxed authority.", fit: "core", d: ["pose", "pockets"] },
    { k: "threeq", name: "Three-quarter, looking away", line: "turned three-quarters, looking off frame", eff: "Candid, thoughtful.", fit: "core", d: ["pose", "threeq"] },
    { k: "stool", name: "Seated on a stool", line: "seated on a low stool, elbows on knees", eff: "Portrait energy, low angle works.", fit: "core", d: ["pose", "stool"] },
    { k: "floor", name: "Floor, knees up", line: "sitting on the floor, knees up, soles toward the camera", eff: "Streetwear classic. Shoes become the foreground.", fit: "core", d: ["pose", "floor"] },
    { k: "collar", name: "Adjusting the collar", line: "adjusting the collar with both hands, chin up", eff: "Strength, ritual. Low angle.", fit: "core", d: ["pose", "collar"] },
    { k: "hood", name: "Hood up", line: "hood up, hands in the pouch pocket", eff: "Armor. Knit and hoodies.", fit: "core", d: ["pose", "hood"] },
    { k: "bowed", name: "Head bowed", line: "head bowed, eyes down, hands in pockets", eff: "Humility, introspection.", fit: "core", d: ["pose", "bowed"] },
    { k: "walk", name: "Walking toward camera", line: "walking slowly toward the camera", eff: "Fabric moves. Reels.", fit: "core", d: ["pose", "walk"] },
    { k: "stride", name: "Mid-stride, profile", line: "mid-stride in side profile", eff: "Shows the leg silhouette: baggy, parachute, stacked.", fit: "ok", d: ["pose", "stride"] },
    { k: "lean", name: "Leaning on a wall", line: "leaning a shoulder against the wall", eff: "Street. Concrete and rooftops.", fit: "ok", d: ["pose", "lean"] },
    { k: "crouch", name: "Crouching", line: "crouching low on one knee", eff: "Low, grounded. Shoes and pants.", fit: "ok", d: ["pose", "crouch"] },
  ]},
};
export const LIB_ORDER = ["shots", "lens", "lsrc", "ldir", "lq", "comp", "tex", "move", "aes", "pose"] as const;
export const FIT_LABEL = { core: "Core", ok: "Sometimes", off: "Rarely" } as const;

export function tagOf(sec: string, k: string) {
  const p: Record<string, string> = { shots: "shot", lens: "lens", lsrc: "light.src", ldir: "light.dir", comp: "comp", tex: "tex", move: "move", aes: "aes", pose: "pose" };
  if (sec === "lq") return (["warm", "daylight", "cool"].includes(k) ? "temp" : "light.q") + "." + k;
  return p[sec] + "." + k;
}
/** Which builder slot a library section feeds. */
export function slotOf(sec: string, k: string) {
  if (sec === "lq") return ["warm", "daylight", "cool"].includes(k) ? "temp" : "lq";
  return ({ shots: "shot", lens: "lens", lsrc: "lsrc", ldir: "ldir", comp: "comp", tex: "tex", move: "move", aes: "aes", pose: "pose" } as Record<string, string>)[sec];
}

export const AES_DIALS = [["Palette", "Warm · human", 0.55, "Cool · tech"], ["Light", "Soft · premium", 0.2, "Hard · edgy"], ["Contrast", "Low · calm", 0.45, "High · dramatic"], ["Texture", "Clean · modern", 0.4, "Grain + haze · memory"], ["Composition", "Minimal · clarity", 0.1, "Busy · energy"], ["Motion", "Slow · cinematic", 0.15, "Fast cuts · hype"]] as const;
export const MATRIX = [["Sell a premium piece", "Trust + premium", "Minimalist / Editorial", "Neo-minimalism, Pastel editorial"], ["Brand film / story", "Emotion + depth", "Cinematic / Dreamy", "Film photography, Dark academia"], ["Streetwear / night / edge", "Power + rebellion", "Gritty / Dark", "Grunge revival, Indie sleaze"], ["Personal brand (founder on camera)", "Human + relatable", "Dreamy / Retro", "Film photography"], ["Nostalgia / memory", "Authenticity", "Retro / Vintage", "90s flash, Y2K"], ["Youth / playful", "Fun + energy", "Dreamy / Editorial", "Y2K, Barbiecore"], ["Explainer / how it's made", "Clarity", "Minimalist / Cinematic", "Brutalist minimalism"]] as const;
