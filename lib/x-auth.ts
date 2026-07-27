import { env } from "cloudflare:workers";

export type XProfile = { id: string; username: string; name: string; profileImageUrl?: string; exp: number };

function runtime() { return env as unknown as { X_CLIENT_ID?: string; X_CLIENT_SECRET?: string; SESSION_SECRET?: string }; }
function bytesToBase64Url(bytes: Uint8Array) { let binary=""; for(const byte of bytes) binary+=String.fromCharCode(byte); return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,""); }
function textToBase64Url(value:string){return bytesToBase64Url(new TextEncoder().encode(value));}
function base64UrlToText(value:string){const base64=value.replace(/-/g,"+").replace(/_/g,"/").padEnd(Math.ceil(value.length/4)*4,"=");return decodeURIComponent(Array.from(atob(base64),c=>`%${c.charCodeAt(0).toString(16).padStart(2,"0")}`).join(""));}
export function randomUrlSafe(size=32){return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(size)));}
export async function sha256UrlSafe(value:string){return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))));}
async function hmac(value:string){const secret=runtime().SESSION_SECRET;if(!secret)throw new Error("SESSION_SECRET is not configured");const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(value))));}
export async function createSession(profile:Omit<XProfile,"exp">){const payload=textToBase64Url(JSON.stringify({...profile,exp:Math.floor(Date.now()/1000)+7*24*60*60}));return `${payload}.${await hmac(payload)}`;}
export async function readSession(cookie:string|undefined){if(!cookie)return null;const[payload,signature]=cookie.split(".");if(!payload||!signature||await hmac(payload)!==signature)return null;const profile=JSON.parse(base64UrlToText(payload)) as XProfile;return profile.exp>Math.floor(Date.now()/1000)?profile:null;}
export function getCookie(request:Request,name:string){const raw=request.headers.get("cookie")||"";for(const part of raw.split(";")){const[key,...rest]=part.trim().split("=");if(key===name)return decodeURIComponent(rest.join("="));}}
export function authConfig(){return runtime();}
