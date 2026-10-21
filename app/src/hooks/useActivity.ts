import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { activityPage } from "@/web3/events";
import type { Deployment } from "@/web3/deployments";
export function useActivity(d: Deployment) {
  const qc = useQueryClient();
  const key = ["activity", d.version, d.deploymentBlockHash];
  const q = useInfiniteQuery({
    queryKey: key,
    initialPageParam: BigInt(d.deploymentBlock),
    queryFn: ({ pageParam, signal }) => activityPage(d, pageParam, signal),
    getNextPageParam: (p) => (p.to < p.head ? p.to + 1n : undefined),
    staleTime: 10000,
    refetchInterval: 10000,
  });
  const events = q.data?.pages.flatMap((p) => p.events) || [];
  return {
    ...q,
    events,
    cancel: () => qc.cancelQueries({ queryKey: key }),
    coverage: q.data?.pages.at(-1),
  };
}
