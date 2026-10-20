import type { SupabaseClient } from "@supabase/supabase-js";
import { signedUrls } from "./media";

export type MoodItem = { id: string; kind: string; path: string | null; url: string | null; note: string; garment: boolean; garment_slot: string | null; tags: string[]; created_at: string };

/** Mood rows with fresh signed URLs for the images. */
export async function loadMood(sb: SupabaseClient, brandId: string): Promise<MoodItem[]> {
  const { data } = await sb.from("mood").select("*").eq("brand_id", brandId).order("created_at", { ascending: false });
  const rows = (data || []) as MoodItem[];
  const urls = await signedUrls(rows.map((r) => r.path).filter(Boolean) as string[], 3600 * 6);
  return rows.map((r) => ({ ...r, url: r.path ? urls[r.path] || null : r.url }));
}

export type ShotItem = { id: string; kind: "image" | "reel"; title: string | null; spec: Record<string, string>; out: Record<string, unknown>; refs: { moodId: string; role: string; note?: string }[]; prompt: string; autos: string[]; status: string; example_for: string | null; reel_id: string | null; hf_model: string | null; results: { path?: string; url?: string; type: string }[]; note: string; error: string | null; created_at: string };

export async function loadShots(sb: SupabaseClient, brandId: string): Promise<ShotItem[]> {
  const { data } = await sb.from("shots").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(200);
  const rows = (data || []) as ShotItem[];
  const paths = rows.flatMap((r) => (r.results || []).map((x) => x.path).filter(Boolean) as string[]);
  const urls = await signedUrls(paths, 3600 * 6);
  return rows.map((r) => ({ ...r, results: (r.results || []).map((x) => ({ ...x, url: x.path ? urls[x.path] : x.url })) }));
}
