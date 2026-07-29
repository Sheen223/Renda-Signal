import { env } from "cloudflare:workers";

export const RENDA_NIM_ESCROW = "NQ61 9FB3 VXC6 F0Q8 E2P6 Y7FG L704 FHHX GNN7";
export const NIMIQ_RPC = "https://rpc.nimiqwatch.com";
export const NIMIQ_EXPLORER = "https://nimiq.watch";
export const NIM_ADDRESS = /^NQ[0-9A-Z ]{34,44}$/;

export function normalizeNimAddress(value:string){return value.replace(/\s+/g,"").toUpperCase()}
export function getNimiqPaymentConfig(){const runtime=env as unknown as Record<string,string|undefined>;return{escrowAddress:runtime.NIM_ESCROW_ADDRESS||RENDA_NIM_ESCROW,rpcUrl:runtime.NIMIQ_RPC_URL||NIMIQ_RPC,explorerUrl:runtime.NIMIQ_EXPLORER_URL||NIMIQ_EXPLORER}}
export async function ensureNimiqPaymentSchema(db:D1Database){await db.batch([
 db.prepare("CREATE TABLE IF NOT EXISTS signal_payment_profiles (signal_id TEXT PRIMARY KEY,payment_mode TEXT NOT NULL DEFAULT 'polygon',payout_hash TEXT,refund_hash TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)"),
 db.prepare("CREATE INDEX IF NOT EXISTS signal_payment_mode_idx ON signal_payment_profiles (payment_mode, updated_at)"),
 db.prepare("CREATE TABLE IF NOT EXISTS signal_transactions (id TEXT PRIMARY KEY,signal_id TEXT NOT NULL,action TEXT NOT NULL,tx_hash TEXT NOT NULL UNIQUE,created_at INTEGER NOT NULL)"),
 db.prepare("CREATE TABLE IF NOT EXISTS nimiq_managed_workflows (signal_id TEXT PRIMARY KEY,cancel_requested_by TEXT,ruling_employer_atomic TEXT,ruling_employee_atomic TEXT,employer_settlement_hash TEXT,employee_settlement_hash TEXT,updated_at INTEGER NOT NULL)"),
])}

type RpcTransaction={hash?:string;sender?:string;recipient?:string;value?:number|string;data?:string|number[];blockNumber?:number;state?:string;executionResult?:string};
export async function getNimiqTransaction(hash:string){const {rpcUrl}=getNimiqPaymentConfig(),response=await fetch(rpcUrl,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",method:"getTransactionByHash",params:[hash],id:1})});if(!response.ok)throw new Error("The Nimiq network could not be reached.");const payload=await response.json() as{result?:RpcTransaction|{data?:RpcTransaction;metadata?:unknown};error?:{message?:string}};if(payload.error||!payload.result)throw new Error(payload.error?.message||"The NIM transaction is not confirmed yet.");const wrapped=(payload.result as{data?:unknown}).data;return wrapped&&typeof wrapped==="object"&&!Array.isArray(wrapped)?wrapped as RpcTransaction:payload.result as RpcTransaction}
export function decodeTransactionData(data:RpcTransaction["data"]){if(Array.isArray(data))return new TextDecoder().decode(Uint8Array.from(data));if(typeof data!=="string")return"";const clean=data.replace(/^0x/,"");if(/^[0-9a-f]*$/i.test(clean)&&clean.length%2===0){try{return new TextDecoder().decode(Uint8Array.from(clean.match(/.{2}/g)||[],x=>Number.parseInt(x,16))).replace(/\0+$/g,"")}catch{}}try{return atob(data)}catch{return data}}
export function transactionIncluded(tx:RpcTransaction){return Boolean(tx.blockNumber)||["included","confirmed","finalized"].includes(String(tx.state||tx.executionResult||"").toLowerCase())}
