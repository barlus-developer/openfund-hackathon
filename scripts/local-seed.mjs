import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import {
  encodeAbiParameters,
  keccak256,
  stringToHex,
  parseEther,
  decodeEventLog,
} from "viem";
import {
  account,
  artifact,
  transact,
  client,
  requireAnvil,
} from "./local-env.mjs";
await requireAnvil();
const d = JSON.parse(readFileSync("deployments/official.json", "utf8")).find(
  (d) => d.version === "local-v1",
);
if (!d) throw Error("Deploy first.");
const core = artifact("OpenFund").abi,
  token = artifact("OFLToken").abi;
if (
  (await client.readContract({
    address: d.openFundAddress,
    abi: core,
    functionName: "fundCount",
  })) !== 0n
)
  throw Error(
    "Seed refuses a nonempty protocol. Use the existing demo or start a fresh chain.",
  );
const templates = [
  {
    title: "Flood relief · Savannakhet",
    summary:
      "Emergency food and clean water for affected communities. Local demo.",
    category: "Emergency relief",
    mode: 0,
    policy: 1,
    goal: 2000000n,
    days: 30,
    threshold: 2,
    members: 3,
    amount: 240000n,
  },
  {
    title: "Healthcare equipment · Champasak",
    summary:
      "Community clinic equipment. Contributions refundable if the target is missed. Local demo.",
    category: "Healthcare",
    mode: 0,
    policy: 0,
    goal: 1500000n,
    days: 1,
    threshold: 3,
    members: 5,
    amount: 180000n,
  },
  {
    title: "Learning together · Vientiane",
    summary:
      "Books, workshops and shared learning resources. Irrevocable continuous donations. Local demo.",
    category: "Education",
    mode: 1,
    policy: 0,
    goal: 0n,
    days: 0,
    threshold: 2,
    members: 3,
    amount: 95000n,
  },
];
const receipts = [];
for (const t of templates) {
  const p = {
    fundingMode: t.mode,
    underfundingPolicy: t.policy,
    recipientPolicy: 0,
    fundingGoal: t.goal * 10n ** 18n,
    duration: BigInt(t.days * 86400),
    threshold: t.threshold,
    minimumApprovalThreshold: t.threshold,
    termsHash: keccak256(stringToHex(`${t.title}: ${t.summary}`)),
    manager: account(0).address,
    title: t.title,
    summary: t.summary,
    category: t.category,
    metadataURI: "",
    termsURI: "",
  };
  const r = await transact(0, d.openFundAddress, core, "createFund", [
    p,
    Array.from({ length: t.members }, (_, i) => account(i).address),
    [],
  ]);
  const event = r.logs
    .map((log) => {
      try {
        return decodeEventLog({ abi: core, ...log });
      } catch {
        return null;
      }
    })
    .find((e) => e?.eventName === "FundCreated");
  const id = event.args.fundId;
  const donation = await transact(
    5,
    d.oflTokenAddress,
    token,
    "transferAndCall",
    [
      d.openFundAddress,
      t.amount * 10n ** 18n,
      encodeAbiParameters([{ type: "uint256" }], [id]),
    ],
  );
  receipts.push({
    fundId: id.toString(),
    created: r.transactionHash,
    donated: donation.transactionHash,
  });
}
// A real pending education payout for approvers to inspect and approve in MetaMask.
const proposal = await transact(0, d.openFundAddress, core, "createProposal", [
  BigInt(receipts.at(-1).fundId),
  {
    kind: 0,
    target: account(4).address,
    amount: parseEther("2500"),
    value: 0,
    purpose: "Books for community workshops",
    evidenceURI: "",
    evidenceHash: "0x" + "00".repeat(32),
  },
]);
mkdirSync(".local", { recursive: true });
writeFileSync(
  ".local/seed-receipts.json",
  JSON.stringify({ receipts, proposal: proposal.transactionHash }, null, 2),
);
console.log(
  "Created three actual on-chain demo funds and a pending education payout.",
);
console.log(receipts);
