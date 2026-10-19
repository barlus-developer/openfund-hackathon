import { actionLabels, proposalStatusLabels } from "@/app/labels";
import { useState } from "react";
import { useParams, Link } from "react-router-dom";
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
  Panel,
  EmptyState,
  ErrorNotice,
  Loading,
  TxFeedback,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/app/i18n";
import { ofl } from "@/lib/amount";
import type { Address } from "viem";
export function Dashboard() {
  const c = useConnection();
  if (!defaultDeployment)
    return (
      <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
    );
  return (
    <div className="stack">
      <div className="page-title">
        <div>
          <div className="eyebrow"> ພື້ນທີ່ຂອງເຈົ້າ </div>
          <h1> ກອງທຶນຂອງຂ້ອຍ </h1>
        </div>
        <Connect />
      </div>
      <nav className="tabs">
        {["", "funds", "donations", "approvals", "refunds"].map((s, i) => (
          <Link to={"/dashboard" + (s ? "/" + s : "")} key={s}>
            {
              [
                "ພາບລວມ",
                "ກອງທຶນຂອງຂ້ອຍ",
                "ການສະໜັບສະໜູນຂອງຂ້ອຍ",
                "ການອະນຸມັດ",
                "ຮັບເງິນຄືນ",
              ][i]
            }
          </Link>
        ))}
      </nav>
      {c.address ? (
        <WalletDashboard
          key={c.address}
          d={defaultDeployment}
          address={c.address}
        />
      ) : (
        <EmptyState description="ເຊື່ອມ MetaMask ເພື່ອເບິ່ງກອງທຶນ ການສະໜັບສະໜູນ ລາຍການອະນຸມັດ ແລະເງິນທີ່ຮັບຄືນໄດ້ຂອງເຈົ້າ." />
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
  return (
    <div className="stack">
      <ScanControls q={q} />
      <small>
        {" "}
        ລາຍການນີ້ອີງຕາມຂໍ້ມູນທີ່ໂຫຼດແລ້ວ.
        ສາມາດໂຫຼດປະຫວັດເພີ່ມເພື່ອຄົ້ນຫາລາຍການອື່ນຂອງເຈົ້າ.{" "}
      </small>
      {q.isLoading ? <Loading /> : null}
      <ErrorNotice error={funds.error} />
      <small>
        {discovered.length} / {ids.length} ກອງທຶນທີ່ກ່ຽວຂ້ອງຖືກໂຫຼດແລ້ວ.{" "}
      </small>
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
      {section === "" ? (
        <div className="metrics">
          {[
            ["ກອງທຶນທີ່ສ້າງ ຫຼືດູແລ", myFunds.length],
            ["ຈຳນວນການສະໜັບສະໜູນ", donations.length],
            ["ກອງທຶນທີ່ຮ່ວມອະນຸມັດ", approverFunds.length],
            ["ກອງທຶນທີ່ອາດຮັບເງິນຄືນໄດ້", refundIds.length],
          ].map(([key, v]) => (
            <div className="metric" key={key}>
              <span>{key}</span>
              <strong>{v}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {section === "" || section === "funds" ? (
        <Panel title="ກອງທຶນທີ່ສ້າງ ຫຼືກຳລັງດູແລ">
          {myFunds.length ? (
            <div className="fund-grid">
              {myFunds.map((r) => (
                <FundCard key={r.id.toString()} row={r} d={d} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </Panel>
      ) : null}
      {section === "" || section === "donations" ? (
        <Panel title="ປະຫວັດການສະໜັບສະໜູນຂອງຂ້ອຍ">
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
            <EmptyState />
          )}
        </Panel>
      ) : null}
      {section === "" || section === "approvals" ? (
        <Panel title="ລາຍການທີ່ລໍຖ້າຂ້ອຍອະນຸມັດ">
          {proposalIds.length ? (
            proposalIds
              .slice(0, limit)
              .map((id) => <ApprovalTask key={id.toString()} id={id} d={d} />)
          ) : (
            <EmptyState description="ຍັງບໍ່ພົບລາຍການທີ່ຕ້ອງອະນຸມັດໃນຂໍ້ມູນທີ່ໂຫຼດ." />
          )}
        </Panel>
      ) : null}
      {section === "" || section === "refunds" ? (
        <Panel title="ຮັບເງິນສະໜັບສະໜູນຄືນ">
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
        </Panel>
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
      className="activity-row"
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
      <p className="tagline">
        {" "}
        ກອງທຶນ # {id.toString()} : ບໍ່ມີຍອດທີ່ຮັບຄືນໄດ້ໃນຂະນະນີ້.{" "}
        <Link to={fundPath(d, id)}> ເບິ່ງເງື່ອນໄຂກອງທຶນ ↗ </Link>
      </p>
    );
  return (
    <div className="activity-row">
      <div>
        <Link to={fundPath(d, id)}>
          {" "}
          ກອງທຶນ # {id.toString()} · {ofl(q.data)} OFL
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
