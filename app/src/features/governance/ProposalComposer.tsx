import { useRef, useState, type FormEvent } from "react";
import { useConnection } from "wagmi";
import { Link } from "react-router-dom";
import { encodeFunctionData, parseEventLogs } from "viem";
import { Send, ListChecks } from "lucide-react";
import { useFundContext } from "@/features/funds/FundLayout";
import { useTransaction } from "@/hooks/useTransaction";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { clientFor, managerFundPath } from "@/web3/deployments";
import { actionLabels } from "@/app/labels";
import { useLanguage } from "@/app/i18n";
import { formatOfl } from "@/lib/amount";
import {
  Panel,
  Notice,
  TextField,
  SelectField,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { Disclosure } from "@/components/patterns";
import { FieldGroup } from "@/components/ui/field";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  availableActions,
  emptyProposal,
  proposalAction,
  proposalErrors,
  type ProposalDraft,
  type ProposalErrors,
  type ProposalKind,
} from "./proposal";

export function ProposalComposer({ kinds }: { kinds: ProposalKind[] }) {
  const { d, row } = useFundContext();
  const c = useConnection();
  const tx = useTransaction(d);
  const { t } = useLanguage();
  const [selected, setSelected] = useState(kinds[0]);
  const kind = kinds.includes(selected) ? selected : kinds[0];
  const [draft, setDraft] = useState<ProposalDraft>(emptyProposal);
  const [errors, setErrors] = useState<ProposalErrors>({});
  const [error, setError] = useState<unknown>();
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [proposalId, setProposalId] = useState<bigint>();
  const locked = useRef(false);
  const [checking, setChecking] = useState(false);
  const busy = checking || tx.busy;
  const update = (key: keyof ProposalDraft) => (value: string) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
    setError(undefined);
  };
  async function propose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || tx.busy || proposalId !== undefined) return;
    setError(undefined);
    const nextErrors = proposalErrors(row, kind, draft);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      if (nextErrors.uri || nextErrors.hash) setEvidenceOpen(true);
      requestAnimationFrame(() =>
        document.getElementById(`proposal-${first}`)?.focus(),
      );
      return;
    }
    locked.current = true;
    setChecking(true);
    try {
      if (!availableActions(row, c.address).includes(kind))
        throw Error("Only current manager, or approvers for recovery actions.");
      const action = proposalAction(kind, draft);
      if (kind === 0) {
        const allowed = await clientFor(d).readContract({
          address: d.openFundAddress,
          abi: openFundAbi,
          functionName: "isAllowedRecipient",
          args: [row.id, action.target],
        });
        if (!allowed) {
          setErrors({ target: "ຜູ້ຮັບນີ້ບໍ່ຢູ່ໃນເງື່ອນໄຂທີ່ກອງທຶນອະນຸຍາດ." });
          document.getElementById("proposal-target")?.focus();
          return;
        }
      }
      const receipt = await tx.send(
        d.openFundAddress,
        encodeFunctionData({
          abi: openFundAbi,
          functionName: "createProposal",
          args: [row.id, action],
        }),
      );
      if (receipt) {
        const [created] = parseEventLogs({
          abi: openFundAbi,
          eventName: "ProposalCreated",
          logs: receipt.logs.filter(
            (log) =>
              log.address.toLowerCase() === d.openFundAddress.toLowerCase(),
          ),
        });
        if (created?.args.fundId === row.id)
          setProposalId(created.args.proposalId);
      }
    } catch (e) {
      setError(e);
    } finally {
      locked.current = false;
      setChecking(false);
    }
  }
  return (
    <Panel
      title={actionLabels[kind]}
      description={
        kind === 0
          ? "ສະເໜີ → ອະນຸມັດ → ດຳເນີນການຈ່າຍເງິນ"
          : "ສະເໜີ → ອະນຸມັດ → ລໍຖ້າ 24 ຊົ່ວໂມງ → ດຳເນີນການ"
      }
    >
      <form onSubmit={propose} noValidate>
        <FieldGroup>
          {proposalId !== undefined ? (
            <Notice title="ຂໍ້ສະເໜີຖືກບັນທຶກແລ້ວ">
              <p>
                ຂໍ້ສະເໜີ #{proposalId.toString()}{" "}
                ຕ້ອງຜ່ານການອະນຸມັດກ່ອນດຳເນີນການ.
              </p>
              <Link
                className={buttonVariants({ variant: "outline" })}
                to={`${managerFundPath(d, row.id)}/proposals/${proposalId}`}
              >
                <ListChecks data-icon="inline-start" aria-hidden="true" />
                ກວດສອບຂໍ້ສະເໜີ #{proposalId.toString()}
              </Link>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setProposalId(undefined);
                  setDraft(emptyProposal);
                  setErrors({});
                  tx.reset?.();
                }}
              >
                ສ້າງຂໍ້ສະເໜີອີກ
              </Button>
            </Notice>
          ) : (
            <>
              {kinds.length > 1 ? (
                <SelectField
                  label="ສິ່ງທີ່ຕ້ອງການສະເໜີ"
                  value={String(kind)}
                  disabled={busy}
                  onChange={(value) => {
                    setSelected(Number(value) as ProposalKind);
                    setDraft(emptyProposal);
                    setErrors({});
                    setError(undefined);
                  }}
                  options={kinds.map((k) => [String(k), actionLabels[k]])}
                />
              ) : null}
              {![4, 7].includes(kind) ? (
                <TextField
                  id="proposal-target"
                  label={
                    kind === 0 ? t("recipient") : "ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ"
                  }
                  value={draft.target}
                  onChange={update("target")}
                  error={errors.target}
                  disabled={busy}
                  required
                />
              ) : null}
              {kind === 0 ? (
                <TextField
                  id="proposal-sum"
                  label={t("amount")}
                  inputMode="decimal"
                  value={draft.sum}
                  onChange={update("sum")}
                  error={errors.sum}
                  disabled={busy}
                  required
                />
              ) : null}
              {kind === 4 ? (
                <TextField
                  id="proposal-value"
                  label="ຈຳນວນອະນຸມັດໃໝ່"
                  inputMode="numeric"
                  value={draft.value}
                  onChange={update("value")}
                  error={errors.value}
                  disabled={busy}
                  required
                />
              ) : null}
              <TextField
                id="proposal-purpose"
                label={t("purpose")}
                value={draft.purpose}
                onChange={update("purpose")}
                error={errors.purpose}
                help="ສູງສຸດ 240 ໄບຕ໌ UTF-8"
                multiline
                disabled={busy}
                required={kind === 0}
              />
              <Disclosure
                title="ຫຼັກຖານປະກອບ (ຖ້າມີ)"
                open={evidenceOpen}
                onOpenChange={setEvidenceOpen}
              >
                <TextField
                  id="proposal-uri"
                  label="ລິ້ງຫຼັກຖານ (ຖ້າມີ)"
                  value={draft.uri}
                  onChange={update("uri")}
                  error={errors.uri}
                  disabled={busy}
                />
                <TextField
                  id="proposal-hash"
                  label="ລະຫັດຢືນຢັນຫຼັກຖານ (ຖ້າມີ)"
                  value={draft.hash}
                  onChange={update("hash")}
                  error={errors.hash}
                  disabled={busy}
                />
              </Disclosure>
              <Notice title="ກວດສອບກ່ອນສົ່ງ">
                <dl className="data-list">
                  <dt>ລາຍການ</dt>
                  <dd>{actionLabels[kind]}</dd>
                  {draft.target && ![4, 7].includes(kind) ? (
                    <>
                      <dt>ກະເປົາ</dt>
                      <dd>
                        <code>{draft.target}</code>
                      </dd>
                    </>
                  ) : null}
                  {kind === 0 ? (
                    <>
                      <dt>ຈຳນວນ</dt>
                      <dd>{draft.sum || "0"} OFL</dd>
                    </>
                  ) : null}
                  {kind === 4 ? (
                    <>
                      <dt>ຈຳນວນອະນຸມັດໃໝ່</dt>
                      <dd>{draft.value || "—"}</dd>
                    </>
                  ) : null}
                </dl>
                <p>
                  ຍອດຄົງເຫຼືອ {formatOfl(row.fund.balance)} OFL · ຕ້ອງອະນຸມັດ{" "}
                  {row.fund.threshold}/{row.approvers.length} ຄົນ.
                </p>
                <p>
                  {kind === 0
                    ? "ການສະເໜີບໍ່ໄດ້ຈອງຍອດເງິນໄວ້. ຈະໂອນເງິນເມື່ອດຳເນີນການຫຼັງອະນຸມັດຄົບເທົ່ານັ້ນ."
                    : "ລໍຖ້າ 24 ຊົ່ວໂມງຫຼັງອະນຸມັດຄົບ. ການປ່ຽນກົດອາດຍົກເລີກຂໍ້ສະເໜີເກົ່າ."}
                </p>
              </Notice>
              <Button
                type="submit"
                disabled={
                  busy ||
                  c.chainId !== d.chainId ||
                  !availableActions(row, c.address).includes(kind)
                }
                aria-busy={busy}
              >
                {busy ? (
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                ) : (
                  <Send data-icon="inline-start" aria-hidden="true" />
                )}
                {busy ? "ກຳລັງສົ່ງ…" : "ສົ່ງຂໍ້ສະເໜີ"}
              </Button>
            </>
          )}
          <ErrorNotice error={error} />
          <TxFeedback state={tx.state} d={d} />
        </FieldGroup>
      </form>
    </Panel>
  );
}
