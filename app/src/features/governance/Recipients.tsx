import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { isAddress } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useActivity } from "@/hooks/useActivity";
import { clientFor } from "@/web3/deployments";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { Panel, EmptyState, ErrorNotice, Loading } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ScanControls } from "@/features/transparency/Activity";

export function Recipients() {
  const { d, row } = useFundContext();
  const q = useActivity(d);
  const [limit, setLimit] = useState(12);
  const candidates = [
    ...new Set(
      q.events
        .filter(
          (e) => e.eventName === "RecipientChanged" && e.args.fundId === row.id,
        )
        .map((e) => String(e.args.recipient).toLowerCase()),
    ),
  ].filter((a) => isAddress(a));
  // Events discover wallets; current contract reads decide membership, including removals outside this tab.
  const results = useQueries({
    queries: candidates.slice(0, limit).map((address) => ({
      queryKey: ["recipient", d.version, row.id.toString(), address],
      queryFn: () =>
        clientFor(d).readContract({
          address: d.openFundAddress,
          abi: openFundAbi,
          functionName: "isAllowedRecipient",
          args: [row.id, address],
        }),
      refetchInterval: 10000,
    })),
  });
  const allowed = candidates.slice(0, limit).filter((_, i) => results[i].data);
  return (
    <Panel title="ຜູ້ຮັບທີ່ອະນຸຍາດ">
      <div className="flex flex-col gap-4">
        <ScanControls q={q} />
        <p className="text-xs text-muted-foreground">
          ສະແດງກະເປົາທີ່ພົບໃນປະຫວັດທີ່ໂຫຼດແລ້ວ ແລະຍັງມີສິດຮັບເງິນປັດຈຸບັນ.
        </p>
        {q.isLoading || results.some((r) => r.isLoading) ? <Loading /> : null}
        {results.map((r, i) =>
          r.error ? <ErrorNotice key={candidates[i]} error={r.error} /> : null,
        )}
        {allowed.length ? (
          <ul className="flex flex-col gap-2">
            {allowed.map((address) => (
              <li key={address}>
                <code>{address}</code>
              </li>
            ))}
          </ul>
        ) : !q.error && !q.isLoading && results.every((r) => r.isSuccess) ? (
          <EmptyState description="ຍັງບໍ່ພົບຜູ້ຮັບທີ່ອະນຸຍາດໃນຂໍ້ມູນທີ່ໂຫຼດ." />
        ) : null}
        {candidates.length > limit ? (
          <Button variant="outline" onClick={() => setLimit((n) => n + 12)}>
            ໂຫຼດຜູ້ຮັບເພີ່ມ 12 ຄົນ
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
