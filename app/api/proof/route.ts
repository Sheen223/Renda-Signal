import {env} from "cloudflare:workers";

type CountRow={count:number};
type HashRow={tx_hash?:string;funding_hash?:string;payout_hash?:string;refund_hash?:string;action?:string;created_at?:number};

async function count(db:D1Database,sql:string){try{return Number((await db.prepare(sql).first<CountRow>())?.count||0)}catch{return 0}}
async function rows(db:D1Database,sql:string){try{return (await db.prepare(sql).all<HashRow>()).results}catch{return []}}

export async function GET(){
  const e=env as unknown as Record<string,string|D1Database|undefined>,db=e.DB as D1Database|undefined;
  const base={generatedAt:new Date().toISOString(),polygon:{chainId:80002,network:"Polygon Amoy",contractVersion:String(e.ESCROW_CONTRACT_VERSION||"1"),escrowAddress:e.ESCROW_CONTRACT_ADDRESS||null,tokenAddress:e.TEST_TOKEN_ADDRESS||null,explorer:"https://amoy.polygonscan.com"},nimiq:{network:"Nimiq mainnet",escrowAddress:e.NIM_ESCROW_ADDRESS||"NQ61 9FB3 VXC6 F0Q8 E2P6 Y7FG L704 FHHX GNN7",explorer:"https://nimiq.watch"}};
  if(!db)return Response.json({...base,available:false,counts:{requests:0,funded:0,completed:0,disputed:0,submissions:0},receipts:[]},{headers:{"Cache-Control":"public, max-age=60"}});
  const counts={requests:await count(db,"SELECT COUNT(*) count FROM signals"),funded:await count(db,"SELECT COUNT(*) count FROM signals WHERE status NOT IN ('draft','funding_pending')"),completed:await count(db,"SELECT COUNT(*) count FROM signals WHERE status IN ('paid','refunded','settled')"),disputed:await count(db,"SELECT COUNT(*) count FROM signals WHERE status='disputed'"),submissions:await count(db,"SELECT COUNT(*) count FROM evidence")};
  const polygon=await rows(db,"SELECT t.tx_hash,t.action,t.created_at FROM signal_transactions t JOIN signals s ON s.id=t.signal_id LEFT JOIN signal_payment_profiles p ON p.signal_id=s.id WHERE COALESCE(p.payment_mode,'polygon')='polygon' ORDER BY t.created_at DESC LIMIT 12");
  const nimiq=await rows(db,"SELECT t.tx_hash,t.action,t.created_at FROM signal_transactions t JOIN signal_payment_profiles p ON p.signal_id=t.signal_id WHERE p.payment_mode='nim' ORDER BY t.created_at DESC LIMIT 12");
  const receipts=[...polygon.map(row=>({rail:"Polygon Amoy",action:row.action||"transaction",hash:row.tx_hash!,time:row.created_at||null,url:`https://amoy.polygonscan.com/tx/${row.tx_hash}`})),...nimiq.map(row=>({rail:"Nimiq",action:row.action||"transaction",hash:row.tx_hash!,time:row.created_at||null,url:`https://nimiq.watch/#${row.tx_hash}`}))].sort((a,b)=>(b.time||0)-(a.time||0)).slice(0,16);
  return Response.json({...base,available:true,counts,receipts},{headers:{"Cache-Control":"public, max-age=60"}});
}
