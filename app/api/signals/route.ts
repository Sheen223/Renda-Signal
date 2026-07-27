import { env } from "cloudflare:workers";

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const HANDLE = /^@[A-Za-z0-9_]{1,15}$/;

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS signals (id TEXT PRIMARY KEY, chain_id INTEGER NOT NULL DEFAULT 137, contract_request_id TEXT, sender_x_id TEXT NOT NULL, sender_handle TEXT NOT NULL, target_x_id TEXT NOT NULL, target_handle TEXT NOT NULL, employer_wallet TEXT NOT NULL, employee_wallet TEXT, title TEXT NOT NULL, terms TEXT NOT NULL, amount_atomic TEXT NOT NULL, attention_atomic TEXT NOT NULL, accept_by INTEGER NOT NULL, deliver_by INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'draft', funding_hash TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS signals_target_idx ON signals (target_x_id, created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS signals_sender_idx ON signals (sender_x_id, created_at)"),
  ]);
}

export async function GET(request: Request) {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) return Response.json({ error: "Signal storage is unavailable." }, { status: 503 });
  await ensureSchema(db);
  const url = new URL(request.url);
  const xUserId = url.searchParams.get("xUserId")?.trim();
  const role = url.searchParams.get("role") === "sender" ? "sender_x_id" : "target_x_id";
  if (!xUserId || !/^\d{1,24}$/.test(xUserId)) return Response.json({ error: "A valid X user id is required." }, { status: 400 });
  const rows = await db.prepare(`SELECT * FROM signals WHERE ${role} = ? ORDER BY created_at DESC LIMIT 100`).bind(xUserId).all();
  return Response.json({ signals: rows.results });
}

export async function POST(request: Request) {
  const db = (env as unknown as { DB?: D1Database }).DB;
  if (!db) return Response.json({ error: "Signal storage is unavailable." }, { status: 503 });
  const body = await request.json() as Record<string, unknown>;
  const required = ["senderXId", "senderHandle", "targetXId", "targetHandle", "employerWallet", "title", "terms", "amountAtomic", "attentionAtomic", "acceptBy", "deliverBy"];
  if (required.some((key) => body[key] === undefined || body[key] === "")) return Response.json({ error: "Complete all request fields." }, { status: 400 });
  if (!/^\d{1,24}$/.test(String(body.senderXId)) || !/^\d{1,24}$/.test(String(body.targetXId)) || !HANDLE.test(String(body.senderHandle)) || !HANDLE.test(String(body.targetHandle)) || !ADDRESS.test(String(body.employerWallet))) return Response.json({ error: "Invalid identity or wallet." }, { status: 400 });
  const amount = BigInt(String(body.amountAtomic));
  const attention = BigInt(String(body.attentionAtomic));
  const acceptBy = Number(body.acceptBy); const deliverBy = Number(body.deliverBy);
  if (amount <= 0n || attention < 0n || attention > amount || !Number.isSafeInteger(acceptBy) || acceptBy >= deliverBy) return Response.json({ error: "Invalid reward or deadline." }, { status: 400 });
  const title = String(body.title).trim().slice(0, 100); const terms = String(body.terms).trim().slice(0, 4000);
  if (!title || !terms) return Response.json({ error: "Title and terms are required." }, { status: 400 });
  await ensureSchema(db);
  const id = crypto.randomUUID(); const now = Math.floor(Date.now() / 1000);
  await db.prepare("INSERT INTO signals (id, sender_x_id, sender_handle, target_x_id, target_handle, employer_wallet, title, terms, amount_atomic, attention_atomic, accept_by, deliver_by, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)")
    .bind(id, String(body.senderXId), String(body.senderHandle), String(body.targetXId), String(body.targetHandle), String(body.employerWallet).toLowerCase(), title, terms, amount.toString(), attention.toString(), acceptBy, deliverBy, now, now).run();
  return Response.json({ id, status: "draft" }, { status: 201 });
}
