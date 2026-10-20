import { readFileSync, writeFileSync } from "node:fs";
import { env } from "./config.mjs";
import { client, requireAnvil, rpc } from "./local-env.mjs";
await requireAnvil();
const manifests = JSON.parse(readFileSync("deployments/official.json", "utf8"));
if (process.argv.includes("--check")) {
  if (
    manifests.some((d) => d.version === "local-v1") &&
    env("REPLACE_LOCAL_DEPLOYMENT") !== "1"
  )
    throw Error(
      "Local manifest already exists. For an intentional fresh deployment use REPLACE_LOCAL_DEPLOYMENT=1. Existing funds remain on their original address.",
    );
  process.exit(0);
}
const broadcast = JSON.parse(
  readFileSync(
    "contracts/broadcast/DeployLocal.s.sol/31337/run-latest.json",
    "utf8",
  ),
);
const deployed = (name) =>
  broadcast.transactions.find(
    (t) => t.transactionType === "CREATE" && t.contractName === name,
  )?.contractAddress;
const token = deployed("OFLToken"),
  core = deployed("OpenFund");
if (!token || !core) throw Error("Missing actual deployment receipts.");
const tx = broadcast.transactions.find(
  (t) => t.contractAddress === core && t.transactionType === "CREATE",
);
const receipt = await client.getTransactionReceipt({ hash: tx.hash });
const block = await client.getBlock({ blockNumber: receipt.blockNumber });
const current = manifests.filter((d) => d.version !== "local-v1");
current.unshift({
  chainId: 31337,
  version: "local-v1",
  name: "Local Development Network",
  openFundAddress: core,
  oflTokenAddress: token,
  deploymentBlock: receipt.blockNumber.toString(),
  deploymentBlockHash: block.hash,
  rpcUrls: [rpc],
  demoMode: true,
  testnet: true,
  confirmations: 1,
});
writeFileSync(
  "deployments/official.json",
  JSON.stringify(current, null, 2) + "\n",
);
console.log(
  `Actual deployment: OpenFund ${core}, OFL ${token}, block ${receipt.blockNumber}`,
);
