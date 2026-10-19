import { PageHeader, RouteNavigation } from "@/components/patterns";
import { actionLabels, proposalStatusLabels } from "@/app/labels";
import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { useConnection } from "wagmi";
import { useQueries, useQuery, keepPreviousData } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import {
  defaultDeployment,
  fundPath,
  clientFor,
  type Deployment,
} from "@/web3/deployments";
import { useActivity } from "@/hooks/useActivity";
import { readFund, useProposal } from "@/web3/reads";
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
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/app/i18n";
import { formatOfl } from "@/lib/amount";
import type { Address } from "viem";
export function Dashboard() {
  const c = useConnection();
  const { section = "" } = useParams();
  if (!["funds", "donations", "approvals", "refunds"].includes(section))
    return <Navigate to="/dashboard/funds" replace />;
  if (!defaultDeployment)
    return (
      <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
    );
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title={
          section === "donations"
            ? "ການສະໜັບສະໜູນຂອງຂ້ອຍ"
            : section === "approvals"
              ? "ລໍຖ້າອະນຸມັດ"
              : section === "refunds"
                ? "ຮັບເງິນຄືນ"
                : "ກອງທຶນຂອງຂ້ອຍ"
        }
        action={
          c.address && (!section || section === "funds") ? (
            <ActionLink to="/funds/create">ສ້າງກອງທຶນ</ActionLink>
          ) : undefined
        }
      />
      <RouteNavigation
        label="ເມນູກອງທຶນຂອງຂ້ອຍ"
        items={["funds", "donations", "approvals", "refunds"].map((tab, i) => ({
          to: `/dashboard/${tab}`,
          label: ["ກອງທຶນຂອງຂ້ອຍ", "ການສະໜັບສະໜູນ", "ການອະນຸມັດ", "ຮັບເງິນຄືນ"][
            i
          ],
        }))}
      />
      {c.address ? (
        <WalletDashboard
          key={c.address}
          d={defaultDeployment}
          address={c.address}
        />
      ) : (
        <EmptyState
          title="ເຊື່ອມກະເປົາຂອງເຈົ້າ"
          description="ເບິ່ງກອງທຶນ ແລະການສະໜັບສະໜູນຂອງເຈົ້າ."
          action={<Connect />}
        />
      )}
    </div>
  );
}
function WalletDashboard({ d, address }: { d: Deployment; address: Address }) {
  const { section = "" } = useParams();
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
      (e.eventName === "DonationReceived" && same(e.args.donor)),
  );
  const ids = [...new Set(relevant.map((e) => e.args.fundId as bigint))];
  const discovered = ids.slice(0, limit);
  const funds = useQuery({
    queryKey: ["wallet-discovery", d.version, address, discovered.map(String)],
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
  const myFunds = rows.filter(
    (r) => same(r.fund.creator) || same(r.fund.manager),
  );
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
  if (q.isLoading || funds.isLoading) return <Loading />;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <ScanControls q={q} />
      <ErrorNotice error={funds.error} />
      {Math.max(
        ids.length,
        proposalIds.length,
        refundIds.length,
        donations.length,
      ) > limit ? (
        <Button variant="outline" onClick={() => setLimit((n) => n + 12)}>
          {" "}
          ໂຫຼດເພີ່ມ 12 ລາຍການ{" "}
        </Button>
      ) : null}
      {section === "" || section === "funds" ? (
        <section aria-label="ກອງທຶນທີ່ສ້າງ ຫຼືກຳລັງດູແລ">
          {myFunds.length ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {myFunds.map((r) => (
                <FundCard key={r.id.toString()} row={r} d={d} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="ຍັງບໍ່ມີກອງທຶນຂອງເຈົ້າ"
              action={
                <ActionLink to="/funds/create" outline>
                  ສ້າງກອງທຶນ
                </ActionLink>
              }
            />
          )}
        </section>
      ) : null}
      {section === "donations" ? (
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
              action={<ActionLink to="/funds">ຄົ້ນຫາກອງທຶນ</ActionLink>}
            />
          )}
        </section>
      ) : null}
      {section === "approvals" ? (
        <section aria-label="ລາຍການທີ່ລໍຖ້າຂ້ອຍອະນຸມັດ">
          {proposalIds.length ? (
            proposalIds
              .slice(0, limit)
              .map((id) => <ApprovalTask key={id.toString()} id={id} d={d} />)
          ) : (
            <EmptyState description="ຍັງບໍ່ພົບລາຍການທີ່ຕ້ອງອະນຸມັດໃນຂໍ້ມູນທີ່ໂຫຼດ." />
          )}
        </section>
      ) : null}
      {section === "refunds" ? (
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
function ApprovalTask({ d, id }: { d: Deployment; id: bigint }) {
  const q = useProposal(d, id);
  if (q.error) return <ErrorNotice error={q.error} />;
  if (!q.data) return <Loading />;
  const [p, s] = q.data;
  if (s > 2) return null;
  return (
    <Link
      className="flex min-w-0 flex-col justify-between gap-4 border-b py-5 last:border-0 sm:flex-row"
      to={fundPath(d, p.fundId) + `/proposals/${id}`}
    >
      <strong>
        #{id.toString()} · {actionLabels[p.action.kind]}
      </strong>
      <Badge variant="outline">
        {proposalStatusLabels[s]} · {p.approvals} ການອະນຸມັດ{" "}
      </Badge>
    </Link>
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
  const queries = useQueries({
    queries: [
      {
        queryKey: ["refund", d.version, id.toString(), address],
        queryFn: () =>
          clientFor(d).readContract({
            address: d.openFundAddress,
            abi: openFundAbi,
            functionName: "getRefundableAmount",
            args: [id, address],
          }),
      },
    ],
  });
  const q = queries[0];
  if (q.error) return <ErrorNotice error={q.error} />;
  if (q.isLoading) return <Loading />;
  if (!q.data)
    return (
      <p className="text-sm leading-7 text-muted-foreground">
        {" "}
        ກອງທຶນ # {id.toString()} : ບໍ່ມີຍອດທີ່ຮັບຄືນໄດ້ໃນຂະນະນີ້.{" "}
        <Link to={fundPath(d, id)}> ເບິ່ງເງື່ອນໄຂກອງທຶນ ↗ </Link>
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
        {t("refund")}
      </Button>
    </div>
  );
}
