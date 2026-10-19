import { describe, it, expect } from "vitest";
import type { TransactionReceipt } from "viem";
import {
  confirmReceipt,
  sameOperation,
  type TxStage,
} from "../src/web3/transaction";
import { friendlyError } from "../src/lib/errors";
describe("transaction lifecycle", () => {
  it("accepts repricing but rejects a different replacement action", () => {
    const to = "0x1111111111111111111111111111111111111111";
    expect(sameOperation({ to, input: "0x1234" }, to, "0x1234")).toBe(true);
    expect(sameOperation({ to, input: "0x" }, to, "0x1234")).toBe(false);
    expect(sameOperation({ to: null, input: "0x1234" }, to, "0x1234")).toBe(
      false,
    );
  });
  it("waits for receipt instead of confirming on hash", async () => {
    const stages: TxStage[] = [];
    let release!: (r: TransactionReceipt) => void;
    const promise = confirmReceipt(
      () =>
        new Promise((r) => {
          release = r;
        }),
      (s) => stages.push(s),
    );
    expect(stages).toEqual(["Pending"]);
    release({ status: "success" } as TransactionReceipt);
    await promise;
    expect(stages).toEqual(["Pending", "Confirmed"]);
  });
  it("never confirms reverted receipts", async () => {
    const stages: TxStage[] = [];
    await expect(
      confirmReceipt(
        async () => ({ status: "reverted" }) as TransactionReceipt,
        (s) => stages.push(s),
      ),
    ).rejects.toThrow();
    expect(stages).not.toContain("Confirmed");
  });
  it("explains rejected requests and goal races", () => {
    expect(friendlyError(Error("4001 denied"))).toMatch(/ຍົກເລີກຄຳຂໍ/);
    expect(friendlyError(Error("InvalidDonation"))).toMatch(/ວັນສິ້ນສຸດ/);
  });
});
