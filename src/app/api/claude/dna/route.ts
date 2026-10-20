import { handler, json, fail } from "@/lib/api";
import { requireUser } from "@/lib/supabase/server";
import { ask } from "@/lib/claude";

/** multipart: file → a 50-word "Fixed DNA" (biology only) for a house model. */
export const POST = handler(async (req: Request) => {
  await requireUser();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Attach a photo.");
  const mt = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mt)) return fail("Use a JPEG, PNG, WebP or GIF.");
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const text = await ask("Analyze the photo and write a Visual DNA description for AI image generation. Focus ONLY on biological and physical features: face bone structure, eye shape and colour, nose, lips; exact skin tone, texture and imperfections; hair colour, texture and style; apparent age and build. Do NOT describe clothing, background or lighting. Under 50 words, dense adjectives, one paragraph, no preamble.", { images: [{ data, mediaType: mt }], maxTokens: 300 });
  return json({ dna: text });
});
