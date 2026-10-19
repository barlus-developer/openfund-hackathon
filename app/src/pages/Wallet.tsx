import { useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { encodeFunctionData, formatUnits, getAddress } from "viem";
import { defaultDeployment, clientFor, chainFor } from "@/web3/deployments";
import { useBalances } from "@/web3/reads";
import { tokenAbi } from "@/web3/generated/OFLToken";
import { useTransaction } from "@/hooks/useTransaction";
import { Connect } from "@/features/wallet/Connect";
import { amount, ofl } from "@/lib/amount";
import { walletAddress } from "@/features/funds/creation";
import {
  Panel,
  Notice,
  EmptyState,
  TextField,
  ErrorNotice,
  TxFeedback,
} from "@/components/common";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useLanguage } from "@/app/i18n";
export function WalletPage() {
  return defaultDeployment ? (
    <WalletContent />
  ) : (
    <EmptyState description="ລະບົບຍັງບໍ່ພ້ອມໃຊ້ງານ. ກະລຸນາລອງໃໝ່ພາຍຫຼັງ." />
  );
}
function WalletContent() {
  const d = defaultDeployment!,
    c = useConnection(),
    balances = useBalances(d, c.address),
    wallet = useWalletClient(),
    tx = useTransaction(d),
    { t } = useLanguage();
  const [target, setTarget] = useState(""),
    [value, setValue] = useState(""),
    [error, setError] = useState<unknown>(),
    [message, setMessage] = useState("");
  async function send() {
    setError(undefined);
    try {
      const to = getAddress(walletAddress.parse(target));
      if (
        await clientFor(d).readContract({
          address: d.oflTokenAddress,
          abi: tokenAbi,
          functionName: "protectedFunds",
          args: [to],
        })
      )
        throw Error("ກະລຸນາເລືອກກອງທຶນ ແລະໃຊ້ປຸ່ມສະໜັບສະໜູນເພື່ອໂອນໃຫ້ກອງທຶນ.");
      await tx.send(
        d.oflTokenAddress,
        encodeFunctionData({
          abi: tokenAbi,
          functionName: "transfer",
          args: [to, amount(value)],
        }),
      );
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="stack">
      <div className="page-title">
        <h1>{t("wallet")}</h1>
        <Connect />
      </div>
      <Notice title="OFL ທົດລອງ · ບໍ່ມີເງິນກີບຄ້ຳປະກັນ">
        {" "}
        1 OFL ≈ 1 ກີບ ເປັນພຽງຄ່າອ້າງອີງ. OFL ທົດລອງບໍ່ສາມາດຊື້
        ຫຼືແລກຄືນເປັນເງິນກີບໄດ້.{" "}
      </Notice>
      <div className="detail-grid">
        <Panel title="ຍອດຄົງເຫຼືອ ແລະການຮັບເງິນ">
          <div className="stack">
            <code className="hash">
              {c.address || "ເຊື່ອມ MetaMask ເພື່ອຮັບ OFL."}
            </code>
            <div className="metrics">
              <div className="metric">
                <span> ຍອດ OFL </span>
                <strong>{ofl(balances.data?.ofl)}</strong>
              </div>
              <div className="metric">
                <span>
                  {" "}
                  ຍອດສຳລັບຄ່າທຳນຽມ ( {chainFor(d).nativeCurrency.symbol})
                </span>
                <strong>
                  {balances.data
                    ? formatUnits(
                        balances.data.native,
                        chainFor(d).nativeCurrency.decimals,
                      )
                    : "—"}
                </strong>
              </div>
            </div>
            <Button
              variant="outline"
              disabled={!c.address}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(c.address!);
                  setMessage("ສຳເນົາທີ່ຢູ່ແລ້ວ.");
                } catch (e) {
                  setError(e);
                }
              }}
            >
              {" "}
              ສຳເນົາທີ່ຢູ່ຮັບເງິນ{" "}
            </Button>
            <Button
              variant="outline"
              disabled={!wallet.data || c.chainId !== d.chainId}
              onClick={async () => {
                try {
                  const ok = await wallet.data!.watchAsset({
                    type: "ERC20",
                    options: {
                      address: d.oflTokenAddress,
                      symbol: "OFL",
                      decimals: 18,
                    },
                  });
                  setMessage(
                    ok ? "ເພີ່ມ OFL ໃນ MetaMask ແລ້ວ." : "ຍັງບໍ່ໄດ້ເພີ່ມ OFL.",
                  );
                } catch (e) {
                  setError(e);
                }
              }}
            >
              {" "}
              ເພີ່ມ OFL ໃນ MetaMask{" "}
            </Button>
            {d.explorerUrl && c.address ? (
              <a
                href={`${d.explorerUrl}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
              >
                {" "}
                ເບິ່ງກະເປົາໃນເວັບກວດສອບ ↗{" "}
              </a>
            ) : (
              <small>
                {" "}
                ເຄືອຂ່າຍນີ້ຍັງບໍ່ມີເວັບກວດສອບພາຍນອກ.
                ເຈົ້າຍັງເບິ່ງປະຫວັດໃນລະບົບນີ້ໄດ້.{" "}
              </small>
            )}
            <small>{message}</small>
            <ErrorNotice error={balances.error || error} />
          </div>
        </Panel>
        <Panel title="ໂອນ OFL ໃຫ້ກະເປົາອື່ນ">
          <FieldGroup>
            <TextField
              label={t("recipient")}
              value={target}
              onChange={setTarget}
            />
            <TextField label={t("amount")} value={value} onChange={setValue} />
            <Button
              disabled={!c.address || tx.busy || c.chainId !== d.chainId}
              onClick={send}
            >
              {" "}
              ໂອນ OFL ຜ່ານ MetaMask{" "}
            </Button>
            <small>
              {" "}
              ສຳລັບໂອນໃຫ້ກະເປົາອື່ນເທົ່ານັ້ນ. ຖ້າຕ້ອງການຊ່ວຍກອງທຶນ
              ໃຫ້ໃຊ້ປຸ່ມສະໜັບສະໜູນໃນໜ້າກອງທຶນ.{" "}
            </small>
            <TxFeedback state={tx.state} d={d} />
          </FieldGroup>
        </Panel>
      </div>
    </div>
  );
}
