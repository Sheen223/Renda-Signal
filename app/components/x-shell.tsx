"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";

export function XShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [wallet, setWallet] = useState("");
  const [notice, setNotice] = useState("");
  async function connectWallet() {
    try {
      const provider = (window as unknown as { ethereum?: { request(args: { method: string }): Promise<string[]> } }).ethereum;
      if (!provider) throw new Error("preview");
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (!accounts[0]) throw new Error("none");
      setWallet(accounts[0]); setNotice("Polygon wallet connected through Nimiq Pay.");
    } catch { setWallet("0x7A91b639Bca892F739d6149E30c92E722f2A184c"); setNotice("Preview wallet connected. Use Nimiq Pay for your real Polygon wallet."); }
  }
  return <main className="x-app"><header className="x-topbar"><Link className="logo" href="/"><span>R</span><strong>RENDA SIGNAL</strong></Link><nav><Link className={pathname === "/x" ? "active" : ""} href="/x">For me <i>3</i></Link><Link className={pathname === "/x/sent" ? "active" : ""} href="/x/sent">Sent</Link><Link className={pathname === "/x/new" ? "active" : ""} href="/x/new">New signal</Link></nav><div className="x-actions"><button className="social-chip"><b>𝕏</b> @david</button><button className="wallet-button" onClick={connectWallet}>{wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "Connect wallet"}</button></div></header>{notice && <div className="toast">{notice}<button onClick={() => setNotice("")}>×</button></div>}{children}</main>;
}
