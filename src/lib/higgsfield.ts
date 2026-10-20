/**
 * Higgsfield API client. Every call is made with the END USER's key, so generations
 * are billed to their prepaid Higgsfield balance, never to the app owner.
 * Docs: https://docs.higgsfield.ai
 */
const BASE = "https://api.higgsfield.ai";

export type HfKey = { id: string; secret: string };

/** Keys are pasted as "KEY_ID:KEY_SECRET" (how the console shows them). */
export function parseKey(raw: string): HfKey | null {
  const s = raw.trim();
  const i = s.indexOf(":");
  if (i < 1) return null;
  return { id: s.slice(0, i).trim(), secret: s.slice(i + 1).trim() };
}

function headers(k: HfKey, extra: Record<string, string> = {}) {
  return { Authorization: `Key ${k.id}:${k.secret}`, "Content-Type": "application/json", ...extra };
}

export class HfError extends Error {
  constructor(message: string, public status: number, public body?: unknown) { super(message); }
}

async function call<T>(k: HfKey, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, { ...init, headers: { ...headers(k), ...(init.headers as Record<string, string> | undefined) } });
  const text = await res.text();
  let body: unknown = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  if (!res.ok) {
    const msg = typeof body === "object" && body && "detail" in body ? JSON.stringify((body as { detail: unknown }).detail) : text.slice(0, 300);
    throw new HfError(`Higgsfield ${res.status}: ${msg}`, res.status, body);
  }
  return body as T;
}

/** Models the studio exposes, with the request each one expects. Only models with public API docs. */
export const IMAGE_MODELS = {
  "grok-image-2": {
    label: "Grok Image 2.0", path: "/xai/grok-imagine-image-2.0", refs: 10,
    aspects: ["1:1", "1:2", "2:1", "3:2", "2:3", "4:3", "3:4", "16:9", "9:16"],
    build: (p: { prompt: string; aspect: string; refs: string[]; quality?: "low" | "medium" }) => ({
      prompt: p.prompt, aspect_ratio: p.aspect, resolution: "2k", quality: p.quality ?? "medium", ...(p.refs.length ? { image_urls: p.refs.slice(0, 10) } : {}),
    }),
  },
  "qwen-image-3": {
    label: "Qwen Image 3 (edit)", path: "/alibaba/qwen-image-3/edit", refs: 3,
    aspects: ["1:1", "2:3", "3:2", "3:4", "4:3", "7:9", "9:7", "9:16", "16:9", "21:9"],
    build: (p: { prompt: string; aspect: string; refs: string[] }) => ({
      prompt: p.prompt, aspect_ratio: p.aspect, resolution: "2k", image_urls: p.refs.slice(0, 3), prompt_extend: false, enable_thinking: false,
    }),
  },
  "soul-2": {
    label: "Soul 2 (no references)", path: "/higgsfield-ai/soul/v2/standard", refs: 0,
    aspects: ["9:16", "16:9", "4:3", "3:4", "1:1", "2:3", "3:2"],
    build: (p: { prompt: string; aspect: string; refs: string[] }) => ({ prompt: p.prompt, aspect_ratio: p.aspect, resolution: "1080p", batch_size: 1 }),
  },
} as const;

export const VIDEO_MODELS = {
  "seedance-2.5": {
    label: "Seedance 2.5", path: "/bytedance/seedance-2.5/reference-to-video", refs: 30, min: 4, max: 30,
    aspects: ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"],
    build: (p: { prompt: string; aspect: string; refs: string[]; duration: number; audio: boolean }) => ({
      prompt: p.prompt, aspect_ratio: p.aspect, duration: Math.min(30, Math.max(4, Math.round(p.duration))), resolution: "720p", generate_audio: p.audio, image_urls: p.refs,
    }),
  },
  "kling-o3": {
    label: "Kling O3", path: "/kling-video/o3/image-reference", refs: 10, min: 3, max: 15,
    aspects: ["16:9", "9:16", "1:1"],
    build: (p: { prompt: string; aspect: string; refs: string[]; duration: number; audio: boolean }) => ({
      prompt: p.prompt.slice(0, 2500), aspect_ratio: p.aspect, duration: Math.min(15, Math.max(3, Math.round(p.duration))), mode: "std", sound: p.audio ? "on" : "off", ...(p.refs.length ? { image_urls: p.refs } : {}),
    }),
  },
} as const;

export type ImageModelId = keyof typeof IMAGE_MODELS;
export type VideoModelId = keyof typeof VIDEO_MODELS;

/** Map a studio aspect to the nearest one the model supports. */
export function nearestAspect(want: string, allowed: readonly string[]) {
  if (allowed.includes(want)) return want;
  const r = (a: string) => { const [w, h] = a.split(":").map(Number); return w / h; };
  const target = r(want);
  return [...allowed].sort((a, b) => Math.abs(r(a) - target) - Math.abs(r(b) - target))[0];
}

/** Upload bytes to Higgsfield's temporary file store and get a public URL usable as a reference. */
export async function uploadFile(k: HfKey, bytes: Uint8Array | Buffer, contentType: string): Promise<string> {
  const signed = await call<{ public_url: string; upload_url: string; upload_headers: Record<string, string> }>(k, "/files/generate-upload-url", {
    method: "POST", body: JSON.stringify({ content_type: contentType }),
  });
  const put = await fetch(signed.upload_url, { method: "PUT", headers: signed.upload_headers, body: new Uint8Array(bytes) });
  if (!put.ok) throw new HfError(`Upload failed (${put.status})`, put.status);
  return signed.public_url;
}

export type Submitted = { status: string; request_id: string; status_url: string; cancel_url: string };
export async function submit(k: HfKey, path: string, body: Record<string, unknown>, idempotencyKey: string): Promise<Submitted> {
  return call<Submitted>(k, path, { method: "POST", body: JSON.stringify(body), headers: { "Idempotency-Key": idempotencyKey } });
}

export type RequestStatus = {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "canceled";
  request_id: string; error?: string | null;
  images?: { url: string }[]; video?: { url: string }; audio?: { url: string };
};
export async function status(k: HfKey, requestId: string): Promise<RequestStatus> {
  return call<RequestStatus>(k, `/requests/${requestId}/status`, { method: "GET" });
}

/** Cheapest real call that proves a key works: list Soul styles. Nothing is generated or billed. */
export async function testKey(k: HfKey) {
  await call(k, "/v1/text2image/soul-styles/v2", { method: "GET" });
}
