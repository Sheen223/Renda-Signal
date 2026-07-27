import { env } from "cloudflare:workers";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const runtime = env as unknown as { DB?: D1Database; EVIDENCE?: R2Bucket };
  if (!runtime.DB || !runtime.EVIDENCE) return Response.json({ error: "Evidence storage is unavailable." }, { status: 503 });
  const form = await request.formData();
  const signalId = String(form.get("signalId") || "");
  const wallet = String(form.get("wallet") || "").toLowerCase();
  const publicUrl = String(form.get("publicUrl") || "").trim();
  const file = form.get("file");
  if (!/^[0-9a-f-]{36}$/i.test(signalId) || !/^0x[0-9a-f]{40}$/.test(wallet)) return Response.json({ error: "Invalid signal or wallet." }, { status: 400 });
  if (publicUrl && !/^https:\/\//i.test(publicUrl)) return Response.json({ error: "Evidence URL must use HTTPS." }, { status: 400 });
  let objectKey: string | null = null; let hashSource = new TextEncoder().encode(publicUrl);
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) return Response.json({ error: "Evidence must be a PNG, JPG, or WebP under 5 MB." }, { status: 400 });
    const bytes = await file.arrayBuffer(); hashSource = new Uint8Array(bytes);
    objectKey = `signals/${signalId}/${crypto.randomUUID()}`;
    await runtime.EVIDENCE.put(objectKey, bytes, { httpMetadata: { contentType: file.type }, customMetadata: { signalId, wallet } });
  }
  if (!publicUrl && !objectKey) return Response.json({ error: "Add a link or screenshot." }, { status: 400 });
  const digest = await crypto.subtle.digest("SHA-256", hashSource); const contentHash = `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
  const id = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  await runtime.DB.prepare("INSERT INTO evidence (id, signal_id, submitter_wallet, public_url, object_key, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id, signalId, wallet, publicUrl || null, objectKey, contentHash, now).run();
  return Response.json({ id, contentHash, objectKey }, { status: 201 });
}
