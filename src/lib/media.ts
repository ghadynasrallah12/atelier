import { supabaseAdmin } from "./supabase/server";

const BUCKET = "media";

/** Stores bytes under the owner's folder so storage RLS lines up with the DB. */
export async function putMedia(ownerId: string, folder: string, filename: string, bytes: Uint8Array | ArrayBuffer | Buffer, contentType: string) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
  const path = `${ownerId}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(path, bytes, { contentType, upsert: false });
  if (error) throw new Error("storage: " + error.message);
  return path;
}

export async function signedUrl(path: string, seconds = 3600) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data) throw new Error("storage: " + (error?.message || "no url"));
  return data.signedUrl;
}

export async function signedUrls(paths: string[], seconds = 3600) {
  if (!paths.length) return {} as Record<string, string>;
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrls(paths, seconds);
  const out: Record<string, string> = {};
  (data || []).forEach((d) => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

export async function downloadMedia(path: string) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error("storage: " + (error?.message || "missing"));
  return { bytes: new Uint8Array(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
}

export async function removeMedia(paths: string[]) {
  if (paths.length) await supabaseAdmin().storage.from(BUCKET).remove(paths);
}
