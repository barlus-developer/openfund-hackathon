import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectDeployment,
  mergeDeployment,
  runtimeMatches,
} from "../deployment-utils.mjs";
const core = "0x1111111111111111111111111111111111111111";
const token = "0x2222222222222222222222222222222222222222";
const hash = `0x${"ab".repeat(32)}`;
const artifact = {
  abi: [],
  deployedBytecode: {
    object: "0x123400005678",
    immutableReferences: { value: [{ start: 2, length: 2 }] },
  },
};
const artifacts = { OpenFund: artifact, OFLToken: artifact };
const client = (override = {}) => ({
  getChainId: async () => 11155111,
  getTransactionReceipt: async () => ({
    status: "success",
    contractAddress: core,
    to: null,
    blockNumber: 100n,
    blockHash: hash,
  }),
  readContract: async ({ functionName }) =>
    ({
      isOpenFundProtocol: true,
      oflToken: token,
      deploymentChainId: 11155111n,
      protectedFunds: true,
      issuer: core,
      decimals: 18,
      symbol: "OFL",
    })[functionName],
  getCode: async () => "0x1234abcd5678",
  getBlock: async () => ({ hash }),
  getBlockNumber: async () => 101n,
  ...override,
});
test("matches runtime bytecode while allowing only compiler-declared immutable slots", () => {
  assert(runtimeMatches("0x1234abcd5678", artifact));
  assert(!runtimeMatches("0x1234abcd5679", artifact));
  assert(!runtimeMatches("0x", artifact));
});
test("reads a real creation receipt and enforces protocol/token identity", async () => {
  assert.deepEqual(
    await inspectDeployment(client(), hash, 11155111, artifacts),
    {
      chainId: 11155111,
      openFundAddress: core,
      oflTokenAddress: token,
      deploymentBlock: "100",
      deploymentBlockHash: hash,
    },
  );
  await assert.rejects(
    inspectDeployment(client(), hash, 1, artifacts),
    /chain ID/,
  );
  await assert.rejects(
    inspectDeployment(
      client({ getCode: async () => "0x1234abcd5679" }),
      hash,
      11155111,
      artifacts,
    ),
    /runtime/,
  );
  await assert.rejects(
    inspectDeployment(
      client({
        getTransactionReceipt: async () => ({ status: "success", to: core }),
      }),
      hash,
      11155111,
      artifacts,
    ),
    /creation/,
  );
});
test("requires protected ingress, canonical block and enough confirmations", async () => {
  const good = client();
  await assert.rejects(
    inspectDeployment(
      client({
        readContract: async (call) =>
          call.functionName === "protectedFunds"
            ? false
            : good.readContract(call),
      }),
      hash,
      11155111,
      artifacts,
    ),
    /registerProtectedFund/,
  );
  await assert.rejects(
    inspectDeployment(
      client({ getBlock: async () => ({ hash: "0xdifferent" }) }),
      hash,
      11155111,
      artifacts,
    ),
    /canonical/,
  );
  await assert.rejects(
    inspectDeployment(
      client({ getBlockNumber: async () => 100n }),
      hash,
      11155111,
      artifacts,
    ),
    /confirmations/,
  );
});
test("keeps local and other dev versions, and never repoints an existing version", () => {
  const local = {
    version: "local-v1",
    chainId: 31337,
    openFundAddress: core,
    deploymentBlockHash: hash,
    demoMode: true,
  };
  const remote = { ...local, version: "test-v1", chainId: 11155111 };
  assert.equal(mergeDeployment([local], remote).length, 2);
  assert.equal(mergeDeployment([remote, local], remote).length, 2);
  assert.throws(
    () => mergeDeployment([remote], { ...remote, openFundAddress: token }),
    /Choose a new/,
  );
});
