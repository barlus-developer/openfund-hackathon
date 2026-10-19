import { Disclosure, PageHeader, Stat } from "@/components/patterns";
import { useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { encodeFunctionData, formatUnits, getAddress } from "viem";
import { defaultDeployment, clientFor, chainFor } from "@/web3/deployments";
import { useBalances } from "@/web3/reads";
import { tokenAbi } from "@/web3/generated/OFLToken";
import { useTransaction } from "@/hooks/useTransaction";
import { Connect } from "@/features/wallet/Connect";
import { amount, formatOfl } from "@/lib/amount";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <PageHeader
        title={t("wallet")}
        action={c.address ? <Connect /> : undefined}
      />
      <Notice title="OFL ທົດລອງ">
        OFL ບໍ່ມີເງິນກີບຄ້ຳປະກັນ ແລະບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້.
      </Notice>
      {!c.address ? (
        <EmptyState
          title="ເຊື່ອມກະເປົາຂອງເຈົ້າ"
          description="ເບິ່ງຍອດ OFL ຮັບ ແລະໂອນເງິນ."
          action={<Connect />}
        />
      ) : (
        <>
          <section
            className="flex flex-col gap-5"
            aria-label="ຍອດຄົງເຫຼືອ ແລະການຮັບເງິນ"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Stat label="ຍອດ OFL" value={formatOfl(balances.data?.ofl)} />
              <Stat
                label={`ຍອດສຳລັບຄ່າທຳນຽມ (${chainFor(d).nativeCurrency.symbol})`}
                value={
                  balances.data
                    ? formatUnits(
                        balances.data.native,
                        chainFor(d).nativeCurrency.decimals,
                      )
                    : "—"
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <code className="hash">{c.address}</code>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(c.address!);
                    setMessage("ສຳເນົາທີ່ຢູ່ແລ້ວ.");
                  } catch (e) {
                    setError(e);
                  }
                }}
              >
                ສຳເນົາທີ່ຢູ່ຮັບເງິນ
              </Button>
            </div>
            {message ? (
              <p role="status" className="text-sm text-muted-foreground">
                {message}
              </p>
            ) : null}
            <ErrorNotice error={balances.error || error} />
          </section>
          <Panel title="ໂອນ OFL">
            <FieldGroup>
              <TextField
                label={t("recipient")}
                value={target}
                onChange={setTarget}
              />
              <TextField
                label={t("amount")}
                value={value}
                inputMode="decimal"
                onChange={setValue}
              />
              <p className="text-sm text-muted-foreground">
                ສຳລັບກະເປົາອື່ນ. ຖ້າຕ້ອງການຊ່ວຍກອງທຶນ
                ໃຫ້ໃຊ້ປຸ່ມສະໜັບສະໜູນໃນໜ້າກອງທຶນ.
              </p>
              <Button
                disabled={
                  tx.busy || c.chainId !== d.chainId || !target || !value
                }
                onClick={send}
              >
                {tx.busy ? "ກຳລັງໂອນ…" : "ໂອນ OFL ຜ່ານ MetaMask"}
              </Button>
              <TxFeedback state={tx.state} d={d} />
            </FieldGroup>
          </Panel>
          <Disclosure title="ຕົວເລືອກກະເປົາ">
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
              ເພີ່ມ OFL ໃນ MetaMask
            </Button>
            {d.explorerUrl ? (
              <a
                className="inline-flex min-h-11 items-center text-sm text-primary hover:underline"
                href={`${d.explorerUrl}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
              >
                ເບິ່ງກະເປົາໃນເວັບກວດສອບ ↗
              </a>
            ) : null}
          </Disclosure>
        </>
      )}
    </div>
  );
}
