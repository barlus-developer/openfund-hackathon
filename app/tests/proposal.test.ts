import { describe, it, expect } from "vitest";
import {
  decodeFunctionData,
  encodeFunctionData,
  parseEther,
  zeroHash,
} from "viem";
import {
  availableActions,
  emptyProposal,
  proposalAction,
  proposalErrors,
} from "../src/features/governance/proposal";
import { openFundAbi } from "../src/web3/generated/OpenFund";
import type { FundRow } from "../src/web3/reads";
const manager = "0x1111111111111111111111111111111111111111";
const approver = "0x2222222222222222222222222222222222222222";
const other = "0x3333333333333333333333333333333333333333";
const row = {
  id: 1n,
  status: 1,
  approvers: [manager, approver],
  fund: {
    manager,
    balance: parseEther("100"),
    threshold: 1,
    config: { recipientPolicy: 1, minimumApprovalThreshold: 1 },
  },
} as unknown as FundRow;
const draft = {
  ...emptyProposal,
  target: other,
  sum: "12.000000000000000001",
  purpose: "Books",
};
describe("proposal permissions and contract input", () => {
  it("keeps approver recovery separate from manager spending and closure", () => {
    expect(availableActions(row, approver)).toEqual([1, 2, 3, 4]);
    expect(availableActions(row, manager)).toContain(7);
    expect(availableActions(row, other)).toEqual([]);
  });
  it.each([2, 4])("blocks every proposal for fund status %i", (status) => {
    expect(availableActions({ ...row, status }, manager)).toEqual([]);
  });
  it("allows team recovery while fundraising, and settlement while closing", () => {
    expect(availableActions({ ...row, status: 0 }, manager)).not.toContain(0);
    expect(availableActions({ ...row, status: 0 }, approver)).toContain(1);
    expect(availableActions({ ...row, status: 3 }, manager)).toContain(0);
    expect(availableActions({ ...row, status: 3 }, manager)).not.toContain(7);
  });
  it("respects the ten approver limit and minimum quorum", () => {
    const full = {
      ...row,
      approvers: Array(10).fill(approver),
      fund: { ...row.fund, threshold: 10 },
    };
    expect(availableActions(full, manager)).not.toContain(2);
    expect(availableActions(full, manager)).not.toContain(3);
  });
  it("does not expose allowlist mutations for an open fund", () => {
    const open = {
      ...row,
      fund: { ...row.fund, config: { ...row.fund.config, recipientPolicy: 0 } },
    };
    expect(availableActions(open, manager)).not.toContain(5);
    expect(availableActions(open, manager)).not.toContain(6);
  });
  it("encodes the exact payout amount without rounding", () => {
    expect(proposalErrors(row, 0, draft)).toEqual({});
    const data = encodeFunctionData({
      abi: openFundAbi,
      functionName: "createProposal",
      args: [row.id, proposalAction(0, draft)],
    });
    const decoded = decodeFunctionData({ abi: openFundAbi, data });
    expect(decoded.functionName).toBe("createProposal");
    if (decoded.functionName !== "createProposal") throw Error("Wrong ABI");
    expect(decoded.args[1].amount).toBe(12000000000000000001n);
    expect(decoded.args[1].evidenceHash).toBe(zeroHash);
  });
  it.each([
    "0",
    "-1",
    "1e3",
    "100.000000000000000001",
    "1.0000000000000000001",
  ])("rejects invalid or over-balance payout %s", (sum) => {
    expect(proposalErrors(row, 0, { ...draft, sum }).sum).toBeTruthy();
  });
  it("validates Lao UTF-8 limits and whitespace-only purpose", () => {
    expect(
      proposalErrors(row, 0, { ...draft, purpose: " " }).purpose,
    ).toBeTruthy();
    expect(
      proposalErrors(row, 0, { ...draft, purpose: "ກ".repeat(81) }).purpose,
    ).toBeTruthy();
    expect(
      proposalErrors(row, 0, { ...draft, uri: "ກ".repeat(101) }).uri,
    ).toBeTruthy();
  });
  it("rejects unchanged or impossible governance changes", () => {
    expect(
      proposalErrors(row, 1, { ...draft, target: manager }).target,
    ).toBeTruthy();
    expect(
      proposalErrors(row, 2, { ...draft, target: approver }).target,
    ).toBeTruthy();
    expect(proposalErrors(row, 3, draft).target).toBeTruthy();
    for (const value of ["1", "0", "3", "1.5", ""])
      expect(proposalErrors(row, 4, { ...draft, value }).value).toBeTruthy();
    expect(
      proposalErrors(row, 4, { ...draft, value: "2" }).value,
    ).toBeUndefined();
  });
});
