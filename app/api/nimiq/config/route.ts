import { getNimiqPaymentConfig } from "@/lib/nimiq-payments";
export async function GET(){return Response.json({configured:true,network:"Nimiq Mainnet",symbol:"NIM",decimals:5,...getNimiqPaymentConfig(),managed:true})}
