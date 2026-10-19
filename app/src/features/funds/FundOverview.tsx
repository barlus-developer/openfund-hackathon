import { useConnection } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { encodeFunctionData } from "viem";
import {
  Panel,
  Notice,
  ActionLink,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { useFundContext } from "./FundLayout";
import { useLanguage } from "@/app/i18n";
import { Policy } from "./FundCard";
import { ofl, date } from "@/lib/amount";
import { clientFor, fundPath } from "@/web3/deployments";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
export function FundOverview() {
  const { d, row } = useFundContext(),
    { t } = useLanguage();
  const f = row.fund;
  return (
    <div className="stack">
      <Notice title="ສະຖານະກອງທຶນ / Effective status">
        {t(
          (
            [
              "fundraisingStatus",
              "activeStatus",
              "refundableStatus",
              "closingStatus",
              "closedStatus",
            ] as const
          )[row.status],
        )}
      </Notice>
      <div className="metrics">
        {[
          [t("raised"), f.totalRaised],
          [t("balance"), f.balance],
          ["Paid out", f.totalWithdrawn],
          ["Refunded", f.totalRefunded],
        ].map(([label, value]) => (
          <div className="metric" key={String(label)}>
            <span>{String(label)}</span>
            <strong>
              {ofl(value as bigint)} <small>OFL</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="detail-grid">
        <div className="stack">
          <Panel
            title="Immutable fund rules"
            description="Presentation metadata cannot change these promises."
          >
            <dl className="data-list">
              <dt>Mode</dt>
              <dd>{f.config.fundingMode === 0 ? "TARGETED" : "CONTINUOUS"}</dd>
              <dt>Goal</dt>
              <dd>
                {f.config.fundingGoal
                  ? `${ofl(f.config.fundingGoal)} OFL`
                  : "No goal"}
              </dd>
              <dt>Deadline</dt>
              <dd>{date(f.config.deadline)} (block time decides)</dd>
              <dt>Donation policy</dt>
              <dd>
                <Policy row={row} />
              </dd>
              <dt>Recipient mode</dt>
              <dd>{f.config.recipientPolicy === 0 ? "OPEN" : "ALLOWLIST"}</dd>
              <dt>Minimum quorum</dt>
              <dd>{f.config.minimumApprovalThreshold}</dd>
              <dt>Terms hash</dt>
              <dd>
                <code>{f.config.termsHash}</code>
              </dd>
              <dt>Terms URI</dt>
              <dd>
                <code>{f.termsURI || "No external document"}</code>
              </dd>
            </dl>
          </Panel>
          <Panel title="People & protocol">
            <dl className="data-list">
              <dt>Creator (historical)</dt>
              <dd>
                <code>{f.creator}</code>
              </dd>
              <dt>Current manager</dt>
              <dd>
                <code>{f.manager}</code>
              </dd>
              <dt>Current approvals</dt>
              <dd>
                {f.threshold} / {row.approvers.length} · Governance v
                {f.governanceVersion.toString()}
              </dd>
              <dt>Official identity</dt>
              <dd>
                {d.chainId} · {d.version}
                <code className="hash">{d.openFundAddress}</code>
              </dd>
              <dt>Presentation metadata</dt>
              <dd>
                <code>{f.metadataURI || "On-chain description only"}</code>
                <p>
                  This URI may be changed by the manager. Terms remain anchored
                  above.
                </p>
              </dd>
            </dl>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="ຮ່ວມສ້າງສິ່ງດີໆ / Contribute">
            <div className="stack">
              <p>
                <Policy row={row} />
              </p>
              {row.status === 0 ||
              (row.status === 1 && f.config.fundingMode === 1) ? (
                <ActionLink to={fundPath(d, row.id) + "/donate"}>
                  {t("donate")}
                </ActionLink>
              ) : (
                <Notice title="Deposits stopped">
                  This fund’s effective status does not accept new donations.
                </Notice>
              )}
              <small>
                One donation transaction. No token approval. Native gas is
                required.
              </small>
            </div>
          </Panel>
          {f.threshold === 1 ? (
            <Notice title="Single-signature risk">
              One approver can authorize spending. Multiple approvals do not
              guarantee real-world use either.
            </Notice>
          ) : null}
          <RefundClaim />
          <ClosureFinalize />
        </div>
      </div>
    </div>
  );
}
export function RefundClaim() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    { t } = useLanguage(),
    tx = useTransaction(d);
  const q = useQuery({
    queryKey: ["refund", d.version, row.id.toString(), c.address],
    enabled: !!c.address,
    queryFn: () =>
      clientFor(d).readContract({
        address: d.openFundAddress,
        abi: openFundAbi,
        functionName: "getRefundableAmount",
        args: [row.id, c.address!],
      }),
  });
  if (row.status !== 2) return null;
  return (
    <Panel title="Self-service donor refunds">
      <div className="stack">
        <p>
          {t("refundPolicy")} Claims have no expiration and no protocol fee.
        </p>
        <p>Eligible for this wallet: {ofl(q.data)} OFL</p>
        <ErrorNotice error={q.error} />
        <Button
          disabled={!q.data || tx.busy || c.chainId !== d.chainId}
          onClick={() =>
            tx.send(
              d.openFundAddress,
              encodeFunctionData({
                abi: openFundAbi,
                functionName: "claimRefund",
                args: [row.id],
              }),
            )
          }
        >
          {t("refund")}
        </Button>
        <small>
          Refund goes to the same donating wallet. Native gas is required.
        </small>
        <TxFeedback state={tx.state} d={d} />
      </div>
    </Panel>
  );
}
export function ClosureFinalize() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    tx = useTransaction(d);
  if (row.status !== 2 && row.status !== 3) return null;
  return (
    <Panel title="Finalize closure">
      <div className="stack">
        <p>
          Remaining fund balance: {ofl(row.fund.balance)} OFL. A fund can only
          close at zero balance; no sweep is available.
        </p>
        {row.fund.balance === 0n ? (
          <Button
            disabled={!c.address || tx.busy || c.chainId !== d.chainId}
            onClick={() =>
              tx.send(
                d.openFundAddress,
                encodeFunctionData({
                  abi: openFundAbi,
                  functionName: "finalizeClose",
                  args: [row.id],
                }),
              )
            }
          >
            Finalize immutable closed archive
          </Button>
        ) : (
          <small>
            {row.status === 2
              ? "All donors retain their refund entitlements indefinitely."
              : "Propose any settlement payout through the normal governance flow."}
          </small>
        )}
        <TxFeedback state={tx.state} d={d} />
      </div>
    </Panel>
  );
}
