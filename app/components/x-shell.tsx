"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export function XShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState<undefined | null | { username:string; name:string; profileImageUrl?:string }>(undefined);
  useEffect(()=>{fetch("/api/auth/x/me").then(async response=>response.ok?(await response.json()).profile:null).then(setProfile).catch(()=>setProfile(null))},[]);
  async function connectWallet() {
    try {
      const provider = (window as unknown as { ethereum?: { request(args: { method: string }): Promise<string[]> } }).ethereum;
      if (!provider) throw new Error("missing");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts[0]) throw new Error("none");
      setWallet(accounts[0]); setNotice("Polygon wallet connected through Nimiq Pay.");
    } catch { setNotice("No compatible Polygon wallet was connected. Install or unlock a wallet and try again."); }
  }
  if(profile===undefined)return <main className="auth-loading">Verifying your X identity…</main>;
  if(profile===null)return <main className="auth-gate"><div><span className="network-mark">𝕏</span><h1>Connect X to continue.</h1><p>Your X user ID determines which funded requests only you can accept.</p><a className="cta lime" href="/api/auth/x/start?returnTo=/x">Sign in with X <span>→</span></a><Link href="/explore">Back to networks</Link></div></main>;
  return <main className="x-app"><header className="x-topbar"><Link className="logo" href="/"><span>R</span><strong>RENDA SIGNAL</strong></Link><nav><Link className={pathname === "/x" ? "active" : ""} href="/x">For me</Link><Link className={pathname === "/x/sent" ? "active" : ""} href="/x/sent">Sent</Link><Link className={pathname === "/x/new" ? "active" : ""} href="/x/new">New signal</Link></nav><div className="x-actions"><a className="social-chip" href="/api/auth/x/logout" title="Sign out of X">{profile.profileImageUrl?<img src={profile.profileImageUrl} alt=""/>:<b>𝕏</b>}<span><small>Signed in as</small>@{profile.username}</span></a><button className="wallet-button" onClick={connectWallet}>{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect wallet"}</button></div></header>{notice && <div className="toast">{notice}<button onClick={() => setNotice("")}>×</button></div>}{children}</main>;
}
