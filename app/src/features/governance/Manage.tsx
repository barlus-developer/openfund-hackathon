import { useState } from "react";
import { useConnection } from "wagmi";
import { encodeFunctionData, getAddress, zeroAddress, zeroHash } from "viem";
import { useFundContext } from "@/features/funds/FundLayout";
import { useTransaction } from "@/hooks/useTransaction";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { actionNames } from "@/web3/reads";
import { clientFor } from "@/web3/deployments";
import { amount, ofl } from "@/lib/amount";
import { walletAddress } from "@/features/funds/creation";
import {
  Panel,
  Notice,
  TextField,
  SelectField,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { FieldGroup } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Connect } from "@/features/wallet/Connect";
import { ClosureFinalize } from "@/features/funds/FundOverview";
import { useLanguage } from "@/app/i18n";
export function Manage() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    { t } = useLanguage(),
    tx = useTransaction(d);
  const [kind, setKind] = useState("0"),
    [target, setTarget] = useState(""),
    [sum, setSum] = useState(""),
    [value, setValue] = useState(""),
    [purpose, setPurpose] = useState(""),
    [uri, setURI] = useState(""),
    [hash, setHash] = useState(""),
    [metadata, setMetadata] = useState(row.fund.metadataURI),
    [error, setError] = useState<unknown>();
  const manager = c.address?.toLowerCase() === row.fund.manager.toLowerCase(),
    approver = row.approvers.some(
      (a) => a.toLowerCase() === c.address?.toLowerCase(),
    );
  const options = actionNames
    .map((n, i) => [String(i), n] as [string, string])
    .filter(
      ([, n]) =>
        manager ||
        (approver &&
          [
            "CHANGE_MANAGER",
            "ADD_APPROVER",
            "REMOVE_APPROVER",
            "CHANGE_THRESHOLD",
          ].includes(n)),
    )
    .filter(
      ([i]) =>
        ![2, 4].includes(row.status) &&
        (![5, 6].includes(+i) || row.fund.config.recipientPolicy === 1) &&
        (+i !== 7 || row.status === 1) &&
        (+i !== 0 || [1, 3].includes(row.status)),
    );
  const selectedKind = options.some(([i]) => i === kind)
    ? kind
    : options[0]?.[0] || "0";
  async function propose() {
    setError(undefined);
    try {
      const k = Number(selectedKind);
      if (!manager && !(approver && [1, 2, 3, 4].includes(k)))
        throw Error("Only current manager, or approvers for recovery actions.");
      if (hash && !/^0x[0-9a-fA-F]{64}$/.test(hash))
        throw Error("Evidence hash must be a 32-byte keccak256 digest.");
      if ([4, 7].includes(k) === false) walletAddress.parse(target);
      const a = {
        kind: k,
        target: [4, 7].includes(k) ? zeroAddress : getAddress(target),
        amount: k === 0 ? amount(sum) : 0n,
        value: k === 4 ? Number(value) : 0,
        purpose,
        evidenceURI: uri,
        evidenceHash: (hash || zeroHash) as `0x${string}`,
      };
      if (
        k === 4 &&
        (!/^\d+$/.test(value) ||
          Number(value) < row.fund.config.minimumApprovalThreshold ||
          Number(value) > row.approvers.length)
      )
        throw Error("Invalid threshold.");
      if (k === 0) {
        if (a.amount > row.fund.balance)
          throw Error("Payout exceeds the current balance.");
        if (!purpose) throw Error("Purpose is required.");
        const allowed = await clientFor(d).readContract({
          address: d.openFundAddress,
          abi: openFundAbi,
          functionName: "isAllowedRecipient",
          args: [row.id, a.target],
        });
        if (!allowed)
          throw Error(
            "Recipient is not eligible under current fund/token rules.",
          );
      }
      await tx.send(
        d.openFundAddress,
        encodeFunctionData({
          abi: openFundAbi,
          functionName: "createProposal",
          args: [row.id, a],
        }),
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="detail-grid">
      <div className="stack">
        <Panel title="Propose an on-chain action">
          <FieldGroup>
            <Connect chainId={d.chainId} />
            {!manager && !approver ? (
              <Notice title="Read-only permissions">
                Connect the current manager wallet to propose actions, or an
                approver wallet to propose governance recovery.
              </Notice>
            ) : null}
            <SelectField
              label="Closed action type"
              value={selectedKind}
              onChange={setKind}
              options={
                options.length ? options : [["0", "PAYOUT (manager only)"]]
              }
            />
            {![4, 7].includes(+selectedKind) ? (
              <TextField
                label={+selectedKind === 0 ? t("recipient") : "Target wallet"}
                value={target}
                onChange={setTarget}
              />
            ) : null}
            {+selectedKind === 0 ? (
              <TextField label={t("amount")} value={sum} onChange={setSum} />
            ) : null}
            {+selectedKind === 4 ? (
              <TextField
                label="New threshold"
                value={value}
                onChange={setValue}
              />
            ) : null}
            <TextField
              label={t("purpose")}
              value={purpose}
              onChange={setPurpose}
              multiline
            />
            <TextField
              label="Evidence IPFS URI (optional)"
              value={uri}
              onChange={setURI}
            />
            <TextField
              label="Evidence keccak256 hash (optional)"
              value={hash}
              onChange={setHash}
            />
            <Notice title="Exact effects preview">
              {actionNames[+selectedKind]} · Target {target || "none"} ·{" "}
              {sum || "0"} OFL · New threshold {value || "—"}
              <p>
                Latest balance {ofl(row.fund.balance)} OFL. Quorum{" "}
                {row.fund.threshold}/{row.approvers.length}. Governance version{" "}
                {row.fund.governanceVersion.toString()}.{" "}
                {+selectedKind === 0
                  ? "No balance is reserved."
                  : "24-hour timelock after final approval."}
              </p>
              {+selectedKind === 7 ? (
                <p>
                  Starting closure permanently halts donations and invalidates
                  existing proposals. Settlement still requires separate
                  approved payouts.
                </p>
              ) : null}
            </Notice>
            <ErrorNotice error={error} />
            <Button
              disabled={
                (!manager && !approver) ||
                tx.busy ||
                c.chainId !== d.chainId ||
                row.status === 2 ||
                row.status === 4
              }
              onClick={propose}
            >
              ສ້າງຂໍ້ສະເໜີ / Submit proposal
            </Button>
            <TxFeedback state={tx.state} d={d} />
          </FieldGroup>
        </Panel>
        <ClosureFinalize />
      </div>
      <div className="stack">
        <Panel title="Presentation metadata (manager only)">
          <FieldGroup>
            <TextField
              label="Metadata URI"
              value={metadata}
              onChange={setMetadata}
            />
            <Button
              disabled={
                !manager ||
                tx.busy ||
                c.chainId !== d.chainId ||
                row.status === 4
              }
              onClick={() =>
                tx.send(
                  d.openFundAddress,
                  encodeFunctionData({
                    abi: openFundAbi,
                    functionName: "updateMetadata",
                    args: [row.id, metadata, zeroHash],
                  }),
                )
              }
            >
              Update presentation URI
            </Button>
            <small>
              Funding rules, summary, purpose terms and financial rights remain
              immutable. A zero content hash means this metadata update has no
              byte-integrity commitment.
            </small>
          </FieldGroup>
        </Panel>
        <Notice title="No direct withdrawal">
          Managers propose. Approvers vote. Anyone executes after the contract’s
          checks. There is no manager payout shortcut, platform recovery key, or
          treasury sweep.
        </Notice>
      </div>
    </div>
  );
}
