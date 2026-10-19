import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { Address, ContractFunctionReturnType } from "viem";
import { openFundAbi } from "./generated/OpenFund";
import { tokenAbi } from "./generated/OFLToken";
import { clientFor, verifyDeployment, type Deployment } from "./deployments";
export type Fund = ContractFunctionReturnType<
  typeof openFundAbi,
  "view",
  "getFund"
>;
export type FundRow = {
  id: bigint;
  fund: Fund;
  status: number;
  approvers: readonly Address[];
};
export async function readFund(d: Deployment, id: bigint): Promise<FundRow> {
  const c = clientFor(d);
  const base = { address: d.openFundAddress, abi: openFundAbi } as const;
  const [fund, status, approvers] = await Promise.all([
    c.readContract({ ...base, functionName: "getFund", args: [id] }),
    c.readContract({
      ...base,
      functionName: "getEffectiveFundStatus",
      args: [id],
    }),
    c.readContract({ ...base, functionName: "getApprovers", args: [id] }),
  ]);
  return { id, fund, status, approvers };
}
export function useFund(d: Deployment, id: bigint) {
  return useQuery({
    queryKey: ["fund", d.version, id.toString()],
    queryFn: async () => {
      await verifyDeployment(d);
      return readFund(d, id);
    },
    refetchInterval: 10000,
  });
}
export function useFunds(d: Deployment) {
  return useInfiniteQuery({
    queryKey: ["funds", d.version],
    initialPageParam: 0n,
    queryFn: async ({ pageParam }) => {
      await verifyDeployment(d);
      const count = await clientFor(d).readContract({
        address: d.openFundAddress,
        abi: openFundAbi,
        functionName: "fundCount",
      });
      const end = count - pageParam;
      const ids = Array.from(
        { length: Number(end > 12n ? 12n : end > 0n ? end : 0n) },
        (_, i) => end - BigInt(i),
      );
      const rows: FundRow[] = [];
      // Bound concurrent RPC reads to 4 funds / 12 requests. No multicall contract is assumed on Anvil.
      for (let i = 0; i < ids.length; i += 4)
        rows.push(
          ...(await Promise.all(
            ids.slice(i, i + 4).map((id) => readFund(d, id)),
          )),
        );
      return { rows, count, next: pageParam + BigInt(rows.length) };
    },
    getNextPageParam: (p) => (p.next < p.count ? p.next : undefined),
    refetchInterval: 15000,
  });
}
export function useBalances(d: Deployment, address?: Address) {
  return useQuery({
    queryKey: ["balances", d.version, address],
    enabled: !!address,
    queryFn: async () => {
      const c = clientFor(d);
      const [ofl, native] = await Promise.all([
        c.readContract({
          address: d.oflTokenAddress,
          abi: tokenAbi,
          functionName: "balanceOf",
          args: [address!],
        }),
        c.getBalance({ address: address! }),
      ]);
      return { ofl, native };
    },
    refetchInterval: 10000,
  });
}
export type ProposalResult = ContractFunctionReturnType<
  typeof openFundAbi,
  "view",
  "getProposal"
>;
export function useProposal(d: Deployment, id: bigint) {
  return useQuery({
    queryKey: ["proposal", d.version, id.toString()],
    queryFn: () =>
      clientFor(d).readContract({
        address: d.openFundAddress,
        abi: openFundAbi,
        functionName: "getProposal",
        args: [id],
      }),
    refetchInterval: 5000,
  });
}
export const fundStatuses = [
  "FUNDRAISING",
  "ACTIVE",
  "REFUNDABLE",
  "CLOSING",
  "CLOSED",
];
export const proposalStatuses = [
  "PENDING",
  "TIMELOCKED",
  "EXECUTABLE",
  "EXECUTED",
  "CANCELLED",
  "EXPIRED",
  "INVALIDATED",
];
export const actionNames = [
  "PAYOUT",
  "CHANGE_MANAGER",
  "ADD_APPROVER",
  "REMOVE_APPROVER",
  "CHANGE_THRESHOLD",
  "ADD_RECIPIENT",
  "REMOVE_RECIPIENT",
  "START_CLOSURE",
];
