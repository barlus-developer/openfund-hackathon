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
      if (!accepts) throw Error("ກອງທຶນນີ້ຢຸດຮັບສະໜັບສະໜູນແລ້ວ.");
      if (row.fund.config.fundingMode === 0 && n > remaining)
        throw Error("ຈຳນວນນີ້ເກີນຍອດທີ່ກອງທຶນຍັງຕ້ອງການ.");
      if (balances.data && n > balances.data.ofl)
        throw Error("ຍອດ OFL ໃນກະເປົາບໍ່ພຽງພໍ.");
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
          "ຍັງບໍ່ພົບຫຼັກຖານການສະໜັບສະໜູນ. ກະລຸນາກວດໃບຢືນຢັນກ່ອນລອງໃໝ່.",
        );
      setReceipt(
        `${ofl(event.args.amount)} OFL · ກອງທຶນ #${event.args.fundId} · ຜູ້ສະໜັບສະໜູນ ${event.args.donor}`,
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="detail-grid">
      <Panel
        title={t("donate")}
        description="ສະໜັບສະໜູນ OFL ໂດຍຢືນຢັນພຽງຄັ້ງດຽວ"
      >
        <FieldGroup>
          <Connect chainId={d.chainId} />
          <Notice title="ເງື່ອນໄຂການສະໜັບສະໜູນຂອງເຈົ້າ">
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
                {" "}
                ຍອດທີ່ຍັງຕ້ອງການ: {ofl(remaining)}
              </Button>
            ) : null}
          </div>
          <p>
            {" "}
            ຍອດໃນກະເປົາ: {ofl(balances.data?.ofl)} OFL · ຍອດສຳລັບຄ່າທຳນຽມ:{" "}
            {balances.data
              ? formatUnits(
                  balances.data.native,
                  chainFor(d).nativeCurrency.decimals,
                )
              : "—"}{" "}
            {chainFor(d).nativeCurrency.symbol}
          </p>
          <details className="advanced-filters">
            <summary>ເບິ່ງຂໍ້ມູນອ້າງອີງການໂອນ</summary>{" "}
            <small>
              {" "}
              ກອງທຶນ # {row.id.toString()} · {d.version} · ເຄືອຂ່າຍ {d.chainId}
              <code className="hash">{d.openFundAddress}</code> ທີ່ຢູ່ OFL
              ຂອງລະບົບ <code className="hash">{d.oflTokenAddress}</code>
            </small>
          </details>
          <ErrorNotice error={error || balances.error} />
          {!accepts ? (
            <Notice title="ຢຸດຮັບສະໜັບສະໜູນແລ້ວ">
              {" "}
              ກອງທຶນນີ້ບໍ່ສາມາດຮັບສະໜັບສະໜູນເພີ່ມໄດ້ໃນຂະນະນີ້.{" "}
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
          {receipt ? (
            <Notice title="ໃບຢືນຢັນການສະໜັບສະໜູນ">{receipt}</Notice>
          ) : null}
        </FieldGroup>
      </Panel>
      <div className="stack">
        <Panel title="ກ່ອນຢືນຢັນການສະໜັບສະໜູນ">
          <p>
            {" "}
            ບໍ່ຕ້ອງອະນຸມັດການໃຊ້ OFL ແຍກຕ່າງຫາກ.
            ຖ້າກອງທຶນບໍ່ສາມາດຮັບສະໜັບສະໜູນໄດ້ ການໂອນຈະບໍ່ສຳເລັດ.{" "}
          </p>
          <p>
            {" "}
            MetaMask ອາດຂໍໃຫ້ເຊື່ອມກະເປົາ ຫຼືປ່ຽນເຄືອຂ່າຍກ່ອນ. ຫຼັງຈາກນັ້ນ
            ຢືນຢັນການສະໜັບສະໜູນພຽງຄັ້ງດຽວ.{" "}
          </p>
          <p>
            {" "}
            1 OFL ≈ 1 ກີບ ເປັນພຽງຄ່າອ້າງອີງ. OFL
            ທົດລອງບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້.{" "}
          </p>
        </Panel>
      </div>
    </div>
  );
}
