import { toast } from "sonner";
import { useRef, useState } from "react";
import { useConnection, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { type Address, type Hex } from "viem";
import {
  clientFor,
  chainFor,
  verifyDeployment,
  type Deployment,
} from "@/web3/deployments";
import {
  confirmReceipt,
  sameOperation,
  type TxState,
} from "@/web3/transaction";
import { friendlyError } from "@/lib/errors";

export function useTransaction(d: Deployment) {
  const connection = useConnection();
  const { data: wallet } = useWalletClient();
  const queryClient = useQueryClient();
  const [state, setState] = useState<TxState>({});
  const locked = useRef(false);
  const update = (next: Partial<TxState>) =>
    setState((s) => ({ ...s, ...next }));
  async function send(to: Address, data: Hex) {
    if (locked.current) return;
    locked.current = true;
    setState({ stage: "Preparing" });
    try {
      if (!connection.address || !wallet)
        throw new Error("Connect MetaMask before signing.");
      if ((await wallet.getChainId()) !== d.chainId)
        throw new Error(
          "Wrong chain. Switch to the configured official network.",
        );
      if (
        ![
          d.openFundAddress.toLowerCase(),
          d.oflTokenAddress.toLowerCase(),
        ].includes(to.toLowerCase())
      )
        throw new Error("Unconfigured transaction target.");
      await verifyDeployment(d);
      const c = clientFor(d);
      const account = connection.address;
      await c.call({ account, to, data });
      const [gas, balance, gasPrice] = await Promise.all([
        c.estimateGas({ account, to, data }),
        c.getBalance({ address: account }),
        c.getGasPrice(),
      ]);
      if (balance < gas * gasPrice)
        throw new Error(
          `Insufficient native ${chainFor(d).nativeCurrency.symbol} for gas.`,
        );
      update({ stage: "Awaiting Wallet", gas });
      // Re-check account and chain after asynchronous preparation.
      const addresses = await wallet.getAddresses();
      if (
        (await wallet.getChainId()) !== d.chainId ||
        addresses[0]?.toLowerCase() !== account.toLowerCase()
      )
        throw new Error("Wallet account/network changed. Review and retry.");
      const hash = await wallet.sendTransaction({
        account,
        chain: chainFor(d),
        to,
        data,
      });
      update({ stage: "Submitted", hash });
      let replacedWithDifferentAction = false;
      const receipt = await confirmReceipt(
        async () => {
          const mined = await c.waitForTransactionReceipt({
            hash,
            confirmations: d.confirmations ?? (d.chainId === 31337 ? 1 : 2),
            onReplaced: (replacement) => {
              update({ stage: "Replaced", hash: replacement.transaction.hash });
              replacedWithDifferentAction =
                replacement.reason === "cancelled" ||
                !sameOperation(replacement.transaction, to, data);
            },
          });
          if (replacedWithDifferentAction)
            throw new Error(
              "Transaction was cancelled or replaced with a different action. No protocol success is claimed.",
            );
          return mined;
        },
        (stage) => update({ stage }),
      );
      update({ receipt, hash: receipt.transactionHash });
      toast.success("ຢືນຢັນລາຍການສຳເລັດ", {
        description: receipt.transactionHash,
      });
      await queryClient.invalidateQueries();
      return receipt;
    } catch (error) {
      const message = friendlyError(error);
      const rawMessage = error instanceof Error ? error.message : String(error);
      toast.error(message);
      update({
        stage: /rejected|denied|4001/i.test(rawMessage)
          ? "Rejected"
          : /revert/i.test(rawMessage)
            ? "Reverted"
            : "Failed",
        error: message,
      });
    } finally {
      locked.current = false;
    }
  }
  return {
    send,
    state,
    busy: [
      "Preparing",
      "Awaiting Wallet",
      "Submitted",
      "Pending",
      "Replaced",
    ].includes(state.stage || ""),
  };
}
