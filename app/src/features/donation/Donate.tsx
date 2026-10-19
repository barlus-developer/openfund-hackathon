import { useState } from "react";
import { useConnection } from "wagmi";
import { decodeEventLog, encodeFunctionData, formatUnits } from "viem";
import { chainFor } from "@/web3/deployments";
import { useFundContext } from "@/features/funds/FundLayout";
import { useBalances } from "@/web3/reads";
import { tokenAbi } from "@/web3/generated/OFLToken";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
import { amount, ofl, donationData } from "@/lib/amount";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  Panel,
  Notice,
  TextField,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { Policy } from "@/features/funds/FundCard";
import { Connect } from "@/features/wallet/Connect";
import { useLanguage } from "@/app/i18n";
export function Donate() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    balances = useBalances(d, c.address),
    tx = useTransaction(d),
    { t } = useLanguage();
  const [input, setInput] = useState(""),
    [error, setError] = useState<unknown>(),
    [receipt, setReceipt] = useState("");
  const accepts =
      row.status === 0 ||
      (row.status === 1 && row.fund.config.fundingMode === 1),
    remaining = row.fund.config.fundingGoal - row.fund.totalRaised;
  let parsed = 0n;
  try {
    parsed = amount(input);
  } catch {
    /* Inline validation on submit. */
  }
  async function donate() {
    setError(undefined);
    setReceipt("");
    try {
      const n = amount(input);
      if (!accepts) throw Error("Fund no longer accepts donations.");
      if (row.fund.config.fundingMode === 0 && n > remaining)
        throw Error("Amount exceeds the exact remaining goal.");
      if (balances.data && n > balances.data.ofl)
        throw Error("Insufficient OFL balance.");
      const r = await tx.send(
        d.oflTokenAddress,
        encodeFunctionData({
          abi: tokenAbi,
          functionName: "transferAndCall",
          args: [d.openFundAddress, n, donationData(row.id)],
        }),
      );
      if (!r) return;
      const event = r.logs
        .filter(
          (l) => l.address.toLowerCase() === d.openFundAddress.toLowerCase(),
        )
        .map((l) => {
          try {
            return decodeEventLog({ abi: openFundAbi, ...l });
          } catch {
            return null;
          }
        })
        .find((e) => e?.eventName === "DonationReceived");
      if (
        event?.eventName !== "DonationReceived" ||
        event.args.fundId !== row.id
      )
        throw Error(
          "Expected DonationReceived event is missing. Inspect receipt.",
        );
      setReceipt(
        `${ofl(event.args.amount)} OFL · Fund #${event.args.fundId} · Donor ${event.args.donor}`,
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="detail-grid">
      <Panel
        title={t("donate")}
        description="OFL transferAndCall · one on-chain transaction"
      >
        <FieldGroup>
          <Connect chainId={d.chainId} />
          <Notice title="Your immutable donation terms">
            <Policy row={row} />
          </Notice>
          <TextField label={t("amount")} value={input} onChange={setInput} />
          <div className="flex flex-wrap gap-2">
            {["100", "500", "1000"].map((v) => (
              <Button key={v} variant="outline" onClick={() => setInput(v)}>
                {v} OFL
              </Button>
            ))}
            {row.fund.config.fundingMode === 0 ? (
              <Button
                variant="outline"
                onClick={() => setInput(ofl(remaining))}
              >
                Exact remaining: {ofl(remaining)}
              </Button>
            ) : null}
          </div>
          <p>
            Wallet: {ofl(balances.data?.ofl)} OFL · Native gas:{" "}
            {balances.data
              ? formatUnits(
                  balances.data.native,
                  chainFor(d).nativeCurrency.decimals,
                )
              : "—"}{" "}
            {chainFor(d).nativeCurrency.symbol}
          </p>
          <small>
            Fund #{row.id.toString()} · {d.version} · chain {d.chainId}
            <code className="hash">{d.openFundAddress}</code>Official OFL token
            <code className="hash">{d.oflTokenAddress}</code>
          </small>
          <ErrorNotice error={error || balances.error} />
          {!accepts ? (
            <Notice title="Donations stopped">
              The latest on-chain lifecycle does not accept deposits.
            </Notice>
          ) : null}
          <Button
            disabled={
              !c.address ||
              c.chainId !== d.chainId ||
              tx.busy ||
              !accepts ||
              parsed === 0n
            }
            onClick={donate}
          >
            {t("donate")} {parsed ? `${ofl(parsed)} OFL` : ""} · MetaMask
          </Button>
          <TxFeedback state={tx.state} d={d} />
          {receipt ? <Notice title="Donation receipt">{receipt}</Notice> : null}
        </FieldGroup>
      </Panel>
      <div className="stack">
        <Panel title="Before you confirm">
          <p>
            No prior approve transaction is needed. The fund ID is encoded in
            the donation; a failed goal, deadline or state check reverts the
            entire transfer.
          </p>
          <p>
            Wallet connection and network switching can involve separate
            prompts. The donation itself is one chain transaction.
          </p>
          <p>
            1 OFL ≈ 1 LAK is a target reference. DEMO OFL cannot be redeemed for
            LAK.
          </p>
        </Panel>
      </div>
    </div>
  );
}
