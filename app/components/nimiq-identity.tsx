"use client";
import { init } from "@nimiq/mini-app-sdk";
import { useEffect, useState } from "react";

type Identity = { address: string; verifiedAt: number };
type SdkError = { error: { message: string } };
const isError = (value: unknown): value is SdkError => Boolean(value && typeof value === "object" && "error" in value);

export function NimiqIdentity() {
  const [identity, setIdentity] = useState<Identity | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { fetch("/api/auth/nimiq").then(r => r.ok ? r.json() : null).then(data => setIdentity(data?.identity || null)).catch(() => {}); }, []);
  async function verify() {
    setBusy(true); setError("");
    try {
      const provider = await init({ timeout: 10000 });
      const accounts = await provider.listAccounts();
      if (isError(accounts)) throw new Error(accounts.error.message);
      if (!accounts[0]) throw new Error("Choose a Nimiq account in Nimiq Pay first.");
      const challengeResponse = await fetch("/api/auth/nimiq", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "challenge" }) });
      const challenge = await challengeResponse.json() as { challengeId?: string; message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.challengeId || !challenge.message) throw new Error(challenge.error || "Could not start verification.");
      const signed = await provider.sign(challenge.message);
      if (isError(signed)) throw new Error(signed.error.message);
      const response = await fetch("/api/auth/nimiq", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify", challengeId: challenge.challengeId, address: accounts[0], publicKey: signed.publicKey, signature: signed.signature }) });
      const result = await response.json() as { identity?: Identity; error?: string };
      if (!response.ok || !result.identity) throw new Error(result.error || "Nimiq verification failed.");
      setIdentity(result.identity);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Open this Mini App inside Nimiq Pay to verify."); }
    finally { setBusy(false); }
  }
  if (identity) return <div className="nimiq-identity verified" title={identity.address}><span>✓</span><div><small>Nimiq verified</small><strong>{identity.address.slice(0, 9)}…{identity.address.slice(-4)}</strong></div></div>;
  return <div className="nimiq-identity-wrap"><button className="nimiq-verify" onClick={verify} disabled={busy}>{busy ? "Check Nimiq Pay…" : "Verify Nimiq"}</button>{error && <div className="nimiq-error">{error}</div>}</div>;
}
