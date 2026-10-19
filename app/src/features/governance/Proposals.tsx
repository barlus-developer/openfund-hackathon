import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useConnection } from "wagmi";
import { encodeFunctionData } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useActivity } from "@/hooks/useActivity";
import { useTransaction } from "@/hooks/useTransaction";
import { useProposal, actionNames, proposalStatuses } from "@/web3/reads";
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
import { ofl, date, positiveId } from "@/lib/amount";
import { Connect } from "@/features/wallet/Connect";
import { useLanguage } from "@/app/i18n";
export function Governance() {
  const { d, row } = useFundContext();
  return (
    <div className="stack">
      <Panel
        title="Fund-specific governance"
        description="No protocol administrator can override these wallets."
      >
        <dl className="data-list">
          <dt>Manager</dt>
          <dd>
            <code>{row.fund.manager}</code>
          </dd>
          <dt>Approval threshold</dt>
          <dd>
            {row.fund.threshold} / {row.approvers.length} · Minimum{" "}
            {row.fund.config.minimumApprovalThreshold}
          </dd>
          <dt>Versions</dt>
          <dd>
            Governance {row.fund.governanceVersion.toString()} · Recipient rules{" "}
            {row.fund.recipientRulesVersion.toString()}
          </dd>
          <dt>Current approvers</dt>
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
            Propose an action / recovery
          </ActionLink>
        </div>
      </Panel>
      <Notice title="Threshold & key-loss risk">
        Submission does not cast a vote. Each approver signs one on-chain
        approval. Sensitive actions wait 24 hours; final approval starts a
        separate 7-day execution window. If remaining wallets cannot reach the
        threshold, funds may be inaccessible permanently.
      </Notice>
      <ProposalList />
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
    <Panel title="ຂໍ້ສະເໜີ / Proposals">
      <div className="stack">
        <ScanControls q={q} />
        <small>
          Showing the newest {Math.min(ids.length, limit)} discovered proposals
          in the loaded log range.
        </small>
        {q.isLoading ? (
          <Loading />
        ) : !ids.length ? (
          <EmptyState />
        ) : (
          results.map((r, i) =>
            r.data ? (
              <Link
                className="activity-row"
                key={ids[i].toString()}
                to={fundPath(d, row.id) + `/proposals/${ids[i]}`}
              >
                <div>
                  <strong>
                    #{ids[i].toString()} · {actionNames[r.data[0].action.kind]}
                  </strong>
                  <p>{r.data[0].action.purpose}</p>
                  <small>
                    {r.data[0].approvals}/{row.fund.threshold} approvals ·{" "}
                    {date(r.data[0].createdAt)}
                  </small>
                </div>
                <Badge variant="outline">{proposalStatuses[r.data[1]]}</Badge>
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
            Load 12 more proposals
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
    return <EmptyState description="Invalid proposal ID." />;
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
    return (
      <EmptyState description="This proposal belongs to a different fund." />
    );
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
    <div className="stack">
      <Panel
        title={`#${id} · ${actionNames[p.action.kind]}`}
        description={proposalStatuses[s]}
      >
        <div className="stack">
          <dl className="data-list">
            <dt>Proposer</dt>
            <dd>
              <code>{p.proposer}</code>
            </dd>
            <dt>Recipient / target</dt>
            <dd>
              <code>{p.action.target}</code>
            </dd>
            <dt>Amount / threshold value</dt>
            <dd>
              {ofl(p.action.amount)} OFL / {p.action.value}
            </dd>
            <dt>Purpose</dt>
            <dd>{p.action.purpose}</dd>
            <dt>Evidence reference</dt>
            <dd>
              <code>{p.action.evidenceURI || "None"}</code>
              <code className="hash">{p.action.evidenceHash}</code>
            </dd>
            <dt>Approvals</dt>
            <dd>
              {p.approvals} / {row.fund.threshold}
            </dd>
            <dt>Submitted / approved</dt>
            <dd>
              {date(p.createdAt)} / {date(p.approvedAt)}
            </dd>
            <dt>Executable / expiry</dt>
            <dd>
              {date(ready)} / {date(expiry)}
            </dd>
            <dt>Versions</dt>
            <dd>
              Governance {p.governanceVersion.toString()} · Recipient{" "}
              {p.recipientRulesVersion.toString()}
            </dd>
            <dt>Latest fund balance</dt>
            <dd>{ofl(row.fund.balance)} OFL</dd>
          </dl>
          <Notice>
            Execution revalidates state, balance, recipient policy, quorum,
            timelock and versions. Pending proposals do not reserve money.
          </Notice>
          <Connect chainId={d.chainId} />
          <div className="flex flex-wrap gap-3">
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
              {voted.data ? " · Already approved" : ""}
            </Button>
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
              ? "Insufficient latest balance. Other proposals may already have spent this fund."
              : s === 1
                ? "Sensitive action is timelocked."
                : s !== 2
                  ? "Execute becomes available after the current proposal checks pass."
                  : "Anyone with a wallet on this chain may execute."}
          </small>
          <TxFeedback state={tx.state} d={d} />
        </div>
      </Panel>
      <Panel title="Individual approval records">
        <ScanControls q={activity} />
        {signed.length ? (
          signed.map((e) => (
            <p key={`${e.transactionHash}:${e.logIndex}`}>
              <code>{String(e.args.approver)}</code> · Block{" "}
              {e.blockNumber.toString()}
              <code className="hash">{e.transactionHash}</code>
            </p>
          ))
        ) : (
          <EmptyState description="No approval records in the loaded block range." />
        )}
      </Panel>
    </div>
  );
}
