"use client";
import {useEffect,useState} from "react";
import {createPublicClient,createWalletClient,custom,encodePacked,http,keccak256,parseAbi,stringToHex} from "viem";
import {polygonAmoy} from "viem/chains";

type Provider={request(args:{method:string;params?:unknown[]}):Promise<unknown>};
type Config={configured:boolean;rpcUrl:string;explorerUrl:string;escrowAddress:`0x${string}`;tokenAddress:`0x${string}`;arbitratorAddress:`0x${string}`;tokenSymbol:string};
type Draft={id:string;target_handle:string;title:string;terms:string;employer_wallet:string;amount_atomic:string;attention_atomic:string;accept_by:number;deliver_by:number};
const tokenAbi=parseAbi(["function allowance(address owner,address spender) view returns (uint256)","function approve(address spender,uint256 amount) returns (bool)"]);
const escrowAbi=parseAbi(["function fundRequest(bytes32 targetIdentity,bytes32 termsHash,uint256 total,uint256 attentionFee,uint64 acceptBy,uint64 deliverBy,address arbitrator) returns (uint256)"]);

export function PolygonDraftRetry({signal,onDone}:{signal:Draft;onDone:()=>Promise<void>}){
 const[config,setConfig]=useState<Config>(),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{fetch("/api/polygon/config").then(response=>response.json()).then(setConfig)},[]);
 async function retry(){setBusy(true);setNotice("");try{
  if(!config?.configured||!config.escrowAddress||!config.tokenAddress||!config.arbitratorAddress)throw new Error("Polygon escrow is unavailable.");
  if(signal.accept_by<=Math.floor(Date.now()/1000))throw new Error("This draft's acceptance window has expired. Create a new signal instead.");
  const provider=(window as unknown as{ethereum?:Provider}).ethereum;if(!provider)throw new Error("Open Renda in Nimiq Pay, Rabby, or another compatible wallet.");
  const accounts=await provider.request({method:"eth_requestAccounts"}) as `0x${string}`[],account=accounts[0];if(!account)throw new Error("Choose the employer wallet.");
  if(account.toLowerCase()!==signal.employer_wallet.toLowerCase())throw new Error(`Switch to the wallet that created this draft (${signal.employer_wallet.slice(0,6)}…${signal.employer_wallet.slice(-4)}).`);
  try{await provider.request({method:"wallet_switchEthereumChain",params:[{chainId:"0x13882"}]})}catch{await provider.request({method:"wallet_addEthereumChain",params:[{chainId:"0x13882",chainName:"Polygon Amoy",nativeCurrency:{name:"POL",symbol:"POL",decimals:18},rpcUrls:[config.rpcUrl],blockExplorerUrls:[config.explorerUrl]}]})}
  const wallet=createWalletClient({account,chain:polygonAmoy,transport:custom(provider)}),client=createPublicClient({chain:polygonAmoy,transport:http(config.rpcUrl)}),total=BigInt(signal.amount_atomic),attention=BigInt(signal.attention_atomic),allowance=await client.readContract({address:config.tokenAddress,abi:tokenAbi,functionName:"allowance",args:[account,config.escrowAddress]});
  if(allowance<total){setNotice(`Approve ${config.tokenSymbol} in your wallet.`);const approval=await wallet.writeContract({address:config.tokenAddress,abi:tokenAbi,functionName:"approve",args:[config.escrowAddress,total]});await client.waitForTransactionReceipt({hash:approval})}
  setNotice("Confirm escrow funding in your wallet.");const targetIdentity=keccak256(stringToHex(`x-handle:${signal.target_handle.toLowerCase()}`)),termsHash=keccak256(encodePacked(["string","string","string","uint256","uint256","uint64"],[signal.target_handle.toLowerCase(),signal.title,signal.terms,total,attention,BigInt(signal.deliver_by)])),fundingHash=await wallet.writeContract({address:config.escrowAddress,abi:escrowAbi,functionName:"fundRequest",args:[targetIdentity,termsHash,total,attention,BigInt(signal.accept_by),BigInt(signal.deliver_by),config.arbitratorAddress]});
  await client.waitForTransactionReceipt({hash:fundingHash});setNotice("Verifying escrow funding…");const response=await fetch("/api/signals",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:signal.id,fundingHash})}),result=await response.json();if(!response.ok)throw new Error(`${result.error||"Funding verification failed."} Transaction: ${fundingHash}`);await onDone()
 }catch(error){setNotice(error instanceof Error?error.message:"Could not retry funding.")}finally{setBusy(false)}}
 return <section className="recovery-panel retry-funding"><span>UNFUNDED DRAFT</span><h3>Your funds were not locked</h3><p>Add enough Amoy POL for gas, then continue this saved request. Renda checks your existing approval and only asks for the wallet steps still required.</p><button type="button" className="primary" disabled={busy||!config?.configured} onClick={retry}>{busy?"Opening wallet…":"Retry funding"}</button>{notice&&<p className="recovery-status">{notice}</p>}</section>
}
