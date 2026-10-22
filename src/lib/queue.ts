import { supabaseAdmin } from "./supabase/server";
import { decrypt } from "./crypto";
import { downloadMedia, putMedia } from "./media";
import { IMAGE_MODELS, VIDEO_MODELS, nearestAspect, parseKey, status as hfStatus, submit, uploadFile, HfError, type HfKey, type ImageModelId, type VideoModelId } from "./higgsfield";
import { GOOGLE_IMAGE_MODELS, isGoogleModel, submitGoogleImage, googleStatus, GgError } from "./google";

type ShotRow = {
  id: string; brand_id: string; kind: "image" | "reel"; prompt: string; refs: { moodId: string; role: string }[];
  out: { aspect?: string; count?: number; duration?: number; audio?: boolean; model?: string; size?: string };
  status: string; hf_request_id: string | null; hf_model: string | null; results: { path?: string; url?: string; type: string }[]; reel_id: string | null; example_for: string | null;
};

async function ownerKeys(brandId: string) {
  const sb = supabaseAdmin();
  const { data: brand } = await sb.from("brands").select("owner").eq("id", brandId).single();
  if (!brand) throw new Error("brand not found");
  const { data: prof } = await sb.from("profiles").select("hf_key_enc,gg_key_enc").eq("id", brand.owner).single();
  return { ownerId: brand.owner as string, hf: prof?.hf_key_enc ? decrypt(prof.hf_key_enc) : null, gg: prof?.gg_key_enc ? decrypt(prof.gg_key_enc) : null };
}
async function ownerKey(brandId: string): Promise<{ ownerId: string; key: HfKey }> {
  const k = await ownerKeys(brandId);
  if (!k.hf) throw new Error("No Higgsfield key on this account. Add it in Settings.");
  const key = parseKey(k.hf);
  if (!key) throw new Error("Stored Higgsfield key is malformed. Re-enter it in Settings.");
  return { ownerId: k.ownerId, key };
}
async function googleKey(brandId: string) {
  const k = await ownerKeys(brandId);
  if (!k.gg) throw new Error("Nano Banana runs on a Google AI key. Add it in Settings (free to create at aistudio.google.com).");
  return { ownerId: k.ownerId, key: k.gg };
}

/** Reference images as base64 for Google models. */
async function referenceData(refs: ShotRow["refs"]) {
  const sb = supabaseAdmin();
  const out: { data: string; mimeType: string }[] = [];
  for (const r of refs) {
    const { data: m } = await sb.from("mood").select("path").eq("id", r.moodId).single();
    if (!m?.path) continue;
    const { bytes, contentType } = await downloadMedia(m.path);
    out.push({ data: Buffer.from(bytes).toString("base64"), mimeType: /^image\/(jpeg|png|webp)$/.test(contentType) ? contentType : "image/png" });
  }
  return out;
}

/** Pushes the shot's reference images to Higgsfield's file store (public URLs the model can read). */
async function referenceUrls(key: HfKey, refs: ShotRow["refs"]) {
  const sb = supabaseAdmin();
  const urls: string[] = [];
  for (const r of refs) {
    const { data: m } = await sb.from("mood").select("path").eq("id", r.moodId).single();
    if (!m?.path) continue;
    const { bytes, contentType } = await downloadMedia(m.path);
    const ct = /^image\/(jpeg|jpg|png|webp|gif)$/.test(contentType) ? contentType : "image/png";
    urls.push(await uploadFile(key, bytes, ct));
  }
  return urls;
}

/** Submit one queued shot. Idempotent per shot id. */
export async function submitShot(shotId: string) {
  const sb = supabaseAdmin();
  const { data: shot } = await sb.from("shots").select("*").eq("id", shotId).single<ShotRow>();
  if (!shot) throw new Error("shot not found");
  if (shot.status !== "queued") return shot;
  if (shot.kind === "image" && isGoogleModel(shot.out.model)) {
    try {
      const { key } = await googleKey(shot.brand_id);
      const m = GOOGLE_IMAGE_MODELS[shot.out.model];
      const refs = await referenceData(shot.refs || []);
      const res = await submitGoogleImage(key, shot.out.model, { prompt: shot.prompt, aspect: nearestAspect(shot.out.aspect || "4:5", m.aspects), size: shot.out.size || m.sizes[m.sizes.length - 1], refs });
      const { data: updated } = await sb.from("shots").update({ status: "generating", hf_request_id: res.id, hf_status_url: null, hf_model: shot.out.model, error: null, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
      return updated!;
    } catch (e) {
      const msg = e instanceof GgError && (e.status === 429 || e.status === 402) ? "Google refused: quota or billing. Check billing on your Google AI key." : (e as Error).message;
      const { data: failed } = await sb.from("shots").update({ status: "failed", error: msg, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
      return failed!;
    }
  }
  try {
    const { key } = await ownerKey(shot.brand_id);
    const refs = await referenceUrls(key, shot.refs || []);
    let path: string, body: Record<string, unknown>, modelId: string;
    if (shot.kind === "reel") {
      modelId = (shot.out.model as VideoModelId) in VIDEO_MODELS ? (shot.out.model as VideoModelId) : "seedance-2.5";
      const m = VIDEO_MODELS[modelId as VideoModelId];
      if (!refs.length && modelId === "seedance-2.5") throw new Error("Seedance needs at least one reference image. Attach a garment, model or style reference, or pick Kling O3.");
      path = m.path;
      body = m.build({ prompt: shot.prompt, aspect: nearestAspect(shot.out.aspect || "9:16", m.aspects), refs, duration: shot.out.duration || 8, audio: shot.out.audio ?? true });
    } else {
      modelId = (shot.out.model as ImageModelId) in IMAGE_MODELS ? (shot.out.model as ImageModelId) : refs.length ? "grok-image-2" : "soul-2";
      const m = IMAGE_MODELS[modelId as ImageModelId];
      if (m.refs === 0 && refs.length) modelId = "grok-image-2";
      const mm = IMAGE_MODELS[modelId as ImageModelId];
      path = mm.path;
      body = mm.build({ prompt: shot.prompt, aspect: nearestAspect(shot.out.aspect || "4:5", mm.aspects), refs: refs.slice(0, mm.refs) });
    }
    const res = await submit(key, path, body, `atelier-${shot.id}`);
    const { data: updated } = await sb.from("shots").update({ status: "generating", hf_request_id: res.request_id, hf_status_url: res.status_url, hf_model: modelId, error: null, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
    return updated!;
  } catch (e) {
    const msg = e instanceof HfError && e.status === 402 ? "Your Higgsfield balance is empty. Top up at open.higgsfield.ai." : (e as Error).message;
    const { data: failed } = await sb.from("shots").update({ status: "failed", error: msg, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
    return failed!;
  }
}

/** Poll one generating shot; on completion copy the files into the user's storage. */
export async function syncShot(shotId: string) {
  const sb = supabaseAdmin();
  const { data: shot } = await sb.from("shots").select("*").eq("id", shotId).single<ShotRow>();
  if (!shot) throw new Error("shot not found");
  if (shot.status !== "generating" || !shot.hf_request_id) return shot;
  if (isGoogleModel(shot.hf_model)) {
    const { ownerId, key } = await googleKey(shot.brand_id);
    let st; try { st = await googleStatus(key, shot.hf_request_id); } catch { return shot; }
    if (st.status === "running") return shot;
    if (st.status === "failed") { const { data } = await sb.from("shots").update({ status: "failed", error: st.error, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>(); return data!; }
    const results: ShotRow["results"] = [];
    for (const im of st.images) { const ext = im.mimeType.includes("jpeg") ? "jpg" : im.mimeType.includes("webp") ? "webp" : "png"; results.push({ path: await putMedia(ownerId, `results/${shot.brand_id}`, `${shot.id}.${ext}`, im.bytes, im.mimeType), type: "image" }); }
    const { data } = await sb.from("shots").update({ status: "done", results, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
    return data!;
  }
  const { ownerId, key } = await ownerKey(shot.brand_id);
  let st;
  try { st = await hfStatus(key, shot.hf_request_id); } catch (e) { return shot; }
  if (st.status === "queued" || st.status === "in_progress") return shot;
  if (st.status !== "completed") {
    const msg = st.status === "nsfw" ? "Rejected by Higgsfield's content filter. Change the prompt or the references." : st.status === "canceled" ? "Canceled." : st.error || "Generation failed (not charged).";
    const { data } = await sb.from("shots").update({ status: "failed", error: msg, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
    return data!;
  }
  const files = shot.kind === "reel" ? (st.video?.url ? [{ url: st.video.url, type: "video" }] : []) : (st.images || []).map((i) => ({ url: i.url, type: "image" }));
  const results: ShotRow["results"] = [];
  for (const f of files) {
    try {
      const r = await fetch(f.url);
      const ct = r.headers.get("content-type") || (f.type === "video" ? "video/mp4" : "image/png");
      const ext = f.type === "video" ? "mp4" : ct.includes("jpeg") ? "jpg" : ct.includes("webp") ? "webp" : "png";
      const p = await putMedia(ownerId, `results/${shot.brand_id}`, `${shot.id}.${ext}`, await r.arrayBuffer(), ct);
      results.push({ path: p, type: f.type });
    } catch { results.push({ url: f.url, type: f.type }); }
  }
  const { data } = await sb.from("shots").update({ status: "done", results, updated_at: new Date().toISOString() }).eq("id", shot.id).select("*").single<ShotRow>();
  if (shot.reel_id && results[0]) {
    await sb.from("reels").update({ video: { path: results[0].path, url: results[0].url, shotId: shot.id }, status: "generated" }).eq("id", shot.reel_id).in("status", ["idea", "approved"]);
  }
  return data!;
}

/** Cron entry: submit everything queued, poll everything generating. Bounded per run. */
export async function runQueue(limit = 25) {
  const sb = supabaseAdmin();
  const { data: queued } = await sb.from("shots").select("id").eq("status", "queued").order("created_at").limit(limit);
  for (const s of queued || []) await submitShot(s.id).catch(() => {});
  const { data: gen } = await sb.from("shots").select("id").eq("status", "generating").order("updated_at").limit(limit);
  for (const s of gen || []) await syncShot(s.id).catch(() => {});
  return { submitted: queued?.length || 0, polled: gen?.length || 0 };
}
