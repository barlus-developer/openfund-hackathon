import {
  ChevronRight,
  ListPlus,
  Square,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
} from "lucide-react";
import { Disclosure, PageHeader } from "@/components/patterns";
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
  managerFundPath,
} from "@/web3/deployments";
import { useFundContext } from "@/features/funds/FundLayout";
import { Link, useLocation } from "react-router-dom";
import { formatOfl } from "@/lib/amount";
import type { Activity as Event } from "@/web3/events";
export function ScanControls({ q }: { q: ReturnType<typeof useActivity> }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" role="status">
          {q.isFetching
            ? "ກຳລັງໂຫຼດປະຫວັດ…"
            : q.hasNextPage
              ? "ປະຫວັດຍັງໂຫຼດບໍ່ຄົບ · ໂຫຼດເພີ່ມເພື່ອເບິ່ງລາຍການອື່ນ"
              : "ປະຫວັດທີ່ໂຫຼດແລ້ວ"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={q.isFetching}
            onClick={() => q.refetch()}
          >
            <RefreshCw data-icon="inline-start" aria-hidden="true" />
            ໂຫຼດໃໝ່
          </Button>
          {q.hasNextPage ? (
            <Button
              variant="outline"
              disabled={q.isFetching}
              onClick={() => q.fetchNextPage()}
            >
              <ListPlus data-icon="inline-start" aria-hidden="true" />
              ໂຫຼດປະຫວັດເພີ່ມ
            </Button>
          ) : null}
          {q.isFetching ? (
            <Button variant="ghost" onClick={q.cancel}>
              <Square data-icon="inline-start" aria-hidden="true" />
              ຢຸດການໂຫຼດ
            </Button>
          ) : null}
        </div>
      </div>
      <ErrorNotice error={q.error} />
    </div>
  );
}

export function EventRow({ event, d }: { event: Event; d: Deployment }) {
  const { pathname } = useLocation();
  const management = pathname.startsWith("/manager");
  const args = event.args;
  const actor = String(
    args.donor ||
      args.approver ||
      args.recipient ||
      args.manager ||
      args.proposer ||
      args.author ||
      "",
  );
  const Icon =
    event.eventName === "DonationReceived"
      ? ArrowDownLeft
      : event.eventName === "PayoutExecuted"
        ? ArrowUpRight
        : FileText;
  return (
    <article className="flex min-w-0 gap-4 border-b py-5 last:border-0">
      <Icon
        className="mt-1 size-5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-medium">
            {eventLabels[event.eventName] ?? "ອັບເດດກອງທຶນ"}
          </h3>
          {args.amount !== undefined ? (
            <strong className="break-all text-base tabular-nums">
              {formatOfl(args.amount as bigint)} OFL
            </strong>
          ) : null}
        </div>
        {args.fundId !== undefined ? (
          <Link
            to={
              management
                ? managerFundPath(d, String(args.fundId))
                : fundPath(d, String(args.fundId))
            }
            className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-primary hover:underline"
          >
            ກອງທຶນ #{String(args.fundId)}{" "}
            <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}
        {args.title ? <p className="text-sm">{String(args.title)}</p> : null}
        {typeof args.proposalId === "bigint" &&
        args.proposalId > 0n &&
        args.fundId !== undefined ? (
          <Link
            className="inline-flex min-h-11 items-center gap-2 self-start text-sm text-primary hover:underline"
            to={
              managerFundPath(d, String(args.fundId)) +
              `/proposals/${String(args.proposalId)}`
            }
          >
            ຂໍ້ສະເໜີ #{String(args.proposalId)}{" "}
            <ChevronRight className="inline-icon shrink-0" aria-hidden="true" />
          </Link>
        ) : null}
        <Disclosure title="ລາຍລະອຽດລາຍການ">
          {actor ? <code>{actor}</code> : null}
          <TxHash d={d} hash={event.transactionHash} />
          <small>
            ບັນທຶກ {event.blockNumber.toString()} · ລາຍການ #{event.logIndex}
          </small>
          <pre className="summary-box">
            {JSON.stringify(
              args,
              (_, v) => (typeof v === "bigint" ? v.toString() : v),
              2,
            )}
          </pre>
        </Disclosure>
      </div>
    </article>
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
    <Panel title={payoutsOnly ? "ປະຫວັດການຈ່າຍເງິນ" : "ປະຫວັດກອງທຶນ"}>
      <div className="flex min-w-0 flex-col gap-6">
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
    <>
      <PageHeader
        title="ປະຫວັດການດຳເນີນງານ"
        description="ການສະໜັບສະໜູນ ແລະການໃຊ້ເງິນຂອງກອງທຶນ."
      />
      <ActivityFeed d={defaultDeployment} />
    </>
  ) : (
    <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
  );
}
