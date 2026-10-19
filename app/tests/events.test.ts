import { describe, it, expect, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics, type Log } from "viem";
import { openFundAbi } from "../src/web3/generated/OpenFund";
import { parseLogs, fetchWindow, cacheKey } from "../src/web3/events";
import { defaultDeployment } from "../src/web3/deployments";
const log = {
  address: "0x1111111111111111111111111111111111111111",
  blockHash: "0x" + "01".repeat(32),
  transactionHash: "0x" + "02".repeat(32),
  blockNumber: 12n,
  transactionIndex: 0,
  logIndex: 3,
  removed: false,
  topics: encodeEventTopics({
    abi: openFundAbi,
    eventName: "DonationReceived",
    args: { fundId: 1n, donor: "0x1111111111111111111111111111111111111111" },
  }),
  data: encodeAbiParameters(
    [{ type: "uint256" }, { type: "uint256" }],
    [10n, 20n],
  ),
} as Log;
describe("RPC event history", () => {
  it("deduplicates and omits removed/reorged logs", () => {
    expect(parseLogs([log, log, { ...log, removed: true }])).toHaveLength(1);
    expect(parseLogs([{ ...log, removed: true }])).toEqual([]);
  });
  it("subdivides restrictive RPC ranges without losing records", async () => {
    const fetch = vi.fn(async (a: bigint, b: bigint) => {
      if (b - a > 1n) throw Error("Range limit");
      return [a, b];
    });
    expect(await fetchWindow(1n, 4n, fetch)).toEqual([1n, 2n, 3n, 4n]);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("surfaces a partial RPC failure rather than pretending complete history", async () => {
    await expect(
      fetchWindow(1n, 3n, async (a, b) => {
        if (b >= 2n) throw Error("offline");
        return [a];
      }),
    ).rejects.toThrow("offline");
  });
  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      fetchWindow(1n, 2n, async () => [], controller.signal),
    ).rejects.toThrow();
  });
  it("invalidates caches on chain/address/deployment identity changes", () => {
    const d = defaultDeployment!;
    expect(cacheKey(d, 1n)).not.toBe(
      cacheKey({ ...d, chainId: d.chainId + 1 }, 1n),
    );
    expect(cacheKey(d, 1n)).not.toBe(
      cacheKey(
        {
          ...d,
          deploymentBlockHash: ("0x" + "ff".repeat(32)) as `0x${string}`,
        },
        1n,
      ),
    );
  });
});
