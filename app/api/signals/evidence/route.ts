import {env} from "cloudflare:workers";
import {getCookie,readSession} from "@/lib/x-auth";
const MAX_FILE=20*1024*1024,MAX_FILES=6;
const allowed=(type:string)=>type.startsWith("image/")||type.startsWith("video/")||type.startsWith("audio/")||["application/pdf","text/plain"].includes(type);
const hex=(bytes:ArrayBuffer)=>`0x${Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}`;
export async function POST(request:Request){
  const runtime=env as unknown as{DB?:D1Database;EVIDENCE?:R2Bucket};
  if(!runtime.DB||!runtime.EVIDENCE)return Response.json({error:"Evidence storage is unavailable."},{status:503});
  const profile=await readSession(getCookie(request,"renda_x_session"));
  if(!profile)return Response.json({error:"Sign in with X first."},{status:401});
  const form=await request.formData(),signalId=String(form.get("signalId")||""),wallet=String(form.get("wallet")||"").toLowerCase(),message=String(form.get("message")||"").trim().slice(0,4000);
  const links=[...new Set(form.getAll("links").map(String).flatMap(value=>value.split(/\r?\n/)).map(value=>value.trim()).filter(Boolean))];
  const files=form.getAll("files").filter((value):value is File=>value instanceof File&&value.size>0);
  if(!/^[0-9a-f-]{36}$/i.test(signalId)||(!/^0x[0-9a-f]{40}$/.test(wallet)&&!/^nq[0-9a-z ]{34,44}$/.test(wallet)))return Response.json({error:"Invalid signal or wallet."},{status:400});
  if(links.some(link=>!/^https:\/\//i.test(link)))return Response.json({error:"Every evidence link must use HTTPS."},{status:400});
  if(files.length>MAX_FILES||files.some(file=>file.size>MAX_FILE||!allowed(file.type)))return Response.json({error:"Upload up to 6 images, videos, audio files, PDFs or text files; 20 MB maximum each."},{status:400});
  if(!message&&!links.length&&!files.length)return Response.json({error:"Add a message, link or file."},{status:400});
  const signal=await runtime.DB.prepare("SELECT s.employee_wallet,s.status,COALESCE(p.payment_mode,'polygon') payment_mode FROM signals s LEFT JOIN signal_payment_profiles p ON p.signal_id=s.id WHERE s.id=? AND lower(s.target_handle)=lower(?)").bind(signalId,`@${profile.username}`).first<Record<string,string>>();
  if(!signal||!["accepted","revision_requested"].includes(signal.status)||signal.employee_wallet?.toLowerCase()!==wallet)return Response.json({error:"Only the accepted recipient wallet can submit this work."},{status:403});
  const keys:string[]=[],fileProofs:string[]=[];
  for(const file of files){const bytes=await file.arrayBuffer(),fileHash=hex(await crypto.subtle.digest("SHA-256",bytes)),key=`signals/${signalId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;await runtime.EVIDENCE.put(key,bytes,{httpMetadata:{contentType:file.type},customMetadata:{signalId,wallet,fileName:file.name,fileHash}});keys.push(key);fileProofs.push(`${file.name}:${fileHash}`)}
  const digest=hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify({message,links,files:fileProofs}))));
  const id=crypto.randomUUID(),now=Math.floor(Date.now()/1000);
  await runtime.DB.prepare("INSERT INTO evidence (id, signal_id, submitter_wallet, public_url, object_key, content_hash, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(id,signalId,wallet,JSON.stringify({message,links}),JSON.stringify(keys),digest,now).run();
  const needsChain=signal.status==="accepted"&&signal.payment_mode!=="nim";if(!needsChain)await runtime.DB.prepare("UPDATE signals SET status='submitted',updated_at=? WHERE id=?").bind(now,signalId).run();
  return Response.json({id,contentHash:digest,fileCount:files.length,linkCount:links.length,needsChain},{status:201});
}
