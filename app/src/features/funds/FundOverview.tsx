import { HandHeart, Undo2, Archive } from "lucide-react";
import { Disclosure, Stat } from "@/components/patterns";
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
import { Connect } from "@/features/wallet/Connect";
import { Button } from "@/components/ui/button";
import { useFundContext } from "./FundLayout";
import { useLanguage } from "@/app/i18n";
import { FundProgress, Policy } from "./FundCard";
import { formatOfl, date } from "@/lib/amount";
import { clientFor, fundPath } from "@/web3/deployments";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
export function FundOverview() {
  const { d, row } = useFundContext(),
    { t } = useLanguage();
  const f = row.fund;
  const accepts =
    row.status === 0 || (row.status === 1 && f.config.fundingMode === 1);
  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
      <section
        className="flex min-w-0 flex-col gap-3 lg:col-start-1 lg:row-start-1"
        aria-label="ກ່ຽວກັບກອງທຶນ"
      >
        <p className="whitespace-pre-wrap text-base leading-8">{f.summary}</p>
      </section>
      <div className="flex min-w-0 flex-col gap-8 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-8">
        <Panel title="ຍອດສະໜັບສະໜູນ">
          <div className="flex flex-col gap-4">
            <FundProgress row={row} showLabel={false} />
            {f.config.deadline > 0n ? (
              <p className="text-sm text-muted-foreground">
                ສິ້ນສຸດ {date(f.config.deadline)}
              </p>
            ) : null}
            {accepts ? (
              <ActionLink icon={HandHeart} to={fundPath(d, row.id) + "/donate"}>
                {t("donate")}
              </ActionLink>
            ) : (
              <Notice title="ຢຸດຮັບສະໜັບສະໜູນແລ້ວ">
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
            )}
            <p className="text-sm text-muted-foreground">
              <Policy row={row} />
            </p>
            <p className="text-xs text-muted-foreground">
              ມີຄ່າທຳນຽມເຄືອຂ່າຍ. OFL ທົດລອງບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້.
            </p>
          </div>
        </Panel>
        <RefundClaim />
        {f.threshold === 1 ? (
          <Notice title="ການອະນຸມັດໂດຍຄົນດຽວ">
            ຜູ້ອະນຸມັດຄົນດຽວສາມາດຕັດສິນໃຈຈ່າຍເງິນໄດ້.
          </Notice>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-2">
        <section aria-labelledby="fund-money" className="flex flex-col gap-4">
          <h2 id="fund-money" className="text-lg font-semibold">
            ການນຳໃຊ້ເງິນ
          </h2>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
            {[
              [t("balance"), f.balance],
              ["ຈ່າຍແລ້ວ", f.totalWithdrawn],
              ["ຄືນເງິນແລ້ວ", f.totalRefunded],
            ].map(([label, value]) => (
              <Stat
                key={String(label)}
                label={String(label)}
                value={
                  <>
                    {formatOfl(value as bigint)} <small>OFL</small>
                  </>
                }
              />
            ))}
          </div>
        </section>
        <Disclosure title="ເງື່ອນໄຂກອງທຶນ ແລະຜູ້ຮັບຜິດຊອບ">
          <dl className="data-list">
            <dt>ຜູ້ຮັບເງິນ</dt>
            <dd>
              {f.config.recipientPolicy === 0
                ? "ເລືອກຜູ້ຮັບໄດ້ຕາມການອະນຸມັດ"
                : "ສະເພາະຜູ້ຮັບໃນລາຍຊື່"}
            </dd>
            <dt>ການອະນຸມັດກ່ອນຈ່າຍ</dt>
            <dd>
              {f.threshold} / {row.approvers.length} ຄົນ · ຂັ້ນຕ່ຳ{" "}
              {f.config.minimumApprovalThreshold} ຄົນ
            </dd>
            <dt>ຜູ້ຈັດການ</dt>
            <dd>
              <code>{f.manager}</code>
            </dd>
            {f.termsURI ? (
              <>
                <dt>ເອກະສານເງື່ອນໄຂ</dt>
                <dd>
                  <code>{f.termsURI}</code>
                </dd>
              </>
            ) : null}
          </dl>
          <p className="text-xs text-muted-foreground">
            ເງື່ອນໄຂການເງິນປ່ຽນບໍ່ໄດ້. ກະລຸນາກວດສອບຜູ້ຈັດການ;
            ຂໍ້ມູນສາທາລະນະບໍ່ໄດ້ຮັບຮອງການນຳໃຊ້ເງິນ.
          </p>
        </Disclosure>
        <Disclosure title="ຂໍ້ມູນອ້າງອີງກອງທຶນ">
          <dl className="data-list">
            <dt>ຜູ້ສ້າງ</dt>
            <dd>
              <code>{f.creator}</code>
            </dd>
            <dt>ລະຫັດເງື່ອນໄຂ</dt>
            <dd>
              <code>{f.config.termsHash}</code>
            </dd>
            <dt>ຮຸ່ນການອະນຸມັດ</dt>
            <dd>{f.governanceVersion.toString()}</dd>
            <dt>ລະບົບ</dt>
            <dd>
              {d.chainId} · {d.version}
              <code className="hash">{d.openFundAddress}</code>
            </dd>
            <dt>ຂໍ້ມູນເພີ່ມເຕີມ</dt>
            <dd>
              <code>{f.metadataURI || "ບໍ່ມີ"}</code>
            </dd>
          </dl>
        </Disclosure>
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
      <div className="flex min-w-0 flex-col gap-6">
        <p>{t("refundPolicy")} ບໍ່ມີວັນໝົດອາຍຸ ຫຼືຄ່າບໍລິການຈາກລະບົບ. </p>
        <p> ຍອດທີ່ກະເປົານີ້ຮັບຄືນໄດ້: {formatOfl(q.data)} OFL</p>
        <ErrorNotice error={q.error} />
        {!c.address || c.chainId !== d.chainId ? (
          <Connect chainId={d.chainId} />
        ) : null}
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
          <Undo2 data-icon="inline-start" aria-hidden="true" />
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
      <div className="flex min-w-0 flex-col gap-6">
        <p>
          {" "}
          ຍອດຄົງເຫຼືອກອງທຶນ: {formatOfl(row.fund.balance)} OFL.
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
            <Archive data-icon="inline-start" aria-hidden="true" />{" "}
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
