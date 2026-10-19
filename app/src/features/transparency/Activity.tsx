import { eventLabels } from "@/app/labels";
import { useActivity } from "@/hooks/useActivity";
import { Button } from "@/components/ui/button";
import {
  Panel,
  EmptyState,
  Loading,
  ErrorNotice,
  TxHash,
} from "@/components/common";
import {
  type Deployment,
  defaultDeployment,
  fundPath,
} from "@/web3/deployments";
import { useFundContext } from "@/features/funds/FundLayout";
import { Link } from "react-router-dom";
import { ofl } from "@/lib/amount";
import type { Activity as Event } from "@/web3/events";
export function ScanControls({ q }: { q: ReturnType<typeof useActivity> }) {
  return (
    <div className="stack">
      <small>
        {q.coverage
          ? `ໂຫຼດຮອດບັນທຶກ ${q.coverage.to} / ${q.coverage.head}. ${q.hasNextPage ? "ຍັງໂຫຼດບໍ່ຄົບ. ກົດໂຫຼດເພີ່ມເພື່ອເບິ່ງລາຍການອື່ນ." : "ໂຫຼດຮອດຂໍ້ມູນລ່າສຸດແລ້ວ. ກົດໂຫຼດໃໝ່ເພື່ອອັບເດດ."}`
          : "ກຳລັງໂຫຼດປະຫວັດເປັນຊ່ວງ. ສາມາດໂຫຼດເພີ່ມເພື່ອເບິ່ງລາຍການອື່ນ."}
      </small>
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          disabled={q.isFetching}
          onClick={() => q.refetch()}
        >
          {" "}
          ໂຫຼດຂໍ້ມູນໃໝ່{" "}
        </Button>
        {q.hasNextPage ? (
          <Button
            disabled={q.isFetchingNextPage}
            onClick={() => q.fetchNextPage()}
          >
            {" "}
            ໂຫຼດປະຫວັດເພີ່ມ{" "}
          </Button>
        ) : null}
        {q.isFetching ? (
          <Button variant="outline" onClick={q.cancel}>
            {" "}
            ຢຸດການໂຫຼດ{" "}
          </Button>
        ) : null}
      </div>
      <ErrorNotice error={q.error} />
    </div>
  );
}
export function EventRow({ event, d }: { event: Event; d: Deployment }) {
  const args = event.args;
  return (
    <div className="activity-row">
      <div>
        <strong>{eventLabels[event.eventName] ?? "ອັບເດດກອງທຶນ"}</strong>
        <p>
          {args.fundId !== undefined ? (
            <Link to={fundPath(d, String(args.fundId))}>
              {" "}
              ກອງທຶນ # {String(args.fundId)} ·{" "}
            </Link>
          ) : null}
          {args.amount !== undefined
            ? `${ofl(args.amount as bigint)} OFL · `
            : ""}{" "}
          ບັນທຶກ {event.blockNumber.toString()}
        </p>
        <code>
          {String(
            args.donor ||
              args.approver ||
              args.recipient ||
              args.manager ||
              args.proposer ||
              args.author ||
              "",
          )}
        </code>
        {args.title ? <p>{String(args.title)}</p> : null}
        {typeof args.proposalId === "bigint" &&
        args.proposalId > 0n &&
        args.fundId !== undefined ? (
          <Link
            to={
              fundPath(d, String(args.fundId)) +
              `/proposals/${String(args.proposalId)}`
            }
          >
            {" "}
            ຂໍ້ສະເໜີ # {String(args.proposalId)} ↗
          </Link>
        ) : null}
        <details>
          <summary> ລາຍລະອຽດທາງເຕັກນິກ </summary>
          <pre className="summary-box">
            {JSON.stringify(
              args,
              (_, v) => (typeof v === "bigint" ? v.toString() : v),
              2,
            )}
          </pre>
        </details>
      </div>
      <div>
        <TxHash d={d} hash={event.transactionHash} />
        <small> ລາຍການ # {event.logIndex}</small>
      </div>
    </div>
  );
}
export function ActivityFeed({
  d,
  fundId,
  wallet,
  payoutsOnly = false,
}: {
  d: Deployment;
  fundId?: bigint;
  wallet?: string;
  payoutsOnly?: boolean;
}) {
  const q = useActivity(d);
  const events = q.events
    .filter(
      (e) =>
        (!fundId || e.args.fundId === fundId) &&
        (!payoutsOnly || e.eventName === "PayoutExecuted") &&
        (!wallet ||
          Object.values(e.args).some(
            (v) =>
              typeof v === "string" && v.toLowerCase() === wallet.toLowerCase(),
          )),
    )
    .slice()
    .reverse();
  return (
    <Panel
      title={payoutsOnly ? "ປະຫວັດການຈ່າຍເງິນ" : "ປະຫວັດການດຳເນີນງານສາທາລະນະ"}
      description="ຕິດຕາມການສະໜັບສະໜູນ ການອະນຸມັດ ແລະການໃຊ້ເງິນຂອງກອງທຶນ"
    >
      <div className="stack">
        <ScanControls q={q} />
        {q.isLoading ? (
          <Loading />
        ) : events.length ? (
          events.map((e) => (
            <EventRow
              key={`${d.chainId}:${e.transactionHash}:${e.logIndex}`}
              event={e}
              d={d}
            />
          ))
        ) : !q.error ? (
          <EmptyState />
        ) : null}
      </div>
    </Panel>
  );
}
export function FundActivity() {
  const { d, row } = useFundContext();
  return <ActivityFeed d={d} fundId={row.id} />;
}
export function FundPayouts() {
  const { d, row } = useFundContext();
  return <ActivityFeed d={d} fundId={row.id} payoutsOnly />;
}
export function GlobalActivity() {
  return defaultDeployment ? (
    <ActivityFeed d={defaultDeployment} />
  ) : (
    <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
  );
}
