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
      <Notice title="ສະຖານະກອງທຶນ">
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
          ["ຈ່າຍແລ້ວ", f.totalWithdrawn],
          ["ຄືນເງິນແລ້ວ", f.totalRefunded],
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
            title="ເງື່ອນໄຂກອງທຶນ"
            description="ເງື່ອນໄຂນີ້ຈະບໍ່ປ່ຽນ ເຖິງຈະມີການອັບເດດຂໍ້ມູນອື່ນ."
          >
            <dl className="data-list">
              <dt> ຮູບແບບ </dt>
              <dd>{f.config.fundingMode === 0 ? "ມີເປົ້າໝາຍ" : "ຕໍ່ເນື່ອງ"}</dd>
              <dt> ເປົ້າໝາຍ </dt>
              <dd>
                {f.config.fundingGoal
                  ? `${ofl(f.config.fundingGoal)} OFL`
                  : "ບໍ່ກຳນົດເປົ້າໝາຍ"}
              </dd>
              <dt> ວັນສິ້ນສຸດ </dt>
              <dd>{date(f.config.deadline)} (ຕາມເວລາເຄືອຂ່າຍ) </dd>
              <dt> ເງື່ອນໄຂການສະໜັບສະໜູນ </dt>
              <dd>
                <Policy row={row} />
              </dd>
              <dt> ເງື່ອນໄຂຜູ້ຮັບ </dt>
              <dd>
                {f.config.recipientPolicy === 0
                  ? "ເລືອກຜູ້ຮັບໄດ້ຕາມການອະນຸມັດ"
                  : "ສະເພາະຜູ້ຮັບໃນລາຍຊື່"}
              </dd>
              <dt> ຈຳນວນອະນຸມັດຂັ້ນຕ່ຳ </dt>
              <dd>{f.config.minimumApprovalThreshold}</dd>
              <dt> ລະຫັດຢືນຢັນເງື່ອນໄຂ </dt>
              <dd>
                <code>{f.config.termsHash}</code>
              </dd>
              <dt> ເອກະສານເງື່ອນໄຂ </dt>
              <dd>
                <code>{f.termsURI || "ບໍ່ມີເອກະສານເພີ່ມ"}</code>
              </dd>
            </dl>
          </Panel>
          <Panel title="ຜູ້ຮັບຜິດຊອບ ແລະຂໍ້ມູນກອງທຶນ">
            <dl className="data-list">
              <dt> ຜູ້ສ້າງກອງທຶນ </dt>
              <dd>
                <code>{f.creator}</code>
              </dd>
              <dt> ຜູ້ຈັດການປັດຈຸບັນ </dt>
              <dd>
                <code>{f.manager}</code>
              </dd>
              <dt> ຈຳນວນການອະນຸມັດ </dt>
              <dd>
                {f.threshold} / {row.approvers.length} · ການອະນຸມັດຮຸ່ນ{" "}
                {f.governanceVersion.toString()}
              </dd>
              <dt> ຂໍ້ມູນອ້າງອີງກອງທຶນ </dt>
              <dd>
                {d.chainId} · {d.version}
                <code className="hash">{d.openFundAddress}</code>
              </dd>
              <dt> ຂໍ້ມູນເພີ່ມເຕີມ </dt>
              <dd>
                <code>{f.metadataURI || "ມີພຽງລາຍລະອຽດທີ່ບັນທຶກໃນລະບົບ"}</code>
                <p>
                  {" "}
                  ຜູ້ຈັດການສາມາດອັບເດດລິ້ງນີ້ໄດ້
                  ແຕ່ເງື່ອນໄຂກອງທຶນຍັງຄົງເດີມ.{" "}
                </p>
              </dd>
            </dl>
          </Panel>
        </div>
        <div className="stack">
          <Panel title="ຮ່ວມສ້າງສິ່ງດີໆ">
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
                <Notice title="ຢຸດຮັບສະໜັບສະໜູນແລ້ວ">
                  {" "}
                  ກອງທຶນນີ້ບໍ່ຮັບສະໜັບສະໜູນເພີ່ມໃນຂະນະນີ້.{" "}
                </Notice>
              )}
              <small>
                {" "}
                ຢືນຢັນການສະໜັບສະໜູນຄັ້ງດຽວ.
                ກະລຸນາກຽມຄ່າທຳນຽມເຄືອຂ່າຍໃນກະເປົາ.{" "}
              </small>
            </div>
          </Panel>
          {f.threshold === 1 ? (
            <Notice title="ການອະນຸມັດໂດຍຄົນດຽວ">
              {" "}
              ຜູ້ອະນຸມັດຄົນດຽວສາມາດຕັດສິນໃຈຈ່າຍເງິນໄດ້.
              ການມີຫຼາຍຄົນກໍບໍ່ໄດ້ຮັບຮອງການນຳໃຊ້ເງິນໃນຊີວິດຈິງ.{" "}
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
    <Panel title="ຮັບເງິນສະໜັບສະໜູນຄືນ">
      <div className="stack">
        <p>{t("refundPolicy")} ບໍ່ມີວັນໝົດອາຍຸ ຫຼືຄ່າບໍລິການຈາກລະບົບ. </p>
        <p> ຍອດທີ່ກະເປົານີ້ຮັບຄືນໄດ້: {ofl(q.data)} OFL</p>
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
        <small> ເງິນຈະກັບໄປກະເປົາທີ່ສະໜັບສະໜູນ. ຕ້ອງມີຄ່າທຳນຽມເຄືອຂ່າຍ. </small>
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
    <Panel title="ຢືນຢັນປິດກອງທຶນ">
      <div className="stack">
        <p>
          {" "}
          ຍອດຄົງເຫຼືອກອງທຶນ: {ofl(row.fund.balance)} OFL.
          ປິດກອງທຶນໄດ້ເມື່ອຍອດຄົງເຫຼືອເປັນສູນເທົ່ານັ້ນ.{" "}
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
            {" "}
            ປິດກອງທຶນຖາວອນ{" "}
          </Button>
        ) : (
          <small>
            {row.status === 2
              ? "ຜູ້ສະໜັບສະໜູນຍັງມີສິດຮັບເງິນຄືນໂດຍບໍ່ມີວັນໝົດອາຍຸ."
              : "ການຈ່າຍເງິນທີ່ເຫຼືອຕ້ອງຜ່ານການສະເໜີ ແລະອະນຸມັດຕາມປົກກະຕິ."}
          </small>
        )}
        <TxFeedback state={tx.state} d={d} />
      </div>
    </Panel>
  );
}
