import type { Address, Hash, Hex, TransactionReceipt } from "viem";
export function sameOperation(
  tx: { to: Address | null; input: Hex },
  to: Address,
  data: Hex,
) {
  return (
    tx.to?.toLowerCase() === to.toLowerCase() &&
    tx.input.toLowerCase() === data.toLowerCase()
  );
}
export type TxStage =
  | "Preparing"
  | "Awaiting Wallet"
  | "Submitted"
  | "Pending"
  | "Confirmed"
  | "Replaced"
  | "Rejected"
  | "Reverted"
  | "Failed";
export async function confirmReceipt(
  wait: () => Promise<TransactionReceipt>,
  set: (s: TxStage) => void,
) {
  set("Pending");
  const receipt = await wait();
  if (receipt.status !== "success") {
    set("Reverted");
    throw new Error("Transaction reverted on chain.");
  }
  set("Confirmed");
  return receipt;
}
export type TxState = {
  stage?: TxStage;
  hash?: Hash;
  error?: string;
  gas?: bigint;
  receipt?: TransactionReceipt;
};
