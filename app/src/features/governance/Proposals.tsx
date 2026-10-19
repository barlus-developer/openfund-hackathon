import { Disclosure } from "@/components/patterns";
import { actionLabels, proposalStatusLabels } from "@/app/labels";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";
import { encodeFunctionData } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useActivity } from "@/hooks/useActivity";
import { useTransaction } from "@/hooks/useTransaction";
import { useProposal } from "@/web3/reads";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { clientFor, fundPath } from "@/web3/deployments";
import {
  Panel,
  Notice,
  EmptyState,
  Loading,
  ErrorNotice,
  TxFeedback,
  ActionLink,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanControls } from "@/features/transparency/Activity";
import { formatOfl, date, positiveId } from "@/lib/amount";
import { Connect } from "@/features/wallet/Connect";
import { useLanguage } from "@/app/i18n";
export function Governance() {
  const { d, row } = useFundContext();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Panel title="ຜູ້ຮັບຜິດຊອບຂອງກອງທຶນ">
        <dl className="data-list">
          <dt> ຜູ້ຈັດການ </dt>
          <dd>
            <code>{row.fund.manager}</code>
          </dd>
          <dt> ຈຳນວນການອະນຸມັດທີ່ຕ້ອງການ </dt>
          <dd>
            {row.fund.threshold} / {row.approvers.length} · ຂັ້ນຕ່ຳ{" "}
            {row.fund.config.minimumApprovalThreshold}
          </dd>
          <dt> ຜູ້ອະນຸມັດປັດຈຸບັນ </dt>
          <dd>
            {row.approvers.map((a) => (
              <code className="hash" key={a}>
                {a}
              </code>
            ))}
          </dd>
        </dl>
        <div className="mt-6">
          <ActionLink to={fundPath(d, row.id) + "/manage"} outline>
            {" "}
            ສະເໜີການດຳເນີນງານ{" "}
          </ActionLink>
        </div>
      </Panel>
      <Notice title="ຈຳນວນການອະນຸມັດ ແລະການເຂົ້າກະເປົາ">
        {" "}
        ການສະເໜີຍັງບໍ່ແມ່ນການອະນຸມັດ. ຜູ້ອະນຸມັດແຕ່ລະຄົນຕ້ອງຢືນຢັນຜ່ານກະເປົາ.
        ການປ່ຽນແປງສຳຄັນຕ້ອງລໍຖ້າ 24 ຊົ່ວໂມງ ແລະດຳເນີນການພາຍໃນ 7
        ວັນຫຼັງອະນຸມັດຄົບ. ຖ້າອະນຸມັດບໍ່ຄົບຈຳນວນ ເງິນອາດຖືກລັອກຖາວອນ.{" "}
      </Notice>
    </div>
  );
}
export function ProposalList() {
  const { d, row } = useFundContext();
  const q = useActivity(d);
  const [limit, setLimit] = useState(12);
  const ids = q.events
    .filter(
      (e) => e.eventName === "ProposalCreated" && e.args.fundId === row.id,
    )
    .map((e) => e.args.proposalId as bigint)
    .reverse();
  // Event pagination limits the number of discovered IDs; current proposal state is re-read from chain.
  const results = useQueries({
    queries: ids.slice(0, limit).map((id) => ({
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
  return (
    <Panel title="ຂໍ້ສະເໜີ">
      <div className="flex min-w-0 flex-col gap-6">
        <ScanControls q={q} />
        <small>
          {" "}
          ສະແດງຂໍ້ສະເໜີລ່າສຸດ {Math.min(ids.length, limit)}{" "}
          ລາຍການຈາກຂໍ້ມູນທີ່ໂຫຼດແລ້ວ.{" "}
        </small>
        {q.isLoading ? (
          <Loading />
        ) : !ids.length ? (
          <EmptyState />
        ) : (
          results.map((r, i) =>
            r.data ? (
              <Link
                className="flex min-w-0 flex-col justify-between gap-4 border-b py-5 last:border-0 sm:flex-row"
                key={ids[i].toString()}
                to={fundPath(d, row.id) + `/proposals/${ids[i]}`}
              >
                <div>
                  <strong>
                    #{ids[i].toString()} · {actionLabels[r.data[0].action.kind]}
                  </strong>
                  <p>{r.data[0].action.purpose}</p>
                  <small>
                    {r.data[0].approvals}/{row.fund.threshold} ການອະນຸມັດ ·{" "}
                    {date(r.data[0].createdAt)}
                  </small>
                </div>
                <Badge variant="outline">
                  {proposalStatusLabels[r.data[1]]}
                </Badge>
              </Link>
            ) : r.error ? (
              <ErrorNotice key={ids[i].toString()} error={r.error} />
            ) : (
              <Loading key={ids[i].toString()} />
            ),
          )
        )}
        {ids.length > limit ? (
          <Button variant="outline" onClick={() => setLimit((n) => n + 12)}>
            {" "}
            ໂຫຼດຂໍ້ສະເໜີເພີ່ມ 12 ລາຍການ{" "}
          </Button>
        ) : null}
      </div>
    </Panel>
  );
}
export function ProposalDetail() {
  const { proposalId } = useParams();
  let id;
  try {
    id = positiveId(proposalId);
  } catch {
    return <EmptyState description="ໝາຍເລກຂໍ້ສະເໜີບໍ່ຖືກຕ້ອງ." />;
  }
  return <Detail id={id} />;
}
function Detail({ id }: { id: bigint }) {
  const { d, row } = useFundContext(),
    q = useProposal(d, id),
    c = useConnection(),
    tx = useTransaction(d),
    { t } = useLanguage(),
    activity = useActivity(d);
  const voted = useQuery({
    queryKey: ["vote", d.version, id.toString(), c.address],
    enabled: !!c.address,
    queryFn: () =>
      clientFor(d).readContract({
        address: d.openFundAddress,
        abi: openFundAbi,
        functionName: "hasApproved",
        args: [id, c.address!],
      }),
  });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorNotice error={q.error} />;
  if (!q.data) return <EmptyState />;
  const [p, s, ready, expiry] = q.data;
  if (p.fundId !== row.id)
    return <EmptyState description="ຂໍ້ສະເໜີນີ້ເປັນຂອງກອງທຶນອື່ນ." />;
  const isApprover = row.approvers.some(
      (a) => a.toLowerCase() === c.address?.toLowerCase(),
    ),
    canCancel = [p.proposer, row.fund.manager].some(
      (a) => a.toLowerCase() === c.address?.toLowerCase(),
    );
  const signed = activity.events.filter(
    (e) => e.eventName === "ProposalApproved" && e.args.proposalId === id,
  );
  const hasFunds = p.action.kind !== 0 || p.action.amount <= row.fund.balance;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Panel
        title={`#${id} · ${actionLabels[p.action.kind]}`}
        description={proposalStatusLabels[s]}
      >
        <div className="flex min-w-0 flex-col gap-6">
          <dl className="data-list">
            <dt> ຜູ້ສະເໜີ </dt>
            <dd>
              <code>{p.proposer}</code>
            </dd>
            {![4, 7].includes(p.action.kind) ? (
              <>
                <dt>ຜູ້ຮັບ / ກະເປົາທີ່ກ່ຽວຂ້ອງ</dt>
                <dd>
                  <code>{p.action.target}</code>
                </dd>
              </>
            ) : null}
            {p.action.kind === 0 ? (
              <>
                <dt>ຈຳນວນ</dt>
                <dd>{formatOfl(p.action.amount)} OFL</dd>
              </>
            ) : null}
            {p.action.kind === 4 ? (
              <>
                <dt>ຈຳນວນອະນຸມັດໃໝ່</dt>
                <dd>{p.action.value}</dd>
              </>
            ) : null}
            <dt> ຈຸດປະສົງ </dt>
            <dd>{p.action.purpose}</dd>
            <dt> ຫຼັກຖານປະກອບ </dt>
            <dd>
              <code>{p.action.evidenceURI || "ບໍ່ມີ"}</code>
            </dd>
            <dt> ການອະນຸມັດ </dt>
            <dd>
              {p.approvals} / {row.fund.threshold}
            </dd>
            <dt> ວັນສະເໜີ / ວັນອະນຸມັດ </dt>
            <dd>
              {date(p.createdAt)} / {date(p.approvedAt)}
            </dd>
            <dt> ວັນທີດຳເນີນການໄດ້ / ວັນໝົດອາຍຸ </dt>
            <dd>
              {date(ready)} / {date(expiry)}
            </dd>
            <dt> ຍອດຄົງເຫຼືອລ່າສຸດ </dt>
            <dd>{formatOfl(row.fund.balance)} OFL</dd>
          </dl>
          <Notice>
            {" "}
            ລະບົບຈະກວດສິດ ຍອດເງິນ ຜູ້ຮັບ ແລະການອະນຸມັດອີກຄັ້ງກ່ອນດຳເນີນການ.
            ຂໍ້ສະເໜີທີ່ລໍຖ້າບໍ່ໄດ້ຈອງເງິນໄວ້.{" "}
          </Notice>
          {!c.address || c.chainId !== d.chainId ? (
            <Connect chainId={d.chainId} />
          ) : null}
          <div className="flex flex-wrap gap-3">
            {s === 0 ? (
              <Button
                disabled={
                  !isApprover ||
                  voted.data ||
                  s !== 0 ||
                  tx.busy ||
                  c.chainId !== d.chainId
                }
                onClick={() =>
                  tx.send(
                    d.openFundAddress,
                    encodeFunctionData({
                      abi: openFundAbi,
                      functionName: "approveProposal",
                      args: [id],
                    }),
                  )
                }
              >
                {t("approve")}
                {voted.data ? " · ອະນຸມັດແລ້ວ" : ""}
              </Button>
            ) : null}
            {s === 2 ? (
              <Button
                disabled={
                  !c.address ||
                  s !== 2 ||
                  !hasFunds ||
                  tx.busy ||
                  c.chainId !== d.chainId
                }
                onClick={() =>
                  tx.send(
                    d.openFundAddress,
                    encodeFunctionData({
                      abi: openFundAbi,
                      functionName: "executeProposal",
                      args: [id],
                    }),
                  )
                }
              >
                {t("execute")}
              </Button>
            ) : null}
            {canCancel && s < 3 ? (
              <Button
                variant="outline"
                disabled={tx.busy || c.chainId !== d.chainId}
                onClick={() =>
                  tx.send(
                    d.openFundAddress,
                    encodeFunctionData({
                      abi: openFundAbi,
                      functionName: "cancelProposal",
                      args: [id],
                    }),
                  )
                }
              >
                {t("cancel")}
              </Button>
            ) : null}
          </div>
          <small>
            {!hasFunds
              ? "ຍອດເງິນບໍ່ພຽງພໍ. ອາດມີການຈ່າຍເງິນລາຍການອື່ນໄປແລ້ວ."
              : s === 1
                ? "ກະລຸນາລໍຖ້າໃຫ້ຄົບກຳນົດກ່ອນດຳເນີນການ."
                : s !== 2
                  ? "ຈະດຳເນີນການໄດ້ເມື່ອຂໍ້ສະເໜີຜ່ານເງື່ອນໄຂຄົບ."
                  : "ຜູ້ທີ່ເຊື່ອມກະເປົາໃນເຄືອຂ່າຍນີ້ສາມາດດຳເນີນການໄດ້."}
          </small>
          <TxFeedback state={tx.state} d={d} />
          <Disclosure title="ຂໍ້ມູນອ້າງອີງຂໍ້ສະເໜີ">
            <dl className="data-list">
              {" "}
              <dt> ຮຸ່ນຂໍ້ມູນ </dt>
              <dd>
                {" "}
                ການອະນຸມັດ {p.governanceVersion.toString()} · ຜູ້ຮັບ{" "}
                {p.recipientRulesVersion.toString()}
              </dd>
              <dt>ລະຫັດຫຼັກຖານ</dt>
              <dd>
                <code>{p.action.evidenceHash}</code>
              </dd>
            </dl>
          </Disclosure>
        </div>
      </Panel>
      <Panel title="ປະຫວັດການອະນຸມັດ">
        <ScanControls q={activity} />
        {signed.length ? (
          signed.map((e) => (
            <p key={`${e.transactionHash}:${e.logIndex}`}>
              <code>{String(e.args.approver)}</code> · ບັນທຶກ{" "}
              {e.blockNumber.toString()}
              <code className="hash">{e.transactionHash}</code>
            </p>
          ))
        ) : (
          <EmptyState description="ຍັງບໍ່ພົບການອະນຸມັດໃນຂໍ້ມູນທີ່ໂຫຼດ." />
        )}
      </Panel>
    </div>
  );
}
