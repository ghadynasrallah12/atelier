import { runQueue } from "@/lib/queue";
import { json, fail } from "@/lib/api";

/**
 * Fallback poller. Open browser tabs already poll their own shots; this catches shots
 * nobody is watching. Call it every minute from Vercel Cron (Pro) or any free pinger
 * (cron-job.org) with ?secret=CRON_SECRET or an Authorization: Bearer header.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get("authorization") || "";
  const ok = url.searchParams.get("secret") === process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || !ok) return fail("forbidden", 403);
  return json(await runQueue());
}
