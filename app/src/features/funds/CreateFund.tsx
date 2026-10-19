import { friendlyError } from "@/lib/errors";
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
    <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມສ້າງກອງທຶນ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
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
          "ຍັງບໍ່ພົບຫຼັກຖານການສ້າງກອງທຶນ. ກະລຸນາກວດໃບຢືນຢັນກ່ອນລອງໃໝ່.",
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
        <div className="eyebrow"> ສ້າງກອງທຶນໃຫ້ອົງກອນ ແລະມູນນິທິ </div>
        <h1>{t("create")}</h1>
        <p>
          {" "}
          ບອກພາລະກິດຂອງອົງກອນ ກຳນົດເປົ້າໝາຍ ແລະເລືອກຜູ້ຮ່ວມອະນຸມັດ.
          ຂໍ້ມູນຮ່າງຈະຖືກບັນທຶກໄວ້ໃນອຸປະກອນນີ້.{" "}
        </p>
      </div>
      <SelectField
        label="ເຄືອຂ່າຍທີ່ໃຊ້ສ້າງກອງທຶນ"
        value={version}
        onChange={setVersion}
        options={deployments.map((d) => [
          d.version,
          `${d.chainId === 31337 ? "ເຄືອຂ່າຍທົດລອງ" : d.chainId} · ${d.version}`,
        ])}
      />
      <div className="stepper">
        {["ຂໍ້ມູນ", "ລະດົມທຶນ", "ການອະນຸມັດ", "ຜູ້ຮັບ", "ກວດສອບ"].map(
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
            "1 · ຂໍ້ມູນກອງທຶນ",
            "2 · ການລະດົມທຶນ",
            "3 · ການອະນຸມັດ",
            "4 · ຜູ້ຮັບ",
            "5 · ກວດສອບ",
          ][step]
        }
      >
        <FieldGroup>
          {step === 0 ? (
            <>
              {input(
                "title",
                t("title"),
                "ຕັ້ງຊື່ໃຫ້ສັ້ນ ແລະຈື່ງ່າຍ. ພາສາລາວປະມານ 40 ຕົວອັກສອນ (ບໍ່ເກີນ 120 ໄບຕ໌).",
              )}
              {input(
                "summary",
                t("summary"),
                "ອະທິບາຍວ່າເຈົ້າຢາກຊ່ວຍໃຜ ແລະຈະນຳໃຊ້ເງິນແນວໃດ (ບໍ່ເກີນ 600 ໄບຕ໌).",
                true,
              )}
              {input("category", "ໝວດໝູ່")}
              {input("location", "ສະຖານທີ່ (ຖ້າມີ)")}
              {input("manager", t("manager"))}
              <Button
                variant="outline"
                onClick={() =>
                  connection.address && change("manager")(connection.address)
                }
                disabled={!connection.address}
              >
                {" "}
                ໃຊ້ກະເປົາທີ່ເຊື່ອມຢູ່{" "}
              </Button>
              {input(
                "terms",
                "ຈຸດປະສົງ ແລະເງື່ອນໄຂຖາວອນ",
                "ເງື່ອນໄຂນີ້ຈະປ່ຽນບໍ່ໄດ້ຫຼັງສ້າງກອງທຶນ. ກະລຸນາເກັບສຳເນົາໄວ້ນຳ.",
                true,
              )}
              {input("termsURI", "ລິ້ງເອກະສານເງື່ອນໄຂ (ຖ້າມີ)")}
              {input("metadataURI", "ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ (ຖ້າມີ)")}
              <Notice title="ຂໍ້ມູນສາທາລະນະຖາວອນ">{t("privacy")}</Notice>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <SelectField
                label="ຮູບແບບການລະດົມທຶນ"
                value={draft.mode}
                onChange={change("mode")}
                options={[
                  ["0", "ລະດົມທຶນຕາມເປົ້າໝາຍ"],
                  ["1", "ຮັບສະໜັບສະໜູນຕໍ່ເນື່ອງ"],
                ]}
              />
              {draft.mode === "0" ? (
                <>
                  {input("goal", t("goal") + " (OFL)")}
                  {input("days", "ໄລຍະເວລາ (1–365 ວັນ)")}
                  <SelectField
                    label="ຖ້າບໍ່ເຖິງເປົ້າໝາຍ"
                    value={draft.policy}
                    onChange={change("policy")}
                    options={[
                      ["", "ເລືອກເງື່ອນໄຂ…"],
                      ["0", "ຄືນເງິນໃຫ້ຜູ້ສະໜັບສະໜູນ"],
                      ["1", "ເກັບເງິນໄວ້ດຳເນີນງານ"],
                    ]}
                  />
                  <small>
                    {" "}
                    ວັນສິ້ນສຸດໂດຍປະມານ:{" "}
                    {Number.isFinite(+draft.days)
                      ? new Date(
                          previewTime +
                            Math.min(365, Math.max(0, +draft.days)) * 86400000,
                        ).toLocaleString("lo-LA", { timeZoneName: "short" })
                      : "—"}{" "}
                    . ວັນທີຈິງຈະຖືກກຳນົດເມື່ອສ້າງກອງທຶນສຳເລັດ.{" "}
                  </small>
                  <Notice>
                    {draft.policy === "0"
                      ? t("refundPolicy")
                      : draft.policy === "1"
                        ? t("keepPolicy")
                        : "ເງື່ອນໄຂນີ້ປ່ຽນບໍ່ໄດ້ຫຼັງສ້າງກອງທຶນ."}
                  </Notice>
                </>
              ) : (
                <Notice>
                  {t("continuousPolicy")} ຮູບແບບນີ້ບໍ່ກຳນົດເປົ້າໝາຍ
                  ຫຼືວັນສິ້ນສຸດ.{" "}
                </Notice>
              )}
            </>
          ) : null}
          {step === 2 ? (
            <>
              {input(
                "approvers",
                "ທີ່ຢູ່ກະເປົາຜູ້ອະນຸມັດ (ໜຶ່ງຄົນຕໍ່ແຖວ)",
                "ເລືອກຜູ້ຮ່ວມອະນຸມັດ 1–10 ຄົນ ໂດຍໃຊ້ທີ່ຢູ່ກະເປົາທີ່ບໍ່ຊ້ຳກັນ.",
                true,
              )}
              {input("threshold", "ຈຳນວນຄົນທີ່ຕ້ອງອະນຸມັດ")}
              {input("minimum", "ຈຳນວນຄົນອະນຸມັດຂັ້ນຕ່ຳຖາວອນ")}
              <Notice
                title={
                  draft.threshold === "1"
                    ? "ການອະນຸມັດໂດຍຄົນດຽວ"
                    : "ແນະນຳໃຫ້ມີຜູ້ອະນຸມັດ 3 ຄົນ ແລະຕ້ອງອະນຸມັດຢ່າງໜ້ອຍ 2 ຄົນ"
                }
              >
                {" "}
                ການສະເໜີຍັງບໍ່ແມ່ນການອະນຸມັດ. ການປ່ຽນແປງສຳຄັນຕ້ອງລໍຖ້າ 24
                ຊົ່ວໂມງ. ຖ້າເສຍສິດເຂົ້າກະເປົາຈົນອະນຸມັດບໍ່ຄົບ
                ເງິນອາດຖືກລັອກຖາວອນ ແລະບໍ່ມີຜູ້ດູແລທີ່ກູ້ຄືນໃຫ້ໄດ້.{" "}
              </Notice>
            </>
          ) : null}
          {step === 3 ? (
            <>
              <SelectField
                label="ເງື່ອນໄຂຜູ້ຮັບເງິນ (ປ່ຽນບໍ່ໄດ້)"
                value={draft.recipientPolicy}
                onChange={change("recipientPolicy")}
                options={[
                  ["0", "ເລືອກຜູ້ຮັບທີ່ມີສິດໄດ້ຕາມການອະນຸມັດ"],
                  ["1", "ຈ່າຍໄດ້ສະເພາະຜູ້ຮັບໃນລາຍຊື່ທີ່ອະນຸມັດ"],
                ]}
              />
              {draft.recipientPolicy === "1"
                ? input(
                    "recipients",
                    "ລາຍຊື່ຜູ້ຮັບເບື້ອງຕົ້ນ",
                    "ໜຶ່ງກະເປົາຕໍ່ແຖວ. ສາມາດເວັ້ນວ່າງໄວ້ໄດ້; ການເພີ່ມພາຍຫຼັງຕ້ອງຜ່ານການອະນຸມັດ ແລະລໍຖ້າຕາມກຳນົດ.",
                    true,
                  )
                : null}
              <Notice>
                {" "}
                ທຸກການຈ່າຍເງິນຕ້ອງຜ່ານການອະນຸມັດ. ຖ້າເລືອກຈຳກັດລາຍຊື່
                ຈະປ່ຽນເປັນແບບບໍ່ຈຳກັດບໍ່ໄດ້.
                ຍັງບໍ່ຮອງຮັບການໂອນລະຫວ່າງກອງທຶນ.{" "}
              </Notice>
            </>
          ) : null}
          {step === 4 ? (
            <>
              <Notice title="ເງື່ອນໄຂການເງິນຖາວອນ">
                {" "}
                ເປົ້າໝາຍ ໄລຍະເວລາ ນະໂຍບາຍຄືນເງິນ ຈຳນວນອະນຸມັດຂັ້ນຕ່ຳ
                ແລະເງື່ອນໄຂຜູ້ຮັບ ປ່ຽນບໍ່ໄດ້ພາຍຫຼັງ.{" "}
              </Notice>
              {review ? (
                <dl className="data-list">
                  <dt> ຊື່ກອງທຶນ / ຜູ້ຈັດການ </dt>
                  <dd>
                    {draft.title}
                    <code className="hash">{review[0].manager}</code>
                  </dd>
                  <dt> ລະດົມທຶນ </dt>
                  <dd>
                    {draft.mode === "0"
                      ? `${draft.goal} OFL · ${draft.days} ວັນ · ${draft.policy === "0" ? "ຄືນເງິນ" : "ເກັບເງິນໄວ້"}`
                      : "ຕໍ່ເນື່ອງ · ບໍ່ມີການຄືນເງິນອັດຕະໂນມັດ"}
                  </dd>
                  <dt> ການອະນຸມັດ </dt>
                  <dd>
                    {draft.threshold}/{review[1].length} ; ຂັ້ນຕ່ຳ{" "}
                    {draft.minimum}
                  </dd>
                  <dt> ຜູ້ອະນຸມັດ </dt>
                  <dd>
                    {review[1].map((a) => (
                      <code className="hash" key={a}>
                        {a}
                      </code>
                    ))}
                  </dd>
                  <dt> ຜູ້ຮັບ </dt>
                  <dd>
                    {draft.recipientPolicy === "0"
                      ? "ເລືອກຜູ້ຮັບໄດ້ຕາມການອະນຸມັດ"
                      : review[2].join("\n") || "ຍັງບໍ່ມີລາຍຊື່ຜູ້ຮັບ"}
                  </dd>
                  <dt> ລະຫັດຢືນຢັນເງື່ອນໄຂ </dt>
                  <dd>
                    <code>{review[0].termsHash}</code>
                    <p>{draft.terms}</p>
                  </dd>
                  <dt> ຂໍ້ມູນອ້າງອີງກອງທຶນ </dt>
                  <dd>
                    {d.chainId} / {d.version}
                    <code className="hash">{d.openFundAddress}</code>
                  </dd>
                </dl>
              ) : (
                <Notice title="ກະລຸນາກວດສອບຂໍ້ມູນ">
                  {(() => {
                    try {
                      creationArgs(draft);
                      return "";
                    } catch (e) {
                      return friendlyError(e);
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
