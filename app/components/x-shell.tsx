"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {ReactNode,useEffect,useState} from "react";

export function XShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  const[wallet,setWallet]=useState("");
  const[arbitrator,setArbitrator]=useState("");
  const[notice,setNotice]=useState("");
  const[profile,setProfile]=useState<undefined|null|{username:string;profileImageUrl?:string}>(undefined);
  useEffect(()=>{
    fetch("/api/auth/x/me").then(async r=>r.ok?(await r.json()).profile:null).then(setProfile).catch(()=>setProfile(null));
    fetch("/api/polygon/config").then(r=>r.json()).then(data=>setArbitrator(data.arbitratorAddress||""));
  },[]);
  async function connectWallet(){
    try{
      const provider=(window as unknown as{ethereum?:{request(args:{method:string}):Promise<string[]>}}).ethereum;
      if(!provider)throw new Error();
      const accounts=await provider.request({method:"eth_requestAccounts"});
      if(!accounts[0])throw new Error();
      setWallet(accounts[0]);
      setNotice("Polygon wallet connected through Nimiq Pay.");
    }catch{setNotice("No compatible Polygon wallet was connected.")}
  }
  if(profile===undefined)return <main className="auth-loading">Verifying your X identity…</main>;
  if(profile===null)return <main className="auth-gate"><div><span className="network-mark">𝕏</span><h1>Connect X to continue.</h1><p>Your X user ID determines which funded requests only you can accept.</p><a className="cta lime" href="/api/auth/x/start?returnTo=/x">Sign in with X <span>→</span></a><Link href="/explore">Back to networks</Link></div></main>;
  const links=[["/x","For me"],["/x/sent","Sent"],["/x/history","History"],["/x/new","New signal"],["/x/nim-admin","NIM Admin"],...(wallet&&wallet.toLowerCase()===arbitrator.toLowerCase()?[['/x/arbitration','Admin']]:[])];
  return <main className="x-app"><header className="x-topbar"><Link className="logo" href="/"><span>R</span><strong>RENDA SIGNAL</strong></Link><nav>{links.map(([href,label])=><Link key={href} className={pathname===href?"active":""} href={href}>{label}</Link>)}</nav><div className="x-actions"><a className="social-chip" href="/api/auth/x/logout">{profile.profileImageUrl?<img src={profile.profileImageUrl} alt=""/>:<b>𝕏</b>}<span><small>Signed in as</small>@{profile.username}</span></a><button className="wallet-button" onClick={connectWallet}>{wallet?`${wallet.slice(0,6)}…${wallet.slice(-4)}`:"Connect wallet"}</button></div></header><div className="global-testnet"><strong>TWO PAYMENT RAILS</strong><span>Managed NIM uses real funds · Polygon tUSDT is testnet only.</span></div>{notice&&<div className="toast">{notice}<button onClick={()=>setNotice("")}>×</button></div>}{children}</main>;
}
