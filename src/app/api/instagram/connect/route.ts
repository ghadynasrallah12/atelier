import { NextResponse } from "next/server";
import { handler, fail } from "@/lib/api";
import { requireBrand } from "@/lib/supabase/server";
import { authorizeUrl, igEnabled, signState } from "@/lib/instagram";

/** Starts the Instagram login flow for a brand. */
export const GET = handler(async (req: Request) => {
  if (!igEnabled()) return fail("Instagram isn't configured on this deployment yet.");
  const brandId = new URL(req.url).searchParams.get("brandId") || "";
  const { user } = await requireBrand(brandId);
  return NextResponse.redirect(authorizeUrl(signState({ brandId, userId: user.id })));
});
