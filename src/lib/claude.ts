import Anthropic from "@anthropic-ai/sdk";

const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

export async function ask(prompt: string, opts: { system?: string; maxTokens?: number; images?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" }[] } = {}) {
  const content: Anthropic.MessageParam["content"] = opts.images?.length
    ? [...opts.images.map((im) => ({ type: "image" as const, source: { type: "base64" as const, media_type: im.mediaType, data: im.data } })), { type: "text" as const, text: prompt }]
    : prompt;
  const res = await client().messages.create({
    model: MODEL(), max_tokens: opts.maxTokens ?? 4000, system: opts.system, messages: [{ role: "user", content }],
  });
  return res.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((c) => c.text).join("\n").trim();
}

/** Ask for JSON and parse it tolerantly (whole reply, a code fence, or first {…}/[…] span). */
export async function askJSON<T = unknown>(prompt: string, opts: Parameters<typeof ask>[1] = {}): Promise<T> {
  const text = await ask(prompt + "\n\nReply with only valid JSON, no commentary.", opts);
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [text, fence?.[1] ?? ""];
  const a = text.search(/[[{]/), b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) candidates.push(text.slice(a, b + 1));
  for (const c of candidates) { try { if (c.trim()) return JSON.parse(c) as T; } catch { /* next */ } }
  throw new Error("Claude did not return JSON");
}

export const SYSTEM_DIRECTOR = `You are the creative director of a small fashion content studio. You write for Instagram Reels and lookbook imagery.
Rules you always keep: one idea per piece; one camera line per shot (static, slow push-in, pan, tracking, tilt, aerial; never two movements in one shot); technical language over vague feelings (shot, lens, light source/direction/quality/temperature, materials, composition, style anchor, mood); every hook is Context Lean → Scroll Stop → Contrarian Snapback with a spoken line, a visual hook and a 1–3 word text card. Stay inside the brand's voice and its NEVER list.`;
