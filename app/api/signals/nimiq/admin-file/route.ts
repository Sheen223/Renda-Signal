import {env} from "cloudflare:workers";
import {addressFromPublicKey,ensureNimiqIdentitySchema,normalizeNimiqAddress} from "@/lib/nimiq-identity";
import {ensureNimiqPaymentSchema,getNimiqPaymentConfig,normalizeNimAddress} from "@/lib/nimiq-payments";
import {getCookie,readSession} from "@/lib/x-auth";

export async function GET(request:Request){
 const runtime=env as unknown as{DB?:D1Database;EVIDENCE?:R2Bucket},profile=await readSession(getCookie(request,"renda_x_session"));
 if(!runtime.DB||!runtime.EVIDENCE||!profile)return Response.json({error:"Administrator access required."},{status:401});
 await ensureNimiqPaymentSchema(runtime.DB);await ensureNimiqIdentitySchema(runtime.DB);
 const identity=await runtime.DB.prepare("SELECT address,public_key FROM nimiq_identities WHERE x_user_id=?").bind(profile.id).first<{address:string;public_key:string}>(),config=getNimiqPaymentConfig();
 let verified=false;try{verified=Boolean(identity&&normalizeNimiqAddress(addressFromPublicKey(identity.public_key))===normalizeNimiqAddress(identity.address)&&normalizeNimAddress(identity.address)===normalizeNimAddress(config.escrowAddress))}catch{}
 if(!verified)return Response.json({error:"The Renda escrow account must authorize this file."},{status:403});
 const url=new URL(request.url),signalId=url.searchParams.get("signalId")||"";
 if(url.searchParams.get("list")==="1"){
  const rows=await runtime.DB.prepare("SELECT e.id,e.public_url,e.object_key,e.created_at FROM evidence e JOIN signal_payment_profiles p ON p.signal_id=e.signal_id WHERE e.signal_id=? AND p.payment_mode='nim' ORDER BY e.created_at ASC").bind(signalId).all<Record<string,string|number>>();
  return Response.json({evidence:rows.results.map(row=>{let content:Record<string,string>={},keys:string[]=[];try{content=JSON.parse(String(row.public_url||"{}"))}catch{}try{keys=JSON.parse(String(row.object_key||"[]"))}catch{}return{id:String(row.id),message:content.message||"",kind:content.kind||"submission",authorRole:content.authorRole||"employee",createdAt:Number(row.created_at),attachments:keys.map((key,index)=>({name:key.split("/").pop()?.replace(/^(dispute-)?[0-9a-f-]+-/,"")||"Attachment",url:`/api/signals/nimiq/admin-file?signalId=${encodeURIComponent(signalId)}&evidenceId=${encodeURIComponent(String(row.id))}&index=${index}`}))}})})
 }
 const evidenceId=url.searchParams.get("evidenceId")||"",index=Number(url.searchParams.get("index"));
 const row=await runtime.DB.prepare("SELECT e.object_key FROM evidence e JOIN signal_payment_profiles p ON p.signal_id=e.signal_id WHERE e.id=? AND e.signal_id=? AND p.payment_mode='nim'").bind(evidenceId,signalId).first<{object_key:string}>();
 let keys:string[]=[];try{keys=JSON.parse(String(row?.object_key||"[]"))}catch{}
 if(!Number.isInteger(index)||!keys[index])return Response.json({error:"Attachment not found."},{status:404});
 const object=await runtime.EVIDENCE.get(keys[index]);if(!object)return Response.json({error:"Attachment not found."},{status:404});
 return new Response(object.body,{headers:{"content-type":object.httpMetadata?.contentType||"application/octet-stream","content-disposition":`inline; filename="${object.customMetadata?.fileName||"attachment"}"`}})
}
