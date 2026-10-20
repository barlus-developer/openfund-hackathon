import {
  Network,
  HandHeart,
  ChevronRight,
  ListPlus,
  RefreshCw,
  Plus,
  Search,
  Undo2,
} from "lucide-react";
import { PageHeader, RouteNavigation, Stat } from "@/components/patterns";
import { actionLabels, proposalStatusLabels } from "@/app/labels";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useConnection } from "wagmi";
import { useQuery, useQueries, keepPreviousData } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import {
  defaultDeployment,
  fundPath,
  managerFundPath,
  deployments,
  resolveDeployment,
  clientFor,
  type Deployment,
} from "@/web3/deployments";
import { useActivity } from "@/hooks/useActivity";
import { readFund } from "@/web3/reads";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
import { Connect } from "@/features/wallet/Connect";
import { FundCard } from "@/features/funds/FundCard";
import { ScanControls, EventRow } from "@/features/transparency/Activity";
import {
  ActionLink,
  EmptyState,
  ErrorNotice,
  Loading,
  TxFeedback,
  SelectField,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/app/i18n";
import { formatOfl } from "@/lib/amount";
import type { Address } from "viem";
export function Dashboard({
  section = "funds",
  manager = false,
}: {
  section?: string;
  manager?: boolean;
}) {
  const c = useConnection();
  const [params, setParams] = useSearchParams();
  const d =
    resolveDeployment(params.get("deployment") ?? undefined) ??
    defaultDeployment;
  if (!d)
    return (
      <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
    );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={
          section === "overview"
            ? "ພາບລວມກອງທຶນ"
            : section === "transactions"
              ? "ປະຫວັດກອງທຶນຂອງຂ້ອຍ"
              : section === "donations"
                ? "ການສະໜັບສະໜູນຂອງຂ້ອຍ"
                : section === "approvals"
                  ? "ລໍຖ້າອະນຸມັດ"
                  : section === "refunds"
                    ? "ຮັບເງິນຄືນ"
                    : "ກອງທຶນຂອງຂ້ອຍ"
        }
        action={
          !manager && c.address ? (
            <Connect chainId={d.chainId} compact />
          ) : undefined
        }
      />
      {!manager ? (
        <RouteNavigation
          label="ການສະໜັບສະໜູນຂອງຂ້ອຍ"
          items={[
            {
              to: `/donations?deployment=${encodeURIComponent(d.version)}`,
              label: "ການສະໜັບສະໜູນ",
              icon: HandHeart,
              end: true,
            },
            {
              to: `/donations/refunds?deployment=${encodeURIComponent(d.version)}`,
              label: "ຮັບເງິນຄືນ",
              icon: Undo2,
            },
          ]}
        />
      ) : null}
      {deployments.length > 1 ? (
        <div className="max-w-sm">
          <SelectField
            icon={Network}
            label="ເຄືອຂ່າຍກອງທຶນ"
            value={d.version}
            onChange={(value) => setParams({ deployment: value })}
            options={deployments.map((d) => [
              d.version,
              `${d.chainId} · ${d.version}`,
            ])}
          />
        </div>
      ) : null}
      {c.address ? (
        <WalletDashboard
          key={`${c.address}:${d.version}`}
          d={d}
          section={section}
          manager={manager}
          address={c.address}
        />
      ) : (
        <EmptyState
          title="ເຊື່ອມກະເປົາຂອງເຈົ້າ"
          description={
            manager
              ? "ເຊື່ອມກະເປົາຜູ້ຈັດການ ຫຼືຜູ້ອະນຸມັດເພື່ອເບິ່ງກອງທຶນຂອງເຈົ້າ."
              : "ເຊື່ອມກະເປົາທີ່ໃຊ້ສະໜັບສະໜູນເພື່ອເບິ່ງປະຫວັດ ແລະຮັບເງິນຄືນ."
          }
          action={<Connect chainId={d.chainId} />}
        />
      )}
    </div>
  );
}
function WalletDashboard({
  d,
  address,
  section,
  manager,
}: {
  d: Deployment;
  address: Address;
  section: string;
  manager: boolean;
}) {
  const q = useActivity(d);
  const [limit, setLimit] = useState(12);
  const same = (v: unknown) =>
    typeof v === "string" && v.toLowerCase() === address.toLowerCase();
  const donations = q.events.filter(
    (e) => e.eventName === "DonationReceived" && same(e.args.donor),
  );
  const relevant = q.events.filter(
    (e) =>
      (e.eventName === "FundCreated" &&
        (same(e.args.creator) || same(e.args.manager))) ||
      (e.eventName === "GovernanceChanged" && same(e.args.manager)) ||
      (e.eventName === "ApproverChanged" && same(e.args.approver)) ||
      (!manager && e.eventName === "DonationReceived" && same(e.args.donor)),
  );
  const ids = [...new Set(relevant.map((e) => e.args.fundId as bigint))].sort(
    (a, b) => (a > b ? -1 : a < b ? 1 : 0),
  );
  const discovered = ids.slice(0, limit);
  const funds = useQuery({
    queryKey: ["wallet-discovery", d.version, address, discovered.map(String)],
    enabled: manager,
    placeholderData: keepPreviousData,
    refetchInterval: 10000,
    queryFn: async ({ signal }) => {
      const rows: Awaited<ReturnType<typeof readFund>>[] = [];
      for (let i = 0; i < discovered.length; i += 4) {
        signal.throwIfAborted();
        rows.push(
          ...(await Promise.all(
            discovered.slice(i, i + 4).map((id) => readFund(d, id)),
          )),
        );
      }
      return rows;
    },
  });
  const rows = funds.data || [];
  const approverFunds = rows.filter((r) => r.approvers.some(same));
  const proposalIds = q.events
    .filter(
      (e) =>
        e.eventName === "ProposalCreated" &&
        approverFunds.some((f) => f.id === e.args.fundId),
    )
    .map((e) => e.args.proposalId as bigint)
    .reverse();
  const refundIds = [...new Set(donations.map((e) => e.args.fundId as bigint))];
  const managed = rows.filter(
    (r) =>
      same(r.fund.creator) || same(r.fund.manager) || r.approvers.some(same),
  );
  const managedIds = new Set(managed.map((r) => String(r.id)));
  const transactions = q.events
    .filter((e) => managedIds.has(String(e.args.fundId)))
    .slice()
    .reverse();
  if (q.isLoading || (manager && funds.isLoading)) return <Loading />;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ScanControls q={q} />
      <ErrorNotice error={manager ? funds.error : undefined} />
      {Math.max(
        ids.length,
        proposalIds.length,
        refundIds.length,
        donations.length,
        transactions.length,
      ) > limit ? (
        <Button variant="outline" onClick={() => setLimit((n) => n + 12)}>
          <ListPlus data-icon="inline-start" aria-hidden="true" /> ໂຫຼດເພີ່ມ 12
          ລາຍການ{" "}
        </Button>
      ) : null}
      {section === "overview" && !funds.error && !q.error ? (
        <>
          <div className="grid grid-cols-2 gap-6 border-y py-5 lg:grid-cols-4">
            <Stat label="ກອງທຶນທີ່ດູແລ" value={managed.length} />
            <Stat
              label="ລະດົມທຶນແລ້ວ"
              value={
                <>
                  {formatOfl(
                    managed.reduce((n, r) => n + r.fund.totalRaised, 0n),
                  )}{" "}
                  <small>OFL</small>
                </>
              }
            />
            <Stat
              label="ຍອດຄົງເຫຼືອ"
              value={
                <>
                  {formatOfl(managed.reduce((n, r) => n + r.fund.balance, 0n))}{" "}
                  <small>OFL</small>
                </>
              }
            />
            <Stat
              label="ຈ່າຍແລ້ວ"
              value={
                <>
                  {formatOfl(
                    managed.reduce((n, r) => n + r.fund.totalWithdrawn, 0n),
                  )}{" "}
                  <small>OFL</small>
                </>
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ສະຫຼຸບຈາກກອງທຶນທີ່ໂຫຼດແລ້ວ {managed.length} ກອງທຶນ ·
            ລວມກອງທຶນທີ່ເຈົ້າເປັນຜູ້ອະນຸມັດ.
          </p>
        </>
      ) : null}
      {manager && funds.error ? (
        <Button
          variant="outline"
          disabled={funds.isFetching}
          onClick={() => funds.refetch()}
        >
          <RefreshCw data-icon="inline-start" aria-hidden="true" />
          ລອງໂຫຼດກອງທຶນໃໝ່
        </Button>
      ) : null}
      {manager &&
      !funds.error &&
      !q.error &&
      ["overview", "funds"].includes(section) ? (
        <section aria-label="ກອງທຶນທີ່ສ້າງ ຫຼືກຳລັງດູແລ">
          {managed.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {managed.map((r) => (
                <FundCard
                  key={r.id.toString()}
                  row={r}
                  d={d}
                  manager={manager}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີກອງທຶນຂອງເຈົ້າ"
              action={
                <ActionLink
                  icon={Plus}
                  to={`/manager/create?deployment=${encodeURIComponent(d.version)}`}
                  outline
                >
                  ສ້າງກອງທຶນ
                </ActionLink>
              }
            />
          )}
        </section>
      ) : null}
      {section === "transactions" && !q.error && !funds.error ? (
        <section aria-label="ປະຫວັດກອງທຶນຂອງຂ້ອຍ">
          {transactions.length ? (
            transactions
              .slice(0, limit)
              .map((e) => (
                <EventRow
                  key={`${e.transactionHash}:${e.logIndex}`}
                  event={e}
                  d={d}
                />
              ))
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີລາຍການ"
              description="ລາຍການຮັບ ແລະຈ່າຍເງິນຂອງກອງທຶນທີ່ເຈົ້າດູແລຈະສະແດງຢູ່ນີ້."
            />
          )}
        </section>
      ) : null}
      {section === "donations" && !q.error ? (
        <section aria-label="ປະຫວັດການສະໜັບສະໜູນຂອງຂ້ອຍ">
          {donations.length ? (
            donations
              .slice()
              .reverse()
              .slice(0, limit)
              .map((e) => (
                <EventRow
                  key={`${e.transactionHash}:${e.logIndex}`}
                  event={e}
                  d={d}
                />
              ))
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີການສະໜັບສະໜູນ"
              action={
                <ActionLink icon={Search} to="/funds">
                  ຄົ້ນຫາກອງທຶນ
                </ActionLink>
              }
            />
          )}
        </section>
      ) : null}
      {section === "approvals" && !q.error && !funds.error ? (
        <section aria-label="ລາຍການທີ່ລໍຖ້າຂ້ອຍອະນຸມັດ">
          <ApprovalTasks d={d} ids={proposalIds.slice(0, limit)} />
        </section>
      ) : null}
      {section === "refunds" && !q.error ? (
        <section aria-label="ຮັບເງິນສະໜັບສະໜູນຄືນ">
          {refundIds.length ? (
            refundIds
              .slice(0, limit)
              .map((id) => (
                <RefundTask
                  key={id.toString()}
                  id={id}
                  d={d}
                  address={address}
                />
              ))
          ) : (
            <EmptyState description="ຍັງບໍ່ພົບລາຍການຮັບເງິນຄືນ. ກອງທຶນທີ່ເກັບເງິນໄວ້ ຫຼືຮັບສະໜັບສະໜູນຕໍ່ເນື່ອງ ບໍ່ມີການຄືນເງິນອັດຕະໂນມັດ." />
          )}
        </section>
      ) : null}
    </div>
  );
}
function ApprovalTasks({ d, ids }: { d: Deployment; ids: bigint[] }) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["proposal", d.version, id.toString()],
      queryFn: () =>
        clientFor(d).readContract({
          address: d.openFundAddress,
          abi: openFundAbi,
          functionName: "getProposal",
          args: [id],
        }),
      refetchInterval: 10000,
    })),
  });
  const pending = results.flatMap((q, i) =>
    q.data && q.data[1] <= 2 ? [{ id: ids[i], data: q.data }] : [],
  );
  return (
    <div className="flex flex-col gap-4">
      {results.some((q) => q.isLoading) ? <Loading /> : null}
      {results.map((q, i) =>
        q.error ? <ErrorNotice key={String(ids[i])} error={q.error} /> : null,
      )}
      {pending.map(({ id, data: [p, status] }) => (
        <Link
          key={String(id)}
          className="group flex min-w-0 flex-col justify-between gap-4 rounded-lg border-b py-5 last:border-0 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring sm:flex-row sm:items-center"
          to={managerFundPath(d, p.fundId) + `/proposals/${id}`}
        >
          <div>
            <strong>
              #{String(id)} · {actionLabels[p.action.kind]}
            </strong>
            <p className="text-sm text-muted-foreground">{p.action.purpose}</p>
          </div>
          <span className="flex shrink-0 items-center gap-3">
            <Badge variant="outline">
              {proposalStatusLabels[status]} · {p.approvals} ການອະນຸມັດ
            </Badge>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
              aria-hidden="true"
            />
          </span>
        </Link>
      ))}
      {!pending.length && results.every((q) => q.isSuccess) ? (
        <EmptyState
          title="ບໍ່ມີລາຍການລໍຖ້າອະນຸມັດ"
          description="ບໍ່ພົບຂໍ້ສະເໜີທີ່ຕ້ອງດຳເນີນການໃນຂໍ້ມູນທີ່ໂຫຼດແລ້ວ."
        />
      ) : null}
    </div>
  );
}
function RefundTask({
  d,
  id,
  address,
}: {
  d: Deployment;
  id: bigint;
  address: Address;
}) {
  const tx = useTransaction(d),
    c = useConnection(),
    { t } = useLanguage();
  const q = useQuery({
    queryKey: ["refund", d.version, id.toString(), address],
    queryFn: () =>
      clientFor(d).readContract({
        address: d.openFundAddress,
        abi: openFundAbi,
        functionName: "getRefundableAmount",
        args: [id, address],
      }),
  });
  if (q.error) return <ErrorNotice error={q.error} />;
  if (q.isLoading) return <Loading />;
  if (!q.data)
    return (
      <p className="text-sm leading-7 text-muted-foreground">
        {" "}
        ກອງທຶນ # {id.toString()} : ບໍ່ມີຍອດທີ່ຮັບຄືນໄດ້ໃນຂະນະນີ້.{" "}
        <Link to={fundPath(d, id)}>
          {" "}
          ເບິ່ງເງື່ອນໄຂກອງທຶນ{" "}
          <ChevronRight
            className="inline-icon shrink-0"
            aria-hidden="true"
          />{" "}
        </Link>
      </p>
    );
  return (
    <div className="flex min-w-0 flex-col justify-between gap-4 border-b py-5 last:border-0 sm:flex-row">
      <div>
        <Link to={fundPath(d, id)}>
          {" "}
          ກອງທຶນ # {id.toString()} · {formatOfl(q.data)} OFL
        </Link>
        <p> ຄືນ 100% ໄປກະເປົາເດີມ · ມີຄ່າທຳນຽມເຄືອຂ່າຍ · ບໍ່ມີວັນໝົດອາຍຸ </p>
        <code className="hash">{address}</code>
        {c.chainId !== d.chainId ? <Connect chainId={d.chainId} /> : null}
        <TxFeedback state={tx.state} d={d} />
      </div>
      <Button
        disabled={tx.busy || c.chainId !== d.chainId}
        onClick={() =>
          tx.send(
            d.openFundAddress,
            encodeFunctionData({
              abi: openFundAbi,
              functionName: "claimRefund",
              args: [id],
            }),
          )
        }
      >
        <Undo2 data-icon="inline-start" aria-hidden="true" />
        {t("refund")}
      </Button>
    </div>
  );
}
