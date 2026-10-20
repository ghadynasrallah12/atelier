/**
 * Instagram API with Instagram Login (professional accounts, no Facebook Page needed).
 * Docs: developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 * Needs a Meta app with the "Instagram" product: INSTAGRAM_APP_ID + INSTAGRAM_APP_SECRET.
 */
import { createHmac, timingSafeEqual } from "crypto";

const G = "https://graph.instagram.com/v21.0";
export const igEnabled = () => !!process.env.INSTAGRAM_APP_ID && !!process.env.INSTAGRAM_APP_SECRET;
export const SCOPES = ["instagram_business_basic", "instagram_business_manage_insights"];
export const redirectUri = () => `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/instagram/callback`;

/** Signed state so the callback can trust which brand/user started the flow. */
export function signState(payload: Record<string, string>) {
  const body = Buffer.from(JSON.stringify({ ...payload, t: Date.now() })).toString("base64url");
  const sig = createHmac("sha256", process.env.APP_SECRET || "").update(body).digest("base64url");
  return `${body}.${sig}`;
}
export function readState(state: string): Record<string, string> | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const want = createHmac("sha256", process.env.APP_SECRET || "").update(body).digest("base64url");
  if (want.length !== sig.length || !timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  const p = JSON.parse(Buffer.from(body, "base64url").toString()) as Record<string, string> & { t: number };
  if (Date.now() - Number(p.t) > 15 * 60 * 1000) return null;
  return p;
}

export function authorizeUrl(state: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", process.env.INSTAGRAM_APP_ID!);
  u.searchParams.set("redirect_uri", redirectUri());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data as { error?: { message?: string } }).error?.message || `Instagram ${r.status}`);
  return data as T;
}

/** code → short-lived token → long-lived token (60 days). */
export async function exchangeCode(code: string) {
  const form = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID!, client_secret: process.env.INSTAGRAM_APP_SECRET!, grant_type: "authorization_code", redirect_uri: redirectUri(), code });
  const r = await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form });
  const short = (await r.json()) as { access_token?: string; user_id?: string; error_message?: string; error?: { message?: string } };
  if (!short.access_token) throw new Error(short.error_message || short.error?.message || "Instagram did not return a token");
  const long = await get<{ access_token: string; expires_in: number }>(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.INSTAGRAM_APP_SECRET}&access_token=${short.access_token}`);
  return { token: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString() };
}

/** Long-lived tokens refresh for another 60 days when they are at least a day old. */
export async function refreshToken(token: string) {
  const r = await get<{ access_token: string; expires_in: number }>(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`);
  return { token: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000).toISOString() };
}

export type IgMe = { user_id: string; username: string; followers_count?: number; media_count?: number; profile_picture_url?: string };
export const me = (token: string) => get<IgMe>(`${G}/me?fields=user_id,username,followers_count,media_count,profile_picture_url&access_token=${token}`);

export type IgMedia = { id: string; caption?: string; media_type: string; media_product_type?: string; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp?: string; like_count?: number; comments_count?: number };
export async function media(token: string, limit = 60) {
  const out: IgMedia[] = [];
  let url: string | undefined = `${G}/me/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`;
  while (url && out.length < limit) {
    const page: { data: IgMedia[]; paging?: { next?: string } } = await get(url);
    out.push(...page.data);
    url = page.paging?.next;
  }
  return out.slice(0, limit);
}

/** Per-post insights. Metrics differ by product type; unsupported ones are dropped rather than failing the sync. */
export async function insights(token: string, m: IgMedia) {
  const reels = m.media_product_type === "REELS";
  const sets = reels
    ? [["views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "ig_reels_avg_watch_time"], ["views", "reach", "saved", "shares"], ["reach"]]
    : [["views", "reach", "likes", "comments", "saved", "shares", "total_interactions", "follows", "profile_visits"], ["reach", "saved", "shares", "likes", "comments"], ["reach"]];
  for (const set of sets) {
    try {
      const r = await get<{ data: { name: string; values?: { value: number }[]; total_value?: { value: number } }[] }>(`${G}/${m.id}/insights?metric=${set.join(",")}&access_token=${token}`);
      const out: Record<string, number> = {};
      for (const d of r.data) out[d.name] = d.total_value?.value ?? d.values?.[0]?.value ?? 0;
      return out;
    } catch { /* try a smaller set */ }
  }
  return {} as Record<string, number>;
}

/** Account reach over the last 28 days, if the API allows it for this account. */
export async function reach28(token: string) {
  try {
    const r = await get<{ data: { total_value?: { value: number }; values?: { value: number }[] }[] }>(`${G}/me/insights?metric=reach&period=days_28&metric_type=total_value&access_token=${token}`);
    return r.data[0]?.total_value?.value ?? r.data[0]?.values?.at(-1)?.value ?? null;
  } catch { return null; }
}
