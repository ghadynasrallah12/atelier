import { handler, json, fail } from "@/lib/api";
import { requireUser } from "@/lib/supabase/server";
import { submitShot, syncShot } from "@/lib/queue";
import { removeMedia, signedUrls } from "@/lib/media";

async function ownShot(id: string) {
  const { sb } = await requireUser();
  const { data } = await sb.from("shots").select("*").eq("id", id).single();
  if (!data) throw new Error("not found");
  return { sb, shot: data };
}

/** Poll: submits if still queued, syncs if generating, returns the shot with signed result URLs. */
export const GET = handler(async (_req: Request, ctx: RouteContext<"/api/shots/[id]">) => {
  const { id } = await ctx.params;
  let { shot } = await ownShot(id);
  if (shot.status === "queued") shot = await submitShot(id);
  if (shot.status === "generating") shot = await syncShot(id);
  const paths = (shot.results || []).map((r: { path?: string }) => r.path).filter(Boolean) as string[];
  const urls = await signedUrls(paths);
  const results = (shot.results || []).map((r: { path?: string; url?: string; type: string }) => ({ ...r, url: r.path ? urls[r.path] : r.url }));
  return json({ ...shot, results });
});

export const PATCH = handler(async (req: Request, ctx: RouteContext<"/api/shots/[id]">) => {
  const { id } = await ctx.params;
  const { sb, shot } = await ownShot(id);
  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (body.status === "queued" && ["draft", "failed"].includes(shot.status)) { patch.status = "queued"; patch.error = null; }
  if (typeof body.note === "string") patch.note = body.note;
  if (!Object.keys(patch).length) return fail("Nothing to change.");
  await sb.from("shots").update(patch).eq("id", id);
  const next = patch.status === "queued" ? await submitShot(id) : (await sb.from("shots").select("*").eq("id", id).single()).data;
  return json(next);
});

export const DELETE = handler(async (_req: Request, ctx: RouteContext<"/api/shots/[id]">) => {
  const { id } = await ctx.params;
  const { sb, shot } = await ownShot(id);
  await sb.from("shots").delete().eq("id", id);
  const paths = (shot.results || []).map((r: { path?: string }) => r.path).filter(Boolean) as string[];
  await removeMedia(paths);
  return json({ ok: true });
});
