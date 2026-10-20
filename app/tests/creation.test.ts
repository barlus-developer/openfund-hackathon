import { describe, it, expect } from "vitest";
import {
  emptyDraft,
  creationArgs,
  validateStep,
} from "../src/features/funds/creation";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  keccak256,
  stringToHex,
} from "viem";
import { openFundAbi } from "../src/web3/generated/OpenFund";
const addresses = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];
export const validDraft = {
  ...emptyDraft,
  title: "Community books",
  summary: "Public terms",
  terms: "Books for the learning center.",
  manager: addresses[0],
  approvers: addresses.join("\n"),
  goal: "1000",
  policy: "0" as const,
};
describe("creation schema", () => {
  it("builds canonical targeted configuration", () => {
    const [p, a] = creationArgs(validDraft);
    expect(p.fundingGoal).toBe(1000n * 10n ** 18n);
    expect(p.duration).toBe(30n * 86400n);
    expect(p.minimumApprovalThreshold).toBe(2);
    expect(a).toHaveLength(3);
    expect(p.termsHash).toBe(
      keccak256(stringToHex(validDraft.terms + "\nLocation: ")),
    );
  });
  it("canonicalizes continuous fields", () => {
    const [p] = creationArgs({ ...validDraft, mode: "1" });
    expect(p.fundingGoal).toBe(0n);
    expect(p.duration).toBe(0n);
    expect(p.underfundingPolicy).toBe(0);
  });
  it("validates wizard steps independently with the final submission rules", () => {
    expect(() => validateStep({ ...validDraft, goal: "" }, 0)).not.toThrow();
    expect(() => validateStep({ ...validDraft, title: "" }, 1)).not.toThrow();
    for (const [step, change] of [
      [0, { title: "ລ".repeat(41) }],
      [1, { days: "366" }],
      [2, { approvers: addresses[0] + "\n" + addresses[0] }],
      [3, { recipientPolicy: "1" as const, recipients: "invalid" }],
    ] as const) {
      const draft = { ...validDraft, ...change };
      expect(() => validateStep(draft, step)).toThrow();
      expect(() => creationArgs(draft)).toThrow();
    }
  });
  it.each([
    { policy: "" as const },
    { days: "366" },
    { days: "0" },
    { approvers: addresses[0] + "\n" + addresses[0] },
    { minimum: "3", threshold: "2" },
    { manager: "0x0" },
    { goal: "0" },
  ])("rejects invalid configuration %o", (change) =>
    expect(() => creationArgs({ ...validDraft, ...change })).toThrow(),
  );
  it("extracts the actual fund ID from a mined event, not the pre-read counter", () => {
    const topics = encodeEventTopics({
      abi: openFundAbi,
      eventName: "FundCreated",
      args: {
        fundId: 42n,
        creator: addresses[0] as `0x${string}`,
        manager: addresses[1] as `0x${string}`,
      },
    });
    const data = encodeAbiParameters([{ type: "string" }], ["Community books"]);
    const event = decodeEventLog({
      abi: openFundAbi,
      topics: topics as [`0x${string}`, ...`0x${string}`[]],
      data,
    });
    expect(event.eventName).toBe("FundCreated");
    if (event.eventName === "FundCreated") expect(event.args.fundId).toBe(42n);
  });
});
