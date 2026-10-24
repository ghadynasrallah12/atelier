import { z } from "zod";
import { handler, json, fail } from "@/lib/api";
import { requireBrand, supabaseAdmin } from "@/lib/supabase/server";
import { buildPrompt, fillBlanks, type Spec, type Ref } from "@/lib/prompt";
import { submitShot } from "@/lib/queue";
import { isGoogleModel } from "@/lib/google";

const Body = z.object({
  brandId: z.string().uuid(),
  kind: z.enum(["image", "reel"]).default("image"),
  spec: z.record(z.string(), z.string()).default({}),
  out: z.object({ aspect: z.string().optional(), count: z.number().int().min(1).max(4).optional(), duration: z.number().optional(), audio: z.boolean().optional(), model: z.string().optional(), size: z.string().optional() }).default({}),
  refs: z.array(z.object({ moodId: z.string().uuid(), role: z.enum(["garment-top", "garment-bottom", "model", "style", "source"]), note: z.string().optional() })).default([]),
  status: z.enum(["draft", "queued"]).default("queued"),
  title: z.string().optional(),
  exampleFor: z.string().optional(),
  forModel: z.string().uuid().optional(),
  reelId: z.string().uuid().optional(),
  promptOverride: z.string().optional(),
  notes: z.string().max(1500).optional(),
  mode: z.enum(["builder", "freestyle", "refine", "candidate", "example"]).optional(),
  parentId: z.string().uuid().optional(),
});

/** Create a shot. Queued shots are submitted to Higgsfield immediately (on the user's key). */
export const POST = handler(async (req: Request) => {
  const b = Body.parse(await req.json());
  const { sb, user, brand } = await requireBrand(b.brandId);
  if (b.status === "queued") {
    const { data: prof } = await supabaseAdmin().from("profiles").select("hf_key_hint,gg_key_hint").eq("id", user.id).single();
    const google = b.kind === "image" && isGoogleModel(b.out.model);
    if (google && !prof?.gg_key_hint) return fail("Nano Banana runs on your own Google AI key. Add it in Settings (free to create at aistudio.google.com).", 402);
    if (!google && !prof?.hf_key_hint) return fail("Add your Higgsfield API key in Settings first. Generations run on your own balance.", 402);
  }
  const spec = b.spec as Spec;
  const hasGarment = !!(spec.top || spec.bottom || b.refs.some((r) => r.role.startsWith("garment")));
  const free = b.mode === "freestyle" || b.mode === "refine";
  if (free && !(b.promptOverride || "").trim()) return fail("Write what you want to see.");
  if (!hasGarment && !b.reelId && !b.exampleFor && !b.forModel && !b.parentId && !free) return fail("Add a top or pants: a product photo, or pick the type.");
  const { data: models } = await sb.from("models").select("id,name,dna").eq("brand_id", brand.id);
  const bible = (brand.bible || {}) as { visual?: string; line?: string };
  const filled = fillBlanks(spec, bible, b.kind, { top: !!spec.top || b.refs.some((r) => r.role === "garment-top"), bottom: !!spec.bottom || b.refs.some((r) => r.role === "garment-bottom") });
  const { prompt: builtPrompt, autos } = buildPrompt(spec, b.kind, b.out, b.refs, models || [], brand.name, bible.line || "");
  const { prompt: sendPrompt } = buildPrompt(filled, b.kind, b.out, b.refs, models || [], brand.name, bible.line || "");
  const count = b.kind === "image" ? Math.min(4, b.out.count || 1) : 1;
  const rows = [];
  for (let i = 0; i < count; i++) {
    rows.push({
      brand_id: brand.id, kind: b.kind, title: b.title || null, spec, out: b.out, refs: b.refs,
      prompt: (b.promptOverride || sendPrompt) + (b.notes?.trim() ? `\n\nCORRECTIONS (must follow exactly): ${b.notes.trim()}` : ""), autos, status: b.status, example_for: b.exampleFor || null, for_model: b.forModel || null, reel_id: b.reelId || null, parent_id: b.parentId || null, mode: b.mode || (b.forModel ? "candidate" : b.exampleFor ? "example" : "builder"),
      note: autos.length ? `Filled for you: ${autos.join(", ")}.` : "",
    });
  }
  const { data, error } = await sb.from("shots").insert(rows).select("*");
  if (error) return fail(error.message, 500);
  const out = [];
  for (const s of data || []) out.push(b.status === "queued" ? await submitShot(s.id) : s);
  return json({ shots: out, previewPrompt: builtPrompt });
});

/** List shots for a brand (newest first). */
export const GET = handler(async (req: Request) => {
  const brandId = new URL(req.url).searchParams.get("brandId") || "";
  const { sb } = await requireBrand(brandId);
  const { data } = await sb.from("shots").select("*").eq("brand_id", brandId).order("created_at", { ascending: false }).limit(200);
  return json({ shots: data || [] });
});

