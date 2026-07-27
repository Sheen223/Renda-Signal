import { authConfig, createSession, getCookie } from "@/lib/x-auth";

export async function GET(request:Request){
  const url=new URL(request.url);const origin=url.origin;const code=url.searchParams.get("code");const state=url.searchParams.get("state");const saved=getCookie(request,"renda_x_oauth");
  if(!code||!state||!saved)return Response.redirect(`${origin}/explore?error=x_authorization_failed`,302);
  let flow:{state:string;verifier:string;returnTo:string;exp:number};try{flow=JSON.parse(atob(saved));}catch{return Response.redirect(`${origin}/explore?error=x_invalid_state`,302)}
  if(flow.state!==state||flow.exp<Date.now())return Response.redirect(`${origin}/explore?error=x_invalid_state`,302);
  const {X_CLIENT_ID,X_CLIENT_SECRET}=authConfig();if(!X_CLIENT_ID)return Response.redirect(`${origin}/explore?error=x_not_configured`,302);
  const callback=`${origin}/api/auth/x/callback`;const body=new URLSearchParams({code,grant_type:"authorization_code",client_id:X_CLIENT_ID,redirect_uri:callback,code_verifier:flow.verifier});
  const headers:Record<string,string>={"content-type":"application/x-www-form-urlencoded"};if(X_CLIENT_SECRET)headers.authorization=`Basic ${btoa(`${X_CLIENT_ID}:${X_CLIENT_SECRET}`)}`;
  const tokenResponse=await fetch("https://api.x.com/2/oauth2/token",{method:"POST",headers,body});if(!tokenResponse.ok)return Response.redirect(`${origin}/explore?error=x_token_exchange_failed`,302);
  const token=await tokenResponse.json() as {access_token?:string};if(!token.access_token)return Response.redirect(`${origin}/explore?error=x_token_exchange_failed`,302);
  const profileResponse=await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url",{headers:{authorization:`Bearer ${token.access_token}`}});if(!profileResponse.ok)return Response.redirect(`${origin}/explore?error=x_profile_failed`,302);
  const result=await profileResponse.json() as {data?:{id:string;username:string;name:string;profile_image_url?:string}};if(!result.data)return Response.redirect(`${origin}/explore?error=x_profile_failed`,302);
  const session=await createSession({id:result.data.id,username:result.data.username,name:result.data.name,profileImageUrl:result.data.profile_image_url});
  return new Response(null,{status:302,headers:{location:`${origin}${flow.returnTo}`,"set-cookie":`renda_x_session=${session}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`}});
}
