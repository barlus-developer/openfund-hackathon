import { decodeEventLog, type Hash, type Log } from "viem";
import { openFundAbi } from "./generated/OpenFund";
import { clientFor, verifyDeployment, type Deployment } from "./deployments";

export type Activity = {
  eventName: string;
  args: Record<string, unknown>;
  transactionHash: Hash;
  blockNumber: bigint;
  logIndex: number;
};
export function parseLogs(logs: Log[]): Activity[] {
  const unique = new Map<string, Activity>();
  for (const log of logs) {
    if (
      log.removed ||
      !log.transactionHash ||
      log.blockNumber === null ||
      log.logIndex === null
    )
      continue;
    try {
      const e = decodeEventLog({
        abi: openFundAbi,
        data: log.data,
        topics: log.topics,
      });
      unique.set(`${log.transactionHash}:${log.logIndex}`, {
        eventName: e.eventName,
        args: e.args as Record<string, unknown>,
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber,
        logIndex: log.logIndex,
      });
    } catch {
      /* Unknown events are not protocol activity. */
    }
  }
  return [...unique.values()].sort((a, b) =>
    a.blockNumber === b.blockNumber
      ? a.logIndex - b.logIndex
      : a.blockNumber < b.blockNumber
        ? -1
        : 1,
  );
}
export async function fetchWindow<T>(
  from: bigint,
  to: bigint,
  fetch: (a: bigint, b: bigint) => Promise<T[]>,
  signal?: AbortSignal,
): Promise<T[]> {
  signal?.throwIfAborted();
  try {
    const logs = await fetch(from, to);
    signal?.throwIfAborted();
    return logs;
  } catch (error) {
    signal?.throwIfAborted();
    if (from === to) throw error;
    const mid = (from + to) / 2n;
    // Sequential subdivision respects provider range restrictions and avoids a request burst.
    const left = await fetchWindow(from, mid, fetch, signal);
    return [...left, ...(await fetchWindow(mid + 1n, to, fetch, signal))];
  }
}
const serialize = (v: unknown) =>
  JSON.stringify(v, (_, x) =>
    typeof x === "bigint" ? { $bigint: x.toString() } : x,
  );
const deserialize = (s: string) =>
  JSON.parse(s, (_, x) =>
    x && typeof x === "object" && "$bigint" in x ? BigInt(x.$bigint) : x,
  );
export type ActivityPage = {
  events: Activity[];
  from: bigint;
  to: bigint;
  head: bigint;
  hash: Hash;
};
export function cacheKey(d: Deployment, from: bigint) {
  return `ofl-logs-v1:${d.chainId}:${d.openFundAddress}:${d.deploymentBlockHash}:${from}`;
}
export async function activityPage(
  d: Deployment,
  from: bigint,
  signal?: AbortSignal,
): Promise<ActivityPage> {
  await verifyDeployment(d);
  signal?.throwIfAborted();
  const c = clientFor(d);
  const head = await c.getBlockNumber({ cacheTime: 0 });
  const to = from + 1999n < head ? from + 1999n : head;
  const key = cacheKey(d, from);
  // Cached historical windows are always checked against the chain's block hash.
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      const page = deserialize(stored) as ActivityPage;
      const block = await c.getBlock({ blockNumber: page.to });
      if (page.from === from && page.to === to && page.hash === block.hash)
        return { ...page, head };
      localStorage.removeItem(key);
    }
  } catch {
    /* Cache is optional and never authoritative. */
  }
  const logs = await fetchWindow(
    from,
    to,
    (a, b) =>
      c.getLogs({ address: d.openFundAddress, fromBlock: a, toBlock: b }),
    signal,
  );
  const block = await c.getBlock({ blockNumber: to });
  const page = { events: parseLogs(logs), from, to, head, hash: block.hash! };
  if (to + 12n < head)
    try {
      localStorage.setItem(key, serialize(page));
    } catch {
      /* Full or unavailable storage. */
    }
  return page;
}
