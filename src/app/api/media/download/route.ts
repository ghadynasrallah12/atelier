import { NextResponse } from "next/server";
import { handler, fail } from "@/lib/api";
import { requireUser, supabaseAdmin } from "@/lib/supabase/server";

/** Redirects to a signed URL that downloads the file (owner only: the path starts with the user's id). */
export const GET = handler(async (req: Request) => {
  const { user } = await requireUser();
  const u = new URL(req.url);
  const path = u.searchParams.get("path") || "";
  const name = u.searchParams.get("name") || path.split("/").pop() || "atelier";
  if (!path.startsWith(user.id + "/")) return fail("Not yours.", 403);
  const { data, error } = await supabaseAdmin().storage.from("media").createSignedUrl(path, 600, { download: name });
  if (error || !data) return fail("storage: " + (error?.message || "no url"), 500);
  return NextResponse.redirect(data.signedUrl);
});
