import { env } from "cloudflare:workers";
import { addressFromPublicKey, ensureNimiqIdentitySchema, verifyNimiqMessage } from "@/lib/nimiq-identity";
import { getCookie, readSession } from "@/lib/x-auth";

async function context(request: Request) {
  const db = (env as unknown as { DB?: D1Database }).DB;
  const profile = await readSession(getCookie(request, "renda_x_session"));
  if (!db || !profile) return null;
  await ensureNimiqIdentitySchema(db);
  return { db, profile };
}

export async function GET(request: Request) {
  const ctx = await context(request);
  if (!ctx) return Response.json({ error: "Sign in with X first." }, { status: 401 });
  const row = await ctx.db.prepare("SELECT address,public_key,verified_at FROM nimiq_identities WHERE x_user_id=?").bind(ctx.profile.id).first<{address:string;public_key:string;verified_at:number}>();
  return Response.json({ identity: row ? { address: row.address, publicKey: row.public_key, verifiedAt: row.verified_at } : null });
}

export async function POST(request: Request) {
  const ctx = await context(request);
  if (!ctx) return Response.json({ error: "Sign in with X first." }, { status: 401 });
  const body = await request.json() as { action?: "challenge" | "verify"; challengeId?: string; address?: string; publicKey?: string; signature?: string };
  const now = Math.floor(Date.now() / 1000);
  if (body.action === "challenge") {
    const id = crypto.randomUUID(), expiresAt = now + 300;
    const message = `Renda Signal Nimiq identity verification\nX account: @${ctx.profile.username}\nChallenge: ${id}\nExpires: ${new Date(expiresAt * 1000).toISOString()}`;
    await ctx.db.batch([
      ctx.db.prepare("DELETE FROM nimiq_identity_challenges WHERE expires_at<? OR used_at IS NOT NULL").bind(now),
      ctx.db.prepare("INSERT INTO nimiq_identity_challenges (id,x_user_id,message,expires_at) VALUES (?,?,?,?)").bind(id, ctx.profile.id, message, expiresAt),
    ]);
    return Response.json({ challengeId: id, message, expiresAt });
  }
  if (body.action !== "verify" || !body.challengeId || !body.publicKey || !body.signature) return Response.json({ error: "Incomplete Nimiq verification." }, { status: 400 });
  const challenge = await ctx.db.prepare("SELECT message,expires_at,used_at FROM nimiq_identity_challenges WHERE id=? AND x_user_id=?").bind(body.challengeId, ctx.profile.id).first<{message:string;expires_at:number;used_at?:number}>();
  if (!challenge || challenge.used_at || challenge.expires_at < now) return Response.json({ error: "This verification request expired. Please try again." }, { status: 409 });
  try {
    const derived = addressFromPublicKey(body.publicKey);
    if (!verifyNimiqMessage(challenge.message, body.publicKey, body.signature)) throw new Error("The Nimiq signature is invalid.");
    await ctx.db.batch([
      ctx.db.prepare("UPDATE nimiq_identity_challenges SET used_at=? WHERE id=? AND used_at IS NULL").bind(now, body.challengeId),
      ctx.db.prepare("INSERT INTO nimiq_identities (x_user_id,address,public_key,verified_at) VALUES (?,?,?,?) ON CONFLICT(x_user_id) DO UPDATE SET address=excluded.address,public_key=excluded.public_key,verified_at=excluded.verified_at").bind(ctx.profile.id, derived, body.publicKey.replace(/^0x/, "").toLowerCase(), now),
    ]);
    return Response.json({ identity: { address: derived, verifiedAt: now } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Nimiq verification failed." }, { status: 400 }); }
}
