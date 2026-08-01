import { env } from "cloudflare:workers";

export async function resolveXUser(username: string) {
  // Secrets copied from the X console can include surrounding whitespace or
  // the literal "Bearer" prefix. Control characters make Workers reject the
  // Authorization header before the request is even sent.
  const rawBearer=(env as unknown as { X_BEARER_TOKEN?: string }).X_BEARER_TOKEN;
  const bearer=rawBearer?.trim().replace(/^Bearer\s+/i, "").replace(/[\u0000-\u0020\u007f]/g, "");
  if(!bearer) throw new Error("X recipient verification is not configured.");
  let response:Response;
  try {
    response=await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=username`,{headers:{authorization:`Bearer ${bearer}`}});
  } catch {
    throw new Error("X recipient verification could not start. Please try again.");
  }
  if(response.status===404) throw new Error("That X account could not be found.");
  if(!response.ok) throw new Error("X could not verify that recipient right now.");
  const result=await response.json() as {data?:{id:string;username:string}};
  if(!result.data?.id||!result.data.username) throw new Error("That X account could not be verified.");
  return result.data;
}
