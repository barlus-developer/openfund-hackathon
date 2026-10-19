import { encodeAbiParameters, formatUnits, parseUnits } from "viem";
export function amount(value: string): bigint {
  if (!/^\d+(\.\d{1,18})?$/.test(value))
    throw new Error("Enter a positive OFL amount with at most 18 decimals.");
  const n = parseUnits(value, 18);
  if (n <= 0n || n >= 2n ** 256n)
    throw new Error("OFL amount is outside the allowed range.");
  return n;
}
export const ofl = (value: bigint | undefined) =>
  value === undefined ? "—" : formatUnits(value, 18);
export const donationData = (id: bigint) =>
  encodeAbiParameters([{ type: "uint256" }], [id]);
export const shorten = (a?: string) =>
  a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "—";
export function date(value: bigint) {
  return value === 0n
    ? "—"
    : new Date(Number(value) * 1000).toLocaleString("lo-LA", {
        timeZoneName: "short",
      });
}
export function positiveId(value?: string): bigint {
  if (!value || !/^[1-9]\d*$/.test(value) || BigInt(value) >= 2n ** 256n)
    throw new Error("Invalid on-chain ID.");
  return BigInt(value);
}
