import { describe, it, expect } from "vitest";
import { amount, donationData, positiveId } from "../src/lib/amount";
import { encodeFunctionData, decodeFunctionData } from "viem";
import { tokenAbi } from "../src/web3/generated/OFLToken";
describe("exact token accounting", () => {
  it("preserves one wei and large balances without floating point", () => {
    expect(amount("0.000000000000000001")).toBe(1n);
    expect(amount("9007199254740993.123456789012345678")).toBe(
      9007199254740993123456789012345678n,
    );
  });
  it.each(["0", "-1", "1e18", "1.0000000000000000001", "NaN", ""])(
    "rejects invalid amount %s",
    (v) => expect(() => amount(v)).toThrow(),
  );
  it("encodes the three-argument one-step donation overload", () => {
    const data = encodeFunctionData({
      abi: tokenAbi,
      functionName: "transferAndCall",
      args: [
        "0x1111111111111111111111111111111111111111",
        amount("2"),
        donationData(7n),
      ],
    });
    const decoded = decodeFunctionData({ abi: tokenAbi, data });
    expect(decoded.functionName).toBe("transferAndCall");
    expect(decoded.args).toEqual([
      "0x1111111111111111111111111111111111111111",
      2n * 10n ** 18n,
      donationData(7n),
    ]);
    expect(donationData(7n)).toHaveLength(66);
  });
  it("rejects malformed and uint256-overflow IDs", () => {
    for (const v of ["0", "-1", "3.5", "hello", (2n ** 256n).toString()])
      expect(() => positiveId(v)).toThrow();
  });
});
