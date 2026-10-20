import { NextResponse } from "next/server";
import { z } from "zod";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** Wraps a handler: auth errors → 401, zod → 400, anything else → 500 with the message. */
export function handler<T extends unknown[]>(fn: (...args: T) => Promise<Response>) {
  return async (...args: T) => {
    try { return await fn(...args); }
    catch (e) {
      const msg = (e as Error).message || "error";
      if (msg === "unauthenticated") return fail("Sign in first.", 401);
      if (msg === "not found") return fail("Not found.", 404);
      if (e instanceof z.ZodError) return fail(e.issues.map((i) => i.path.join(".") + ": " + i.message).join("; "), 400);
      console.error(e);
      return fail(msg, 500);
    }
  };
}
