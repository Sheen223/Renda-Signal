import {env} from "cloudflare:workers";
import {encodeAbiParameters,keccak256,parseAbiParameters,stringToHex} from "viem";
import {privateKeyToAccount} from "viem/accounts";
import {getCookie,readSession} from "@/lib/x-auth";
import {escrowAbi,getPolygonConfig,polygonClient} from "@/lib/polygon";

export async function POST(request:Request){
  const runtime=env as unknown as{DB?:D1Database;IDENTITY_SIGNER_PRIVATE_KEY?:`0x${string}`};
  if(!runtime.DB||!runtime.IDENTITY_SIGNER_PRIVATE_KEY)return Response.json({error:"Identity authorization is unavailable."},{status:503});
  const profile=await readSession(getCookie(request,"renda_x_session"));
  if(!profile)return Response.json({error:"Sign in with X first."},{status:401});
  const body=await request.json() as{id?:string;wallet?:string};
  if(!body.id||!/^0x[0-9a-fA-F]{40}$/.test(body.wallet||""))return Response.json({error:"Choose a valid wallet."},{status:400});
  const signal=await runtime.DB.prepare("SELECT * FROM signals WHERE id=? AND (target_x_id=? OR (target_x_id='' AND lower(target_handle)=lower(?))) AND status='funded'").bind(body.id,profile.id,`@${profile.username}`).first<Record<string,string|number>>();
  if(!signal||!signal.contract_request_id)return Response.json({error:"This funded request is not available to this X account."},{status:404});
  if(Number(signal.accept_by)<Math.floor(Date.now()/1000))return Response.json({error:"This request has expired and can no longer be accepted."},{status:410});
  const config=getPolygonConfig();
  if(!config)return Response.json({error:"Escrow is unavailable."},{status:503});
  if(!signal.target_x_id)await runtime.DB.prepare("UPDATE signals SET target_x_id=?,target_handle=?,updated_at=? WHERE id=? AND target_x_id=''").bind(profile.id,`@${profile.username}`,Math.floor(Date.now()/1000),body.id).run();
  const contractId=BigInt(String(signal.contract_request_id));
  const onchain=await polygonClient(config.rpcUrl).readContract({address:config.escrowAddress,abi:escrowAbi,functionName:"requests",args:[contractId]});
  const expiry=BigInt(Math.floor(Date.now()/1000)+600),nonce=keccak256(stringToHex(crypto.randomUUID())),targetIdentity=onchain[7];
  const digest=keccak256(encodeAbiParameters(parseAbiParameters("address,uint256,uint256,bytes32,address,uint64,bytes32"),[config.escrowAddress,80002n,contractId,targetIdentity,body.wallet!.toLowerCase() as `0x${string}`,expiry,nonce]));
  const signature=await privateKeyToAccount(runtime.IDENTITY_SIGNER_PRIVATE_KEY).signMessage({message:{raw:digest}});
  return Response.json({contractId:contractId.toString(),authorizationExpiry:expiry.toString(),nonce,signature});
}
