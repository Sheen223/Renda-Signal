import {env} from "cloudflare:workers";
import {decodeEventLog,isAddressEqual} from "viem";
import {getCookie,readSession} from "@/lib/x-auth";
import {escrowAbi,getPolygonConfig,polygonClient} from "@/lib/polygon";
type Action="accept"|"submit"|"approve"|"reclaim"|"request_cancel"|"accept_cancel"|"dispute";
export async function POST(request:Request){
 const db=(env as unknown as{DB?:D1Database}).DB;if(!db)return Response.json({error:"Signal storage is unavailable."},{status:503});
 const profile=await readSession(getCookie(request,"renda_x_session"));if(!profile)return Response.json({error:"Sign in with X first."},{status:401});
 const body=await request.json() as{id?:string;txHash?:`0x${string}`;action?:Action;wallet?:string};
 if(!body.id||!/^0x[0-9a-fA-F]{64}$/.test(body.txHash||"")||!/^0x[0-9a-fA-F]{40}$/.test(body.wallet||""))return Response.json({error:"Missing action transaction."},{status:400});
 const signal=await db.prepare("SELECT * FROM signals WHERE id=? AND (sender_x_id=? OR lower(target_handle)=lower(?))").bind(body.id,profile.id,`@${profile.username}`).first<Record<string,string|number>>();
 if(!signal||!signal.contract_request_id)return Response.json({error:"Signal not found."},{status:404});const config=getPolygonConfig();if(!config)return Response.json({error:"Escrow is unavailable."},{status:503});
 try{const receipt=await polygonClient(config.rpcUrl).waitForTransactionReceipt({hash:body.txHash!});if(receipt.status!=="success"||!receipt.to||!isAddressEqual(receipt.to,config.escrowAddress)||!isAddressEqual(receipt.from,body.wallet as `0x${string}`))throw new Error("The escrow action was not successful.");let event="",args:Record<string,unknown>={};for(const log of receipt.logs){if(!isAddressEqual(log.address,config.escrowAddress))continue;try{const decoded=decodeEventLog({abi:escrowAbi,data:log.data,topics:log.topics});event=decoded.eventName;args=decoded.args as Record<string,unknown>}catch{}}
  if(BigInt(String(args.id??-1))!==BigInt(String(signal.contract_request_id)))throw new Error("The transaction belongs to another request.");
  const expected:Record<Action,string>={accept:"RequestAccepted",submit:"EvidenceSubmitted",approve:"RequestSettled",reclaim:"RequestSettled",request_cancel:"SettlementProposed",accept_cancel:"RequestSettled",dispute:"DisputeOpened"};if(!body.action||event!==expected[body.action])throw new Error("The transaction does not contain the expected action.");
  const remaining=BigInt(String(signal.amount_atomic))-BigInt(String(signal.attention_atomic));let status=String(signal.status),employee=signal.employee_wallet?String(signal.employee_wallet):null;
  if(body.action==="accept"){status="accepted";employee=body.wallet!.toLowerCase()}if(body.action==="submit")status="submitted";
  if(body.action==="approve"){if(BigInt(String(args.employerAmount))!==0n||BigInt(String(args.employeeAmount))!==remaining)throw new Error("The payment release amounts are incorrect.");status="paid"}
  if(body.action==="reclaim"){if(BigInt(String(args.employerAmount))!==BigInt(String(signal.amount_atomic))||BigInt(String(args.employeeAmount))!==0n)throw new Error("The refund amounts are incorrect.");status="refunded"}
  if(body.action==="request_cancel"){if(BigInt(String(args.employerAmount))!==remaining||BigInt(String(args.employeeAmount))!==0n)throw new Error("Cancellation must return all remaining escrow to the employer.");status="cancel_requested"}
  if(body.action==="accept_cancel"){if(BigInt(String(args.employerAmount))!==remaining||BigInt(String(args.employeeAmount))!==0n)throw new Error("The settlement is not a full cancellation refund.");status="refunded"}if(body.action==="dispute")status="disputed";
  await db.prepare("UPDATE signals SET status=?,employee_wallet=?,updated_at=? WHERE id=?").bind(status,employee,Math.floor(Date.now()/1000),body.id).run();return Response.json({status})
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Could not verify action."},{status:400})}
}
