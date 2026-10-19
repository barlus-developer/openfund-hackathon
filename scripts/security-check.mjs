import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const source = readFileSync("contracts/src/OpenFund.sol", "utf8").replace(
  /\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
  "",
);
for (const pattern of [
  /\bdelegatecall\b/,
  /\bselfdestruct\b/,
  /\bOwnable\b/,
  /\bAccessControl\b/,
  /\.call\s*[({]/,
  /\btx\.origin\b/,
])
  assert(
    !pattern.test(source),
    `Forbidden core authority/execution pattern ${pattern}`,
  );
assert.match(source, /address public immutable oflToken/);
const core = JSON.parse(
  readFileSync("contracts/out/OpenFund.sol/OpenFund.json", "utf8"),
);
const token = JSON.parse(
  readFileSync("contracts/out/OFLToken.sol/OFLToken.json", "utf8"),
);
const banned = new Set([
  "owner",
  "upgradeTo",
  "upgradeToAndCall",
  "withdraw",
  "sweep",
  "rescueTokens",
  "execute",
  "forceTransfer",
  "freeze",
  "blacklist",
  "burnFrom",
  "unprotect",
  "removeProtectedFund",
]);
for (const artifact of [core, token])
  for (const item of artifact.abi)
    if (item.type === "function")
      assert(!banned.has(item.name), `Unexpected privileged ABI: ${item.name}`);
const runtimeBytes = core.deployedBytecode.object.replace(/^0x/, "").length / 2;
assert(runtimeBytes < 24576, "Core exceeds EIP-170 runtime size.");
console.log(
  `PASS: source/ABI policy checks; OpenFund runtime ${runtimeBytes} bytes. This is a policy scan, not an independent security audit.`,
);
