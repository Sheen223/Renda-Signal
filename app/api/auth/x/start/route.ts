import { authConfig, randomUrlSafe, sha256UrlSafe } from "@/lib/x-auth";

export async function GET(request:Request){
  const {X_CLIENT_ID}=authConfig();
  const origin=new URL(request.url).origin;
  if(!X_CLIENT_ID)return Response.redirect(`${origin}/explore?error=x_not_configured`,302);
  const returnTo=new URL(request.url).searchParams.get("returnTo")||"/x";
  const safeReturn=returnTo.startsWith("/")&&!returnTo.startsWith("//")?returnTo:"/x";
  const state=randomUrlSafe(24);const verifier=randomUrlSafe(64);const challenge=await sha256UrlSafe(verifier);
  const cookie=btoa(JSON.stringify({state,verifier,returnTo:safeReturn,exp:Date.now()+10*60*1000}));
  const callback=`${origin}/api/auth/x/callback`;
  const params=new URLSearchParams({response_type:"code",client_id:X_CLIENT_ID,redirect_uri:callback,scope:"tweet.read users.read",state,code_challenge:challenge,code_challenge_method:"S256"});
  return new Response(null,{status:302,headers:{location:`https://x.com/i/oauth2/authorize?${params}`,"set-cookie":`renda_x_oauth=${encodeURIComponent(cookie)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`}});
}
