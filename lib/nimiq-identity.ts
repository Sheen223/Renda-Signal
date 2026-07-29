import { ed25519 } from "@noble/curves/ed25519";
import { blake2b } from "@noble/hashes/blake2";
import { sha256 } from "@noble/hashes/sha256";

const BASE32_ALPHABET = "0123456789ABCDEFGHJKLMNPQRSTUVXY";

export async function ensureNimiqIdentitySchema(db: D1Database) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS nimiq_identity_challenges (id TEXT PRIMARY KEY, x_user_id TEXT NOT NULL, message TEXT NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nimiq_identity_challenge_user_idx ON nimiq_identity_challenges (x_user_id, expires_at)"),
    db.prepare("CREATE TABLE IF NOT EXISTS nimiq_identities (x_user_id TEXT PRIMARY KEY, address TEXT NOT NULL, public_key TEXT NOT NULL, verified_at INTEGER NOT NULL)"),
  ]);
}

function fromHex(value: string) {
  const clean = value.replace(/^0x/, "");
  if (!/^[0-9a-f]+$/i.test(clean) || clean.length % 2) throw new Error("Invalid hexadecimal signature data.");
  return Uint8Array.from(clean.match(/.{2}/g)!, byte => Number.parseInt(byte, 16));
}

function toBase32(bytes: Uint8Array) {
  let bits = 0, value = 0, output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function ibanMod97(value: string) {
  let remainder = 0;
  for (const char of value) {
    const expanded = /[A-Z]/.test(char) ? String(char.charCodeAt(0) - 55) : char;
    for (const digit of expanded) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder;
}

export function addressFromPublicKey(publicKeyHex: string) {
  const publicKey = fromHex(publicKeyHex);
  if (publicKey.length !== 32) throw new Error("Invalid Nimiq public key.");
  const bban = toBase32(blake2b(publicKey, { dkLen: 20 }));
  const checksum = String(98 - ibanMod97(`${bban}NQ00`)).padStart(2, "0");
  return (`NQ${checksum}${bban}`).match(/.{1,4}/g)!.join(" ");
}

export function normalizeNimiqAddress(address: string) { return address.replace(/\s+/g, "").toUpperCase(); }

export function verifyNimiqMessage(message: string, publicKeyHex: string, signatureHex: string) {
  const publicKey = fromHex(publicKeyHex), signature = fromHex(signatureHex);
  if (publicKey.length !== 32 || signature.length !== 64) return false;
  const payload = new TextEncoder().encode(`\u0016Nimiq Signed Message:\n${message.length}${message}`);
  return ed25519.verify(signature, sha256(payload), publicKey);
}
