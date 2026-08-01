import { env } from "cloudflare:workers";

export async function resolveXUser(username: string) {
  const bearer=(env as unknown as { X_BEARER_TOKEN?: string }).X_BEARER_TOKEN;
  if(!bearer) throw new Error("X recipient verification is not configured.");
  const response=await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=username`,{headers:{authorization:`Bearer ${bearer}`}});
  if(response.status===404) throw new Error("That X account could not be found.");
  if(!response.ok) throw new Error("X could not verify that recipient right now.");
  const result=await response.json() as {data?:{id:string;username:string}};
  if(!result.data?.id||!result.data.username) throw new Error("That X account could not be verified.");
  return result.data;
}
