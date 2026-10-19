import { z } from "zod";
import {
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  zeroAddress,
} from "viem";
import { amount } from "@/lib/amount";
const bytes = (v: string) => new TextEncoder().encode(v).length;
export const walletAddress = z
  .string()
  .refine(
    (v) => isAddress(v) && v !== zeroAddress,
    "Enter a valid nonzero EVM address.",
  );
export function addressList(v: string) {
  return v
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((s) => getAddress(walletAddress.parse(s)));
}
export const draftSchema = z
  .object({
    title: z
      .string()
      .min(1)
      .refine((v) => bytes(v) <= 120, "Title must fit 120 UTF-8 bytes."),
    summary: z
      .string()
      .refine((v) => bytes(v) <= 600, "Summary must fit 600 UTF-8 bytes."),
    category: z
      .string()
      .min(1)
      .refine((v) => bytes(v) <= 64),
    manager: walletAddress,
    metadataURI: z.string().refine((v) => bytes(v) <= 300),
    termsURI: z.string().refine((v) => bytes(v) <= 300),
    terms: z.string().min(10, "Write the immutable public purpose and terms."),
    location: z.string().max(120),
    mode: z.enum(["0", "1"]),
    policy: z.enum(["", "0", "1"]),
    goal: z.string(),
    days: z.string(),
    approvers: z.string(),
    threshold: z.string(),
    minimum: z.string(),
    recipientPolicy: z.enum(["0", "1"]),
    recipients: z.string(),
  })
  .superRefine((d, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    try {
      const a = addressList(d.approvers);
      if (a.length < 1 || a.length > 10 || new Set(a).size !== a.length)
        issue("Use 1–10 unique approver wallets.");
      if (
        !/^\d+$/.test(d.threshold) ||
        !/^\d+$/.test(d.minimum) ||
        +d.minimum < 1 ||
        +d.threshold < +d.minimum ||
        +d.threshold > a.length
      )
        issue(
          "Threshold must be between the immutable minimum and approver count.",
        );
    } catch {
      issue("Invalid approver wallet.");
    }
    if (d.mode === "0") {
      try {
        amount(d.goal);
      } catch {
        issue("Enter a positive OFL goal.");
      }
      if (!/^\d+$/.test(d.days) || +d.days < 1 || +d.days > 365)
        issue("Duration must be 1–365 whole days.");
      if (d.policy === "") issue("Choose the failure policy explicitly.");
    }
    if (d.recipientPolicy === "1")
      try {
        const r = addressList(d.recipients);
        if (r.length > 100 || new Set(r).size !== r.length)
          issue("Use at most 100 unique recipients.");
      } catch {
        issue("Invalid allowlist wallet.");
      }
  });
export type Draft = z.infer<typeof draftSchema>;
export function validateStep(d: Draft, step: number) {
  if (step === 0)
    for (const key of [
      "title",
      "summary",
      "category",
      "manager",
      "metadataURI",
      "termsURI",
      "terms",
      "location",
    ] as const)
      draftSchema.shape[key].parse(d[key]);
  if (step === 1 && d.mode === "0") {
    amount(d.goal);
    if (!/^\d+$/.test(d.days) || +d.days < 1 || +d.days > 365)
      throw Error("Duration must be 1–365 days.");
    if (d.policy === "") throw Error("Choose REFUND or KEEP_FUNDS explicitly.");
  }
  if (step === 2) {
    const a = addressList(d.approvers);
    if (a.length < 1 || a.length > 10 || new Set(a).size !== a.length)
      throw Error("Use 1–10 unique approvers.");
    if (
      !/^\d+$/.test(d.threshold) ||
      !/^\d+$/.test(d.minimum) ||
      +d.minimum < 1 ||
      +d.threshold < +d.minimum ||
      +d.threshold > a.length
    )
      throw Error(
        "Threshold must be between the immutable minimum and approver count.",
      );
  }
  if (step === 3 && d.recipientPolicy === "1") {
    const r = addressList(d.recipients);
    if (r.length > 100 || new Set(r).size !== r.length)
      throw Error("Use at most 100 unique recipients.");
  }
}
export const emptyDraft: Draft = {
  title: "",
  summary: "",
  category: "Education",
  manager: "",
  metadataURI: "",
  termsURI: "",
  terms: "",
  location: "",
  mode: "0",
  policy: "",
  goal: "",
  days: "30",
  approvers: "",
  threshold: "2",
  minimum: "2",
  recipientPolicy: "0",
  recipients: "",
};
export function creationArgs(draft: Draft) {
  const d = draftSchema.parse(draft);
  return [
    {
      fundingMode: Number(d.mode),
      underfundingPolicy: d.mode === "1" ? 0 : Number(d.policy),
      recipientPolicy: Number(d.recipientPolicy),
      fundingGoal: d.mode === "0" ? amount(d.goal) : 0n,
      duration: d.mode === "0" ? BigInt(+d.days * 86400) : 0n,
      threshold: +d.threshold,
      minimumApprovalThreshold: +d.minimum,
      termsHash: keccak256(stringToHex(`${d.terms}\nLocation: ${d.location}`)),
      manager: getAddress(d.manager),
      title: d.title,
      summary: d.summary,
      category: d.category,
      metadataURI: d.metadataURI,
      termsURI: d.termsURI,
    },
    addressList(d.approvers),
    d.recipientPolicy === "1" ? addressList(d.recipients) : [],
  ] as const;
}
