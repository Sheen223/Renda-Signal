import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ganache from "ganache";
import {createPublicClient,createWalletClient,custom,encodeAbiParameters,keccak256,parseAbiParameters,stringToHex} from "viem";
import {privateKeyToAccount} from "viem/accounts";

async function fixture(){
  const provider=ganache.provider({logging:{quiet:true},wallet:{deterministic:true,totalAccounts:6}});
  const initial=provider.getInitialAccounts(),keys=Object.values(initial).map(entry=>entry.secretKey),accounts=keys.map(privateKeyToAccount);
  const client=createPublicClient({transport:custom(provider)}),wallets=accounts.map(account=>createWalletClient({account,transport:custom(provider)}));
  const artifacts=JSON.parse(await readFile(new URL("../public/contracts.json",import.meta.url),"utf8"));
  const deploy=async(wallet,name,args=[])=>{const hash=await wallet.deployContract({abi:artifacts[name].abi,bytecode:artifacts[name].bytecode,args});return (await client.waitForTransactionReceipt({hash})).contractAddress};
  const token=await deploy(wallets[0],"TestUSDT"),escrow=await deploy(wallets[0],"RendaSignalEscrow",[token,accounts[2].address]);
  return{provider,client,wallets,accounts,token,escrow,artifacts};
}

async function fundAndAccept(ctx){
  const {client,wallets,accounts,token,escrow,artifacts}=ctx,total=5_000_000n,attention=300_000n;
  await client.waitForTransactionReceipt({hash:await wallets[0].writeContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"approve",args:[escrow,total]})});
  const now=BigInt(Math.floor(Date.now()/1000)),target=keccak256(stringToHex("x-user-id:12345"));
  await client.waitForTransactionReceipt({hash:await wallets[0].writeContract({address:escrow,abi:artifacts.RendaSignalEscrow.abi,functionName:"fundRequest",args:[target,keccak256(stringToHex("terms")),total,attention,now+3600n,now+7200n,accounts[3].address]})});
  const expiry=now+600n,nonce=keccak256(stringToHex("unique-authorization")),digest=keccak256(encodeAbiParameters(parseAbiParameters("address,uint256,uint256,bytes32,address,uint64,bytes32"),[escrow,1337n,1n,target,accounts[1].address,expiry,nonce])),signature=await accounts[2].signMessage({message:{raw:digest}});
  await client.waitForTransactionReceipt({hash:await wallets[1].writeContract({address:escrow,abi:artifacts.RendaSignalEscrow.abi,functionName:"acceptRequest",args:[1n,expiry,nonce,signature]})});
}

test("a stale cancellation cannot pay a closed request twice",async()=>{
  const ctx=await fixture();await fundAndAccept(ctx);const{client,wallets,escrow,artifacts}=ctx,abi=artifacts.RendaSignalEscrow.abi;
  await client.waitForTransactionReceipt({hash:await wallets[1].writeContract({address:escrow,abi,functionName:"requestCancellation",args:[1n]})});
  await client.waitForTransactionReceipt({hash:await wallets[1].writeContract({address:escrow,abi,functionName:"submitEvidence",args:[1n,keccak256(stringToHex("evidence"))]})});
  await client.waitForTransactionReceipt({hash:await wallets[0].writeContract({address:escrow,abi,functionName:"approve",args:[1n]})});
  await assert.rejects(wallets[1].writeContract({address:escrow,abi,functionName:"acceptCancellation",args:[1n]}),/request closed|revert/i);
  const request=await client.readContract({address:escrow,abi,functionName:"requests",args:[1n]});assert.equal(request[10],5);
});

test("only the other request party can accept a full-refund cancellation",async()=>{
  const ctx=await fixture();await fundAndAccept(ctx);const{wallets,escrow,artifacts}=ctx,abi=artifacts.RendaSignalEscrow.abi;
  await wallets[0].writeContract({address:escrow,abi,functionName:"requestCancellation",args:[1n]});
  await assert.rejects(wallets[0].writeContract({address:escrow,abi,functionName:"acceptCancellation",args:[1n]}),/bad acceptance|revert/i);
  await assert.rejects(wallets[4].writeContract({address:escrow,abi,functionName:"acceptCancellation",args:[1n]}),/not a party|revert/i);
});

test("accepted cancellation refunds every remaining token to the employer",async()=>{
  const ctx=await fixture();await fundAndAccept(ctx);const{client,wallets,accounts,token,escrow,artifacts}=ctx,abi=artifacts.RendaSignalEscrow.abi;
  const before=await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[0].address]});
  await client.waitForTransactionReceipt({hash:await wallets[1].writeContract({address:escrow,abi,functionName:"requestCancellation",args:[1n]})});
  await client.waitForTransactionReceipt({hash:await wallets[0].writeContract({address:escrow,abi,functionName:"acceptCancellation",args:[1n]})});
  const after=await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[0].address]});
  const employee=await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[1].address]});
  assert.equal(after-before,4_700_000n);assert.equal(employee,300_000n);
  const request=await client.readContract({address:escrow,abi,functionName:"requests",args:[1n]});assert.equal(request[10],5);
});

test("arbitration enforces the exact remaining balance and closes once",async()=>{
  const ctx=await fixture();await fundAndAccept(ctx);const{client,wallets,accounts,token,escrow,artifacts}=ctx,abi=artifacts.RendaSignalEscrow.abi;
  const employerBefore=await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[0].address]});
  await client.waitForTransactionReceipt({hash:await wallets[0].writeContract({address:escrow,abi,functionName:"openDispute",args:[1n]})});
  await assert.rejects(wallets[3].writeContract({address:escrow,abi,functionName:"arbitrate",args:[1n,2_000_000n,2_000_000n]}),/bad split|revert/i);
  await client.waitForTransactionReceipt({hash:await wallets[3].writeContract({address:escrow,abi,functionName:"arbitrate",args:[1n,2_000_000n,2_700_000n]})});
  assert.equal(await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[0].address]}),employerBefore+2_000_000n);
  assert.equal(await client.readContract({address:token,abi:artifacts.TestUSDT.abi,functionName:"balanceOf",args:[accounts[1].address]}),3_000_000n);
  await assert.rejects(wallets[3].writeContract({address:escrow,abi,functionName:"arbitrate",args:[1n,0n,4_700_000n]}),/not arbitrator|revert/i);
});
