import {createPublicClient,http,parseAbi} from "viem";
import {polygonAmoy} from "viem/chains";
import {env} from "cloudflare:workers";

export const AMOY_CHAIN_ID=80002;
export const AMOY_CHAIN_HEX="0x13882";
export const AMOY_RPC="https://polygon-amoy.drpc.org";
export const erc20Abi=parseAbi([
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
]);
export const escrowAbi=parseAbi([
  "function fundRequest(bytes32 targetIdentity,bytes32 termsHash,uint256 total,uint256 attentionFee,uint64 acceptBy,uint64 deliverBy,address arbitrator) returns (uint256)",
  "function acceptRequest(uint256 id,uint64 authorizationExpiry,bytes32 nonce,bytes signature)",
  "function submitEvidence(uint256 id,bytes32 evidenceHash)",
  "function proposeSettlement(uint256 id,uint256 employerAmount,uint256 employeeAmount)",
  "function acceptSettlement(uint256 id)",
  "function openDispute(uint256 id)",
  "function requests(uint256) view returns (address employer,address employee,address arbitrator,uint256 total,uint256 attentionFee,uint64 acceptBy,uint64 deliverBy,bytes32 targetIdentity,bytes32 termsHash,bytes32 evidenceHash,uint8 status)",
  "function settlements(uint256) view returns (uint256 employerAmount,uint256 employeeAmount,address proposer)",
  "event RequestFunded(uint256 indexed id,address indexed employer,bytes32 indexed targetIdentity,uint256 total)",
  "event RequestAccepted(uint256 indexed id,address indexed employee,uint256 attentionFee)",
  "event EvidenceSubmitted(uint256 indexed id,bytes32 evidenceHash)",
  "event DisputeOpened(uint256 indexed id)",
  "event SettlementProposed(uint256 indexed id,address indexed proposer,uint256 employerAmount,uint256 employeeAmount)",
  "event RequestSettled(uint256 indexed id,uint256 employerAmount,uint256 employeeAmount)",
]);
export type PolygonConfig={chainId:number;chainName:string;rpcUrl:string;explorerUrl:string;escrowAddress:`0x${string}`;tokenAddress:`0x${string}`;arbitratorAddress:`0x${string}`;tokenSymbol:string;tokenDecimals:number};
export function getPolygonConfig():PolygonConfig|null{const e=env as unknown as Record<string,string|undefined>;const escrow=e.ESCROW_CONTRACT_ADDRESS,token=e.TEST_TOKEN_ADDRESS,arbitrator=e.ARBITRATOR_ADDRESS;if(!escrow||!token||!arbitrator)return null;return{chainId:AMOY_CHAIN_ID,chainName:"Polygon Amoy",rpcUrl:e.AMOY_RPC_URL||AMOY_RPC,explorerUrl:"https://amoy.polygonscan.com",escrowAddress:escrow as `0x${string}`,tokenAddress:token as `0x${string}`,arbitratorAddress:arbitrator as `0x${string}`,tokenSymbol:"tUSDT",tokenDecimals:6}}
export function polygonClient(rpcUrl=AMOY_RPC){return createPublicClient({chain:polygonAmoy,transport:http(rpcUrl)})}
