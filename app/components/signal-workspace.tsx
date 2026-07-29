"use client";
import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {SignalActions} from "@/app/components/signal-actions";

type ViewRole="inbox"|"sent";
type WorkspaceMode=ViewRole|"history";
type ApiSignal={id:string;sender_handle:string;target_handle:string;title:string;terms:string;amount_atomic:string;attention_atomic:string;deliver_by:number;status:string;funding_hash?:string|null;contract_request_id?:string|null;employee_wallet?:string|null;view_role?:ViewRole};
const labels:Record<string,string>={draft:"Draft",funding_pending:"Funding needs recovery",funded:"Waiting for recipient",declined:"Declined",accepted:"In progress",submitted:"Under review",revision_requested:"Revision requested",cancel_requested:"Cancellation requested",paid:"Paid",refunded:"Cancelled & refunded",disputed:"In arbitration"};
const completed=new Set(["paid","refunded"]);
const amount=(atomic:string)=>Number(BigInt(atomic))/1_000_000;
const date=(seconds:number)=>new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"short"}).format(new Date(seconds*1000));

export function SignalWorkspace({mode}:{mode:WorkspaceMode}){
  const[items,setItems]=useState<ApiSignal[]>([]),[selectedId,setSelectedId]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState(""),[recoveryHash,setRecoveryHash]=useState(""),[recovering,setRecovering]=useState(false),[recoveryError,setRecoveryError]=useState("");
  async function load(){
    setLoading(true);setError("");
    try{
      let rows:ApiSignal[];
      if(mode==="history"){
        const[inboxResponse,sentResponse]=await Promise.all([fetch("/api/signals?role=target"),fetch("/api/signals?role=sender")]);
        const[inboxData,sentData]=await Promise.all([inboxResponse.json(),sentResponse.json()]);
        if(!inboxResponse.ok)throw new Error(inboxData.error||"Could not load received history.");
        if(!sentResponse.ok)throw new Error(sentData.error||"Could not load sent history.");
        const seen=new Set<string>();
        rows=[...(sentData.signals as ApiSignal[]).map(item=>({...item,view_role:"sent" as const})),...(inboxData.signals as ApiSignal[]).map(item=>({...item,view_role:"inbox" as const}))].filter(item=>completed.has(item.status)&&!seen.has(item.id)&&!!seen.add(item.id));
      }else{
        const response=await fetch(`/api/signals?role=${mode==="sent"?"sender":"target"}`),data=await response.json();
        if(!response.ok)throw new Error(data.error||"Could not load signals.");
        rows=(data.signals as ApiSignal[]).filter(item=>!completed.has(item.status)).map(item=>({...item,view_role:mode}));
      }
      setItems(rows);
      setSelectedId(current=>rows.some(item=>item.id===current)?current:rows[0]?.id||"");
    }catch(e){setError(e instanceof Error?e.message:"Could not load signals.")}finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[mode]);
  const selected=useMemo(()=>items.find(s=>s.id===selectedId)||items[0],[items,selectedId]);
  async function recover(event:FormEvent){
    event.preventDefault();if(!selected)return;setRecovering(true);setRecoveryError("");
    try{const response=await fetch("/api/signals",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:selected.id,fundingHash:recoveryHash.trim()})}),data=await response.json();if(!response.ok)throw new Error(data.error||"Could not recover this funding.");setRecoveryHash("");await load()}catch(e){setRecoveryError(e instanceof Error?e.message:"Could not recover this funding.")}finally{setRecovering(false)}
  }
  if(loading)return <section className="app-empty"><span className="eyebrow">LOADING SIGNALS</span><h1>Checking your requests…</h1></section>;
  if(error)return <section className="app-empty"><span className="eyebrow">COULD NOT LOAD</span><h1>Your signals are unavailable.</h1><p>{error}</p></section>;
  if(!selected)return <section className="app-empty"><span className="eyebrow">{mode==="history"?"COMPLETED ACTIVITY":mode==="inbox"?"DIRECTED AT YOU":"CREATED BY YOU"}</span><h1>{mode==="history"?"No completed tasks yet.":mode==="inbox"?"No signals yet.":"You haven’t sent a signal yet."}</h1><p>{mode==="history"?"Paid and refunded requests will appear here.":mode==="inbox"?"Requests addressed to your verified X account will appear here.":"Create a request and it will appear here as a draft until its on-chain funding is confirmed."}</p>{mode==="sent"&&<Link className="cta lime" href="/x/new">Create a signal <span>→</span></Link>}</section>;
  const total=amount(selected.amount_atomic),attention=amount(selected.attention_atomic),perspective=selected.view_role||("sent" as const);
  const history=mode==="history";
  return <section className={`workspace ${history?"history-workspace":""}`}><aside className="request-list"><div className="list-heading"><span className="eyebrow">{history?"COMPLETED ACTIVITY":mode==="inbox"?"DIRECTED AT YOU":"CREATED BY YOU"}</span><h1>{history?"Your history.":mode==="inbox"?"Your attention has value.":"Signals you sent."}</h1><p>{history?"A permanent view of paid and refunded requests.":mode==="inbox"?"Verified requests addressed to your X account.":"Real records from your connected X identity."}</p></div><div className="list-items">{items.map(item=><button key={item.id} className={`request-row ${selected.id===item.id?"selected":""}`} onClick={()=>{setSelectedId(item.id);setRecoveryHash(item.funding_hash||"");setRecoveryError("")}}><span className={`state-dot ${item.status}`}/><span className="row-copy"><small>{history?(item.view_role==="sent"?`SENT TO ${item.target_handle}`:`RECEIVED FROM ${item.sender_handle}`):mode==="inbox"?item.sender_handle:item.target_handle}</small><strong>{item.title}</strong><span className={`row-status ${item.status}`}>{labels[item.status]||item.status}</span><em>{date(item.deliver_by)}</em></span><span className="row-amount"><strong>${amount(item.amount_atomic).toFixed(2)}</strong><small>{mode==="sent"&&!['draft','funding_pending'].includes(item.status)?"POST TO X ↗":"USDT"}</small></span></button>)}</div></aside><article className="request-detail"><div className="detail-top"><span>{selected.id.slice(0,8).toUpperCase()}</span><span className={`status-pill ${selected.status}`}>{labels[selected.status]||selected.status}</span></div><div className="people-line"><span className="avatar">{selected.sender_handle.slice(1,2).toUpperCase()}</span><div><small>FROM</small><strong>{selected.sender_handle}</strong></div><span className="arrow">→</span><span className="avatar target">{selected.target_handle.slice(1,2).toUpperCase()}</span><div><small>FOR</small><strong>{selected.target_handle}</strong></div></div><h2>{selected.title}</h2><p className="brief">{selected.terms}</p><div className="money-card"><div><small>TOTAL REQUESTED</small><strong>{total.toFixed(2)} <span>USDT</span></strong></div><div><small>ATTENTION FEE</small><strong>{attention.toFixed(2)} <span>USDT</span></strong></div><div><small>DELIVERY REWARD</small><strong>{(total-attention).toFixed(2)} <span>USDT</span></strong></div></div><div className="terms"><div><small>DELIVER BY</small><strong>{date(selected.deliver_by)}</strong></div><div><small>NETWORK</small><strong>Polygon</strong></div><div><small>FUNDING</small><strong>{selected.status==="funding_pending"?"Needs recovery":selected.funding_hash?"Confirmed on-chain":"Not yet confirmed"}</strong></div></div>{history&&<div className={`history-summary ${selected.status}`}><strong>{selected.status==="paid"?"Completed and paid":"Closed and refunded"}</strong><p>{selected.status==="paid"?"The work was approved and the remaining escrow was released.":"The request is closed and its remaining escrow was returned."}</p></div>}<SignalActions mode={perspective} signal={selected} onDone={load}/>{mode==="sent"&&!['draft','funding_pending'].includes(selected.status)&&<div className="post-reminder"><div><small>SHARING REMINDER</small><strong>Have you posted this offer on X?</strong><p>Tag {selected.target_handle} so they see the funded request.</p></div><Link className="primary" href={`/x/share?id=${encodeURIComponent(selected.id)}`}>Post to X ↗</Link></div>}{mode==="sent"&&['draft','funding_pending'].includes(selected.status)&&<form className="recovery-panel" onSubmit={recover}><span>FUNDING RECOVERY</span><h3>Already paid on-chain?</h3><p>Paste the Polygon transaction hash. Renda will verify it and connect the locked funds—without charging you again.</p><input aria-label="Polygon transaction hash" value={recoveryHash} onChange={e=>setRecoveryHash(e.target.value)} placeholder="0x…" pattern="0x[0-9a-fA-F]{64}" required/>{recoveryError&&<p className="recovery-error">{recoveryError}</p>}<button className="primary" disabled={recovering}>{recovering?"Checking transaction…":"Recover funding"}</button></form>}</article></section>;
}
