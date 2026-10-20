import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import {
  parseEventLogs,
  encodeAbiParameters,
  keccak256,
  stringToHex,
  parseEther,
  zeroAddress,
  zeroHash,
} from "viem";
import {
  account,
  artifact,
  transact,
  client,
  requireAnvil,
} from "./local-env.mjs";
import { inspectDeployment } from "./deployment-utils.mjs";
await requireAnvil();
const d = JSON.parse(readFileSync("deployments/official.json", "utf8")).find(
  (d) => d.version === "local-v1",
);
const abi = artifact("OpenFund").abi,
  token = artifact("OFLToken").abi;
const creationBlock = await client.getBlock({
  blockNumber: BigInt(d.deploymentBlock),
  includeTransactions: true,
});
let creationHash;
for (const transaction of creationBlock.transactions) {
  if (transaction.to !== null) continue;
  const receipt = await client.getTransactionReceipt({
    hash: transaction.hash,
  });
  if (
    receipt.contractAddress?.toLowerCase() === d.openFundAddress.toLowerCase()
  )
    creationHash = transaction.hash;
}
assert(creationHash, "Actual OpenFund creation receipt must exist.");
const inspected = await inspectDeployment(
  client,
  creationHash,
  d.chainId,
  { OpenFund: artifact("OpenFund"), OFLToken: artifact("OFLToken") },
  1,
);
assert.equal(
  inspected.openFundAddress.toLowerCase(),
  d.openFundAddress.toLowerCase(),
);
assert.equal(inspected.deploymentBlockHash, d.deploymentBlockHash);
console.log(
  "PASS: deployment importer validated the actual creation receipt, block hash, protected registration and both compiled runtimes.",
);
const read = (functionName, args = []) =>
  client.readContract({ address: d.openFundAddress, abi, functionName, args });
const send = (i, fn, args) => transact(i, d.openFundAddress, abi, fn, args);
const snapshot = await client.request({ method: "evm_snapshot" });
const receipts = [];
function idFrom(r, name, key) {
  const [e] = parseEventLogs({
    abi,
    eventName: name,
    logs: r.logs.filter(
      (log) => log.address.toLowerCase() === d.openFundAddress.toLowerCase(),
    ),
  });
  assert(e);
  return e.args[key];
}
async function record(promise) {
  const r = await promise;
  receipts.push(r.transactionHash);
  return r;
}
async function propose(id, kind, target = zeroAddress, amount = 0n, value = 0) {
  return idFrom(
    await record(
      send(0, "createProposal", [
        id,
        {
          kind,
          target,
          amount,
          value,
          purpose: "Verified local operation",
          evidenceURI: "",
          evidenceHash: zeroHash,
        },
      ]),
    ),
    "ProposalCreated",
    "proposalId",
  );
}
try {
  for (const mode of [1, 0]) {
    const params = {
      fundingMode: mode,
      underfundingPolicy: 0,
      recipientPolicy: 0,
      fundingGoal: mode === 0 ? parseEther("100") : 0n,
      duration: mode === 0 ? 86400n : 0n,
      threshold: 1,
      minimumApprovalThreshold: 1,
      termsHash: keccak256(stringToHex("Independent local test terms")),
      manager: account(0).address,
      title:
        mode === 1 ? "Verified community treasury" : "Verified refundable fund",
      summary: "Actual local verification; state reverted after test.",
      category: "Education",
      metadataURI: "",
      termsURI: "",
    };
    const fundId = idFrom(
      await record(send(0, "createFund", [params, [account(0).address], []])),
      "FundCreated",
      "fundId",
    );
    await record(
      transact(5, d.oflTokenAddress, token, "transferAndCall", [
        d.openFundAddress,
        parseEther("10"),
        encodeAbiParameters([{ type: "uint256" }], [fundId]),
      ]),
    );
    assert.equal(await read("getFundBalance", [fundId]), parseEther("10"));
    if (mode === 1) {
      const pid = await propose(
        fundId,
        0,
        account(4).address,
        parseEther("10"),
      );
      await record(send(0, "approveProposal", [pid]));
      await record(send(3, "executeProposal", [pid]));
      await record(
        send(0, "publishReport", [
          fundId,
          pid,
          "Public equipment receipt",
          "https://example.invalid/test-only-public-report",
          keccak256(stringToHex("Public demo report")),
        ]),
      );
      const closure = await propose(fundId, 7);
      await record(send(0, "approveProposal", [closure]));
      await client.request({ method: "evm_increaseTime", params: [86400] });
      await client.request({ method: "evm_mine", params: [] });
      await record(send(2, "executeProposal", [closure]));
      await record(send(4, "finalizeClose", [fundId]));
      assert.equal(await read("getEffectiveFundStatus", [fundId]), 4);
    } else {
      await client.request({ method: "evm_increaseTime", params: [86400] });
      await client.request({ method: "evm_mine", params: [] });
      assert.equal(
        await read("getRefundableAmount", [fundId, account(5).address]),
        parseEther("10"),
      );
      await record(send(5, "claimRefund", [fundId]));
      await record(send(4, "finalizeClose", [fundId]));
      assert.equal(
        await read("getRefundableAmount", [fundId, account(5).address]),
        0n,
      );
    }
  }
  let sum = 0n;
  for (let i = 1n; i <= (await read("fundCount")); i++) {
    const f = await read("getFund", [i]);
    assert.equal(f.balance, f.totalRaised - f.totalWithdrawn - f.totalRefunded);
    sum += f.balance;
  }
  assert.equal(sum, await read("totalAccountedOFL"));
  assert.ok(
    (await client.readContract({
      address: d.oflTokenAddress,
      abi: token,
      functionName: "balanceOf",
      args: [d.openFundAddress],
    })) >= sum,
  );
  console.log(
    `PASS: ${receipts.length} mined transactions; create, donate, approve, payout, report, timelock, close, self-refund, accounting.`,
  );
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/verification-receipts.json",
    JSON.stringify({ receipts, revertedAfterTest: true }, null, 2),
  );
} finally {
  assert.equal(
    await client.request({ method: "evm_revert", params: [snapshot] }),
    true,
  );
  console.log(
    "Restored pre-test Anvil snapshot; receipt hashes above are test-run evidence and no longer canonical chain history.",
  );
}
