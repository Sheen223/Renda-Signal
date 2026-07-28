import {getPolygonConfig} from "@/lib/polygon";
export async function GET(){const config=getPolygonConfig();return config?Response.json({configured:true,...config}):Response.json({configured:false,chainId:80002,chainName:"Polygon Amoy",tokenSymbol:"tUSDT",message:"Testnet contracts have not been deployed yet."})}
