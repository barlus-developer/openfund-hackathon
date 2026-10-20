import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
} from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Disclosure } from "@/components/patterns";
import { useState, useRef, useEffect } from "react";
import { useConnection } from "wagmi";
import { parseEventLogs, encodeFunctionData, formatUnits } from "viem";
import { chainFor, fundPath } from "@/web3/deployments";
import { useFundContext } from "@/features/funds/FundLayout";
import { useBalances } from "@/web3/reads";
import { tokenAbi } from "@/web3/generated/OFLToken";
import { openFundAbi } from "@/web3/generated/OpenFund";
import { useTransaction } from "@/hooks/useTransaction";
import { amount, ofl, formatOfl, donationData, shorten } from "@/lib/amount";
import { Spinner } from "@/components/ui/spinner";
import { ActionLink } from "@/components/common";
import { FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Panel, Notice, ErrorNotice, TxFeedback } from "@/components/common";
import { Policy } from "@/features/funds/FundCard";
import { Connect } from "@/features/wallet/Connect";
import { useLanguage } from "@/app/i18n";
export function Donate() {
  const { d, row } = useFundContext(),
    c = useConnection(),
    balances = useBalances(d, c.address),
    tx = useTransaction(d),
    { t } = useLanguage();
  const receiptTitle = useRef<HTMLHeadingElement>(null);
  const [input, setInput] = useState(""),
    [error, setError] = useState<unknown>(),
    [receipt, setReceipt] = useState("");
  useEffect(() => {
    if (receipt) receiptTitle.current?.focus();
  }, [receipt]);
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
    try {
      const n = amount(input);
      if (receipt || tx.busy) return;
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
      const [event] = parseEventLogs({
        abi: openFundAbi,
        eventName: "DonationReceived",
        logs: r.logs.filter(
          (log) =>
            log.address.toLowerCase() === d.openFundAddress.toLowerCase(),
        ),
      });
      if (
        event?.eventName !== "DonationReceived" ||
        event.args.fundId !== row.id
      )
        throw Error(
          "ຍັງບໍ່ພົບຫຼັກຖານການສະໜັບສະໜູນ. ກະລຸນາກວດໃບຢືນຢັນກ່ອນລອງໃໝ່.",
        );
      setReceipt(
        `${formatOfl(event.args.amount)} OFL · ${row.fund.title} · ${shorten(event.args.donor)}`,
      );
    } catch (e) {
      setError(e);
    }
  }
  const amountError =
    input && parsed === 0n
      ? "ປ້ອນຈຳນວນ OFL ທີ່ຫຼາຍກວ່າ 0 (ສູງສຸດ 18 ທົດສະນິຍົມ)."
      : parsed > 0n && row.fund.config.fundingMode === 0 && parsed > remaining
        ? "ຈຳນວນນີ້ເກີນຍອດທີ່ກອງທຶນຍັງຕ້ອງການ."
        : balances.data && parsed > balances.data.ofl
          ? "ຍອດ OFL ໃນກະເປົາບໍ່ພຽງພໍ."
          : "";
  if (receipt)
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <h2
          ref={receiptTitle}
          tabIndex={-1}
          className="text-2xl font-semibold outline-none"
        >
          ຂອບໃຈທີ່ຮ່ວມສະໜັບສະໜູນ
        </h2>
        <Notice title="ໃບຢືນຢັນການສະໜັບສະໜູນ">{receipt}</Notice>
        <TxFeedback state={tx.state} d={d} />
        <ActionLink
          to={`/donations?deployment=${encodeURIComponent(d.version)}`}
        >
          ການສະໜັບສະໜູນຂອງຂ້ອຍ
        </ActionLink>
        <ActionLink to={fundPath(d, row.id) + "/transactions"} outline>
          ຕິດຕາມການໃຊ້ເງິນ
        </ActionLink>
      </div>
    );
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Panel title={t("donate")}>
        <FieldGroup>
          <Field data-invalid={!!amountError}>
            <FieldLabel htmlFor="donation-amount">{t("amount")}</FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="donation-amount"
                inputMode="decimal"
                placeholder="0"
                value={input}
                aria-invalid={!!amountError}
                aria-describedby={amountError ? "amount-error" : undefined}
                disabled={tx.busy}
                onChange={(e) => {
                  setInput(e.target.value);
                  setError(undefined);
                }}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>OFL</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
            {amountError ? (
              <FieldError id="amount-error">{amountError}</FieldError>
            ) : null}
          </Field>
          <ToggleGroup
            aria-label="ເລືອກຈຳນວນສະໜັບສະໜູນ"
            variant="outline"
            disabled={tx.busy}
            value={[input]}
            onValueChange={(values) => {
              if (values[0]) setInput(values[0]);
            }}
            className="flex-wrap"
          >
            {["100", "500", "1000"].map((value) => (
              <ToggleGroupItem
                key={value}
                value={value}
                disabled={
                  tx.busy ||
                  (row.fund.config.fundingMode === 0 &&
                    amount(value) > remaining)
                }
              >
                {value} OFL
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {row.fund.config.fundingMode === 0 && remaining > 0n ? (
            <Button
              variant="ghost"
              disabled={tx.busy}
              onClick={() => setInput(ofl(remaining))}
            >
              ຍອດທີ່ຍັງຕ້ອງການ: {formatOfl(remaining)} OFL
            </Button>
          ) : null}
          {c.address ? (
            <dl className="data-list text-sm">
              <dt>ຍອດໃນກະເປົາ</dt>
              <dd>{formatOfl(balances.data?.ofl)} OFL</dd>
              <dt>ຍອດສຳລັບຄ່າທຳນຽມ</dt>
              <dd>
                {balances.data
                  ? formatUnits(
                      balances.data.native,
                      chainFor(d).nativeCurrency.decimals,
                    )
                  : "—"}{" "}
                {chainFor(d).nativeCurrency.symbol}
              </dd>
            </dl>
          ) : null}
          <Notice title="ເງື່ອນໄຂການສະໜັບສະໜູນ">
            <Policy row={row} />
          </Notice>
          <p className="text-xs text-muted-foreground">
            OFL ທົດລອງບໍ່ສາມາດແລກເປັນເງິນກີບໄດ້. ມີຄ່າທຳນຽມເຄືອຂ່າຍ; ກວດສອບຍອດ
            ແລະຄ່າທຳນຽມໃນ MetaMask ກ່ອນຢືນຢັນ.
          </p>
          <ErrorNotice error={error || balances.error} />
          {!accepts ? (
            <Notice title="ຢຸດຮັບສະໜັບສະໜູນແລ້ວ">
              ກອງທຶນນີ້ບໍ່ຮັບສະໜັບສະໜູນເພີ່ມ.
            </Notice>
          ) : !c.address || c.chainId !== d.chainId ? (
            <Connect chainId={d.chainId} />
          ) : (
            <Button
              size="lg"
              disabled={tx.busy || parsed === 0n || !!amountError}
              onClick={donate}
            >
              {tx.busy ? <Spinner data-icon="inline-start" /> : null}
              {tx.busy ? (
                "ກຳລັງດຳເນີນການ…"
              ) : (
                <>
                  {t("donate")} {parsed ? `${formatOfl(parsed)} OFL` : ""}
                </>
              )}
            </Button>
          )}
          <TxFeedback state={tx.state} d={d} />
          <Disclosure title="ຂໍ້ມູນອ້າງອີງການໂອນ">
            <dl className="data-list">
              <dt>ກອງທຶນ</dt>
              <dd>
                #{row.id.toString()} · {d.version} · {d.chainId}
                <code className="hash">{d.openFundAddress}</code>
              </dd>
              <dt>OFL</dt>
              <dd>
                <code className="hash">{d.oflTokenAddress}</code>
              </dd>
            </dl>
          </Disclosure>
        </FieldGroup>
      </Panel>
    </div>
  );
}
