import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { exchangeCode, me, readState } from "@/lib/instagram";
import { encrypt } from "@/lib/crypto";
import { syncBrand } from "@/lib/igsync";

/** Instagram sends the user back here. Stores the long-lived token (encrypted) and runs the first sync. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const app = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  const state = readState(url.searchParams.get("state") || "");
  if (!state?.brandId) return NextResponse.redirect(`${app}/brands?ig=badstate`);
  const back = `${app}/b/${state.brandId}/reach`;
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${back}?ig=denied`);
  try {
    const { token, expiresAt } = await exchangeCode(code);
    const who = await me(token);
    const sb = supabaseAdmin();
    const { data: brand } = await sb.from("brands").select("id,owner").eq("id", state.brandId).single();
    if (!brand || brand.owner !== state.userId) return NextResponse.redirect(`${app}/brands?ig=forbidden`);
    await sb.from("ig_accounts").upsert({ brand_id: brand.id, ig_user_id: String(who.user_id), username: who.username, followers: who.followers_count ?? null, media_count: who.media_count ?? null, picture: who.profile_picture_url ?? null, token_enc: encrypt(token), token_expires_at: expiresAt }, { onConflict: "brand_id" });
    await syncBrand(brand.id).catch((e) => console.error("first sync", e));
    return NextResponse.redirect(`${back}?ig=connected`);
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(`${back}?ig=error&m=${encodeURIComponent((e as Error).message)}`);
  }
}
