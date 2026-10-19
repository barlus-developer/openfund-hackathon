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
    <EmptyState description="Deploy the official contracts first." />
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
        throw Error(
          "Protected OpenFund address: choose a fund and use Donate.",
        );
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
      <Notice title="DEMO OFL · NOT FIAT-BACKED">
        1 OFL ≈ 1 LAK is a target reference. No fiat mint or redemption is
        available. Local seed tools are CLI-only and require Anvil.
      </Notice>
      <div className="detail-grid">
        <Panel title="Balances & receive">
          <div className="stack">
            <code className="hash">
              {c.address || "Connect MetaMask to receive OFL."}
            </code>
            <div className="metrics">
              <div className="metric">
                <span>OFL balance</span>
                <strong>{ofl(balances.data?.ofl)}</strong>
              </div>
              <div className="metric">
                <span>Native gas ({chainFor(d).nativeCurrency.symbol})</span>
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
                  setMessage("Address copied.");
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Copy receive address
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
                    ok
                      ? "OFL token added to MetaMask."
                      : "Token was not added.",
                  );
                } catch (e) {
                  setError(e);
                }
              }}
            >
              Add OFL to MetaMask
            </Button>
            {d.explorerUrl && c.address ? (
              <a
                href={`${d.explorerUrl}/address/${c.address}`}
                target="_blank"
                rel="noreferrer"
              >
                View wallet on explorer ↗
              </a>
            ) : (
              <small>
                This network has no configured block explorer. Public receipts
                and hashes are available through RPC.
              </small>
            )}
            <small>{message}</small>
            <ErrorNotice error={balances.error || error} />
          </div>
        </Panel>
        <Panel title="Send OFL to a wallet">
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
              Send OFL · MetaMask
            </Button>
            <small>
              Ordinary ERC-20 send. Protected OpenFund recipients must use the
              Donate flow with a fund ID.
            </small>
            <TxFeedback state={tx.state} d={d} />
          </FieldGroup>
        </Panel>
      </div>
    </div>
  );
}
