import { readFileSync, writeFileSync } from "node:fs";
const type = (p) =>
  p.type.startsWith("tuple")
    ? `(${p.components.map(type).join(",")})${p.type.slice(5)}`
    : p.type;
const signature = (f) => `${f.name}(${f.inputs.map(type).join(",")})`;
let doc =
  "# Compiled contract API\n\nGenerated from actual Foundry artifacts by `node scripts/contract-docs.mjs`. Exact tuple field names and error payloads are in generated ABI TypeScript and `IOpenFund.sol`. IDs begin at 1. Getters reject unknown fund/proposal IDs. All amounts are uint256 OFL base units (18 decimals).\n\n";
for (const name of ["OpenFund", "OFLToken"]) {
  const a = JSON.parse(
    readFileSync(`contracts/out/${name}.sol/${name}.json`, "utf8"),
  ).abi;
  doc += `## ${name}\n\n| Function | Mutability |\n| --- | --- |\n`;
  for (const f of a.filter((f) => f.type === "function"))
    doc += `| \`${signature(f)}\` | ${f.stateMutability} |\n`;
  doc += "\nEvents (indexed fields are represented exactly in the ABI):\n\n";
  for (const e of a.filter((e) => e.type === "event"))
    doc += `- \`${signature(e)}\`\n`;
  doc += "\nErrors:\n\n";
  for (const e of a.filter((e) => e.type === "error"))
    doc += `- \`${signature(e)}\`\n`;
  doc += "\n";
}
doc +=
  "## Trust and deployment\n\nOpenFund has no owner or platform administration. Its only immutable external asset is OFL. Creator is historical; per-fund manager/approvers authorize prescribed proposals. OFL issuer only mints to unprotected recipients and appends protected protocol registrations; it cannot move treasury assets. See SECURITY_MODEL.md.\n\nOfficial deployment addresses and receipt-block hashes are generated in `deployments/official.json`. The React bundle imports the synchronized manifest. Version keys select exact chain/address/ABI combinations. New versions have separate treasuries; no forced migration exists.\n";
writeFileSync("docs/CONTRACTS.md", doc);
