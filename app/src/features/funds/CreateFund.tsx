import { stored, remember, forget } from "@/lib/storage";
import { useState, useEffect } from "react";
import { useConnection } from "wagmi";
import { useNavigate } from "react-router-dom";
import { encodeFunctionData, decodeEventLog } from "viem";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import {
  TextField,
  SelectField,
  Panel,
  Notice,
  ErrorNotice,
  TxFeedback,
  EmptyState,
} from "@/components/common";
import { useLanguage } from "@/app/i18n";
import { defaultDeployment, deployments, fundPath } from "@/web3/deployments";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
import { emptyDraft, creationArgs, validateStep, type Draft } from "./creation";
import { Connect } from "@/features/wallet/Connect";
export function CreateFund() {
  return defaultDeployment ? (
    <Wizard />
  ) : (
    <EmptyState description="Deploy the official local contracts before creating a fund." />
  );
}
function Wizard() {
  const [version, setVersion] = useState(defaultDeployment!.version);
  const d = deployments.find((x) => x.version === version)!;
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = JSON.parse(stored("ofl-draft-v1") || "null");
      return saved ? { ...emptyDraft, ...saved } : emptyDraft;
    } catch {
      return emptyDraft;
    }
  });
  const [previewTime] = useState(() => Date.now());
  const [step, setStep] = useState(0),
    [error, setError] = useState<unknown>();
  const { t } = useLanguage(),
    connection = useConnection(),
    navigate = useNavigate();
  const tx = useTransaction(d);
  useEffect(() => {
    remember("ofl-draft-v1", JSON.stringify(draft));
  }, [draft]);
  const change = (key: keyof Draft) => (v: string) =>
    setDraft((old) => ({ ...old, [key]: v }));
  const input = (
    key: keyof Draft,
    label: string,
    help?: string,
    multiline = false,
  ) => (
    <TextField
      key={key}
      label={label}
      value={draft[key]}
      onChange={change(key)}
      help={help}
      multiline={multiline}
    />
  );
  let review;
  try {
    review = creationArgs(draft);
  } catch {
    /* Review shows all validation errors below. */
  }
  async function submit() {
    setError(undefined);
    try {
      const args = creationArgs(draft);
      const r = await tx.send(
        d.openFundAddress,
        encodeFunctionData({
          abi: openFundAbi,
          functionName: "createFund",
          args,
        }),
      );
      if (!r) return;
      const created = r.logs
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
        .find((e) => e?.eventName === "FundCreated");
      if (!created || created.eventName !== "FundCreated")
        throw Error(
          "Successful receipt has no FundCreated event. Inspect the receipt before retrying.",
        );
      forget("ofl-draft-v1");
      navigate(fundPath(d, created.args.fundId));
    } catch (e) {
      setError(e);
    }
  }
  function next() {
    setError(undefined);
    try {
      validateStep(draft, step);
      setStep((v) => Math.min(4, v + 1));
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="form-container stack">
      <div>
        <div className="eyebrow">NEW COMMUNITY FUND</div>
        <h1>{t("create")}</h1>
        <p>
          One transaction creates a fund ID inside the official immutable
          protocol.
        </p>
      </div>
      <SelectField
        label="Official network / version"
        value={version}
        onChange={setVersion}
        options={deployments.map((d) => [
          d.version,
          `${d.name} · ${d.version}`,
        ])}
      />
      <div className="stepper">
        {["Identity", "Funding", "Governance", "Recipients", "Review"].map(
          (s, i) => (
            <div className={i === step ? "step active" : "step"} key={s}>
              {i + 1}. {s}
            </div>
          ),
        )}
      </div>
      <Panel
        title={
          [
            "1 · ຂໍ້ມູນກອງທຶນ / Identity",
            "2 · ການລະດົມທຶນ / Funding",
            "3 · ການອະນຸມັດ / Governance",
            "4 · ຜູ້ຮັບ / Recipients",
            "5 · ກວດສອບ / Review",
          ][step]
        }
      >
        <FieldGroup>
          {step === 0 ? (
            <>
              {input(
                "title",
                t("title"),
                "Maximum 120 UTF-8 bytes; Lao characters use multiple bytes.",
              )}
              {input("summary", t("summary"), "Maximum 600 UTF-8 bytes.", true)}
              {input("category", "ໝວດໝູ່ / Category")}
              {input("location", "ສະຖານທີ່ / Location (descriptive only)")}
              {input("manager", t("manager"))}
              <Button
                variant="outline"
                onClick={() =>
                  connection.address && change("manager")(connection.address)
                }
                disabled={!connection.address}
              >
                Use connected wallet
              </Button>
              {input(
                "terms",
                "ເງື່ອນໄຂຖາວອນ / Immutable purpose and terms",
                "Hashed with location as UTF-8 using keccak256. Keep an independent copy.",
                true,
              )}
              {input("termsURI", "Immutable terms URI (optional)")}
              {input(
                "metadataURI",
                "Presentation metadata IPFS URI (optional)",
              )}
              <Notice title="Public & permanent">{t("privacy")}</Notice>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <SelectField
                label="ຮູບແບບ / Funding mode"
                value={draft.mode}
                onChange={change("mode")}
                options={[
                  ["0", "TARGETED · ມີເປົ້າໝາຍ"],
                  ["1", "CONTINUOUS · ຕໍ່ເນື່ອງ"],
                ]}
              />
              {draft.mode === "0" ? (
                <>
                  {input("goal", t("goal") + " (OFL)")}
                  {input("days", "ໄລຍະເວລາ / Duration (1–365 days)")}
                  <SelectField
                    label="ຖ້າບໍ່ເຖິງເປົ້າໝາຍ / Failure policy"
                    value={draft.policy}
                    onChange={change("policy")}
                    options={[
                      ["", "Choose explicitly…"],
                      ["0", "REFUND · ຄືນເງິນ"],
                      ["1", "KEEP_FUNDS · ເກັບເງິນໄວ້"],
                    ]}
                  />
                  <small>
                    Estimated UTC deadline:{" "}
                    {Number.isFinite(+draft.days)
                      ? new Date(
                          previewTime +
                            Math.min(365, Math.max(0, +draft.days)) * 86400000,
                        ).toUTCString()
                      : "—"}
                    . The creation block sets the actual deadline.
                  </small>
                  <Notice>
                    {draft.policy === "0"
                      ? t("refundPolicy")
                      : draft.policy === "1"
                        ? t("keepPolicy")
                        : "The failure policy is immutable."}
                  </Notice>
                </>
              ) : (
                <Notice>
                  {t("continuousPolicy")} Goal, deadline and failure policy are
                  canonicalized to zero / neutral.
                </Notice>
              )}
            </>
          ) : null}
          {step === 2 ? (
            <>
              {input(
                "approvers",
                "ກະເປົາຜູ້ອະນຸມັດ / Approvers (one per line)",
                "1–10 unique nonzero wallets.",
                true,
              )}
              {input("threshold", "ຈຳນວນອະນຸມັດ / Required approvals")}
              {input("minimum", "ຂັ້ນຕ່ຳຖາວອນ / Immutable minimum threshold")}
              <Notice
                title={
                  draft.threshold === "1"
                    ? "Single-signature risk"
                    : "Suggested social-fund setup: 2 of 3"
                }
              >
                Submission is separate from approval. Sensitive changes wait 24
                hours. Lost keys may lock funds forever if the original
                threshold cannot be reached. There is no platform recovery
                override.
              </Notice>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <SelectField
                label="ນະໂຍບາຍຜູ້ຮັບ / Immutable recipient policy"
                value={draft.recipientPolicy}
                onChange={change("recipientPolicy")}
                options={[
                  ["0", "OPEN · Governance may choose any eligible recipient"],
                  ["1", "ALLOWLIST · Governance must maintain an allowlist"],
                ]}
              />
              {draft.recipientPolicy === "1"
                ? input(
                    "recipients",
                    "Initial allowed recipients",
                    "One wallet per line. Can be empty; future additions require approval and timelock.",
                    true,
                  )
                : null}
              <Notice>
                Only approved proposals can spend. Allowlist mode can never
                become OPEN. No fund-to-fund transfers in v1.
              </Notice>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <Notice title="Immutable financial rules">
                Goal, duration, failure policy, minimum threshold, recipient
                mode and terms hash cannot be edited later.
              </Notice>
              {review ? (
                <dl className="data-list">
                  <dt>Title / manager</dt>
                  <dd>
                    {draft.title}
                    <code className="hash">{review[0].manager}</code>
                  </dd>
                  <dt>Funding</dt>
                  <dd>
                    {draft.mode === "0"
                      ? `${draft.goal} OFL · ${draft.days} days · ${draft.policy === "0" ? "REFUND" : "KEEP_FUNDS"}`
                      : "Continuous · No automatic refund"}
                  </dd>
                  <dt>Governance</dt>
                  <dd>
                    {draft.threshold}/{review[1].length}; minimum{" "}
                    {draft.minimum}
                  </dd>
                  <dt>Approvers</dt>
                  <dd>
                    {review[1].map((a) => (
                      <code className="hash" key={a}>
                        {a}
                      </code>
                    ))}
                  </dd>
                  <dt>Recipients</dt>
                  <dd>
                    {draft.recipientPolicy === "0"
                      ? "OPEN"
                      : review[2].join("\n") || "Empty allowlist"}
                  </dd>
                  <dt>Terms hash</dt>
                  <dd>
                    <code>{review[0].termsHash}</code>
                    <p>{draft.terms}</p>
                  </dd>
                  <dt>Official identity</dt>
                  <dd>
                    {d.chainId} / {d.version}
                    <code className="hash">{d.openFundAddress}</code>
                  </dd>
                </dl>
              ) : (
                <Notice title="Validation required">
                  {(() => {
                    try {
                      creationArgs(draft);
                      return "";
                    } catch (e) {
                      return String(e);
                    }
                  })()}
                </Notice>
              )}
              <Connect chainId={d.chainId} />
            </>
          ) : null}
        </FieldGroup>
        <div className="form-actions">
          <Button
            variant="outline"
            disabled={step === 0 || tx.busy}
            onClick={() => setStep((v) => v - 1)}
          >
            {t("back")}
          </Button>
          {step < 4 ? (
            <Button onClick={next}>{t("next")}</Button>
          ) : (
            <Button
              onClick={submit}
              disabled={
                !review ||
                tx.busy ||
                !connection.address ||
                connection.chainId !== d.chainId
              }
            >
              {t("create")} · MetaMask
            </Button>
          )}
        </div>
      </Panel>
      <ErrorNotice error={error} />
      <TxFeedback state={tx.state} d={d} />
    </div>
  );
}
