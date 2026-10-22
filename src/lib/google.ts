/**
 * Google Gemini image models (Nano Banana family) through the Interactions API, run in the background and polled.
 * Users bring their own key from aistudio.google.com; images are billed to them by Google.
 */
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const REV = "2026-05-20";

export const GOOGLE_IMAGE_MODELS = {
  "nano-banana-pro": { label: "Nano Banana Pro · up to 4K", model: "gemini-3-pro-image", sizes: ["1K", "2K", "4K"], refs: 14, aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] },
  "nano-banana-2": { label: "Nano Banana 2.1 · up to 2K", model: "gemini-nano-banana-2.1", sizes: ["1K", "2K"], refs: 10, aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"] },
} as const;
export type GoogleImageModelId = keyof typeof GOOGLE_IMAGE_MODELS;
export const isGoogleModel = (id?: string | null): id is GoogleImageModelId => !!id && id in GOOGLE_IMAGE_MODELS;

export class GgError extends Error { constructor(msg: string, public status: number) { super(msg); } }

async function call<T>(key: string, path: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(BASE + path, { ...init, headers: { "x-goog-api-key": key, "content-type": "application/json", "Api-Revision": REV, ...(init.headers || {}) }, signal: AbortSignal.timeout(30000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new GgError((data as { error?: { message?: string } }).error?.message || `Google ${r.status}`, r.status);
  return data as T;
}

/** Free read-only call to check the key works. */
export async function testGoogleKey(key: string) {
  await call(key, "/models?pageSize=1", { method: "GET" });
}

/** Starts a background image generation. Returns the interaction id to poll. */
export async function submitGoogleImage(key: string, modelId: GoogleImageModelId, p: { prompt: string; aspect: string; size: string; refs: { data: string; mimeType: string }[] }) {
  const m = GOOGLE_IMAGE_MODELS[modelId];
  const size = (m.sizes as readonly string[]).includes(p.size) ? p.size : m.sizes[m.sizes.length - 1];
  const input: unknown[] = [...p.refs.slice(0, m.refs).map((r) => ({ type: "image", mime_type: r.mimeType, data: r.data })), { type: "text", text: p.prompt }];
  const res = await call<{ id: string; status: string }>(key, "/interactions", {
    method: "POST",
    body: JSON.stringify({ model: m.model, input, background: true, response_format: { type: "image", aspect_ratio: p.aspect, image_size: size, mime_type: "image/png" } }),
  });
  return res;
}

type Interaction = { id: string; status: string; steps?: { type: string; content?: { type: string; data?: string; mime_type?: string; text?: string }[] }[]; errors?: { code?: string; message?: string }[] };

/** Polls an interaction. On completion returns the generated images as bytes. */
export async function googleStatus(key: string, id: string): Promise<{ status: "running" | "completed" | "failed"; images: { bytes: Buffer; mimeType: string }[]; error?: string }> {
  const it = await call<Interaction>(key, `/interactions/${id}`, { method: "GET" });
  if (["queued", "in_progress", "requires_action"].includes(it.status)) return { status: "running", images: [] };
  if (it.status !== "completed") return { status: "failed", images: [], error: it.errors?.[0]?.message || `Google: ${it.status}` };
  const images: { bytes: Buffer; mimeType: string }[] = [];
  for (const s of it.steps || []) if (s.type === "model_output") for (const c of s.content || []) if (c.type === "image" && c.data) images.push({ bytes: Buffer.from(c.data, "base64"), mimeType: c.mime_type || "image/png" });
  if (!images.length) return { status: "failed", images: [], error: "Google returned no image (often the safety filter). Change the prompt or the references." };
  return { status: "completed", images };
}
