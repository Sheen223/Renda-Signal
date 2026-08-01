import assert from "node:assert/strict";
import {access,readFile} from "node:fs/promises";

const required=["README.md","LICENSE","SECURITY.md","docs/JUDGE.md","docs/CLAIMS.md","docs/DEPLOYMENTS.md","contracts/RendaSignalEscrow.sol","public/contracts.json","app/proof/page.tsx","app/api/proof/route.ts"];
await Promise.all(required.map(file=>access(new URL(`../${file}`,import.meta.url))));
const artifacts=JSON.parse(await readFile(new URL("../public/contracts.json",import.meta.url),"utf8"));
const functions=new Set(artifacts.RendaSignalEscrow.abi.filter(item=>item.type==="function").map(item=>item.name));
for(const name of ["fundRequest","acceptRequest","submitEvidence","approve","requestCancellation","acceptCancellation","openDispute","arbitrate"])assert(functions.has(name),`Missing escrow function: ${name}`);
const claims=await readFile(new URL("../docs/CLAIMS.md",import.meta.url),"utf8");
for(const label of ["Managed NIM","Polygon escrow","We do not claim"])assert(claims.includes(label),`Claims matrix is missing: ${label}`);
console.log(`Judge verification passed: ${required.length} required files and ${functions.size} escrow functions checked.`);
