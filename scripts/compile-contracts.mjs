import fs from "node:fs";
import path from "node:path";
import solc from "solc";

const sources={};for(const file of ["RendaSignalEscrow.sol","TestUSDT.sol"])sources[`contracts/${file}`]={content:fs.readFileSync(`contracts/${file}`,"utf8")};
const input={language:"Solidity",sources,settings:{evmVersion:"paris",optimizer:{enabled:true,runs:200},outputSelection:{"*":{"*":["abi","evm.bytecode.object"]}}}};
const output=JSON.parse(solc.compile(JSON.stringify(input)));const errors=(output.errors||[]).filter(e=>e.severity==="error");if(errors.length){console.error(errors.map(e=>e.formattedMessage).join("\n"));process.exit(1)}
fs.mkdirSync("contract-artifacts",{recursive:true});const browser={};for(const[file,contracts]of Object.entries(output.contracts)){for(const[name,artifact]of Object.entries(contracts)){const base=`${file.replace(/[\\/.]/g,"_")}_${name}`;fs.writeFileSync(path.join("contract-artifacts",`${base}.abi`),JSON.stringify(artifact.abi));fs.writeFileSync(path.join("contract-artifacts",`${base}.bin`),artifact.evm.bytecode.object);if(name==="RendaSignalEscrow"||name==="TestUSDT")browser[name]={abi:artifact.abi,bytecode:`0x${artifact.evm.bytecode.object}`}}}fs.writeFileSync("public/contracts.json",JSON.stringify(browser));
console.log("Compiled RendaSignalEscrow and TestUSDT.");
