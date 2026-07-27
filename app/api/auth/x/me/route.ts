import { getCookie, readSession } from "@/lib/x-auth";
export async function GET(request:Request){try{const profile=await readSession(getCookie(request,"renda_x_session"));return profile?Response.json({profile}):Response.json({error:"Not signed in"},{status:401});}catch{return Response.json({error:"X authentication is not configured"},{status:503})}}
