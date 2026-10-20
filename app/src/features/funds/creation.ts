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
const detailsSchema = z.object({
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
});
const fundingSchema = z
  .object({
    mode: z.enum(["0", "1"]),
    policy: z.enum(["", "0", "1"]),
    goal: z.string(),
    days: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.mode !== "0") return;
    try {
      amount(d.goal);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a positive OFL goal.",
        path: ["goal"],
      });
    }
    if (!/^\d+$/.test(d.days) || +d.days < 1 || +d.days > 365)
      ctx.addIssue({
        code: "custom",
        message: "Duration must be 1–365 whole days.",
        path: ["days"],
      });
    if (d.policy === "")
      ctx.addIssue({
        code: "custom",
        message: "Choose the failure policy explicitly.",
        path: ["policy"],
      });
  });
const governanceSchema = z
  .object({
    approvers: z.string(),
    threshold: z.string(),
    minimum: z.string(),
  })
  .superRefine((d, ctx) => {
    const issue = (message: string, field = "approvers") =>
      ctx.addIssue({ code: "custom", message, path: [field] });
    try {
      const approvers = addressList(d.approvers);
      if (
        approvers.length < 1 ||
        approvers.length > 10 ||
        new Set(approvers).size !== approvers.length
      )
        issue("Use 1–10 unique approver wallets.");
      if (
        !/^\d+$/.test(d.threshold) ||
        !/^\d+$/.test(d.minimum) ||
        +d.minimum < 1 ||
        +d.threshold < +d.minimum ||
        +d.threshold > approvers.length
      )
        issue(
          "Threshold must be between the immutable minimum and approver count.",
          "threshold",
        );
    } catch {
      issue("Invalid approver wallet.");
    }
  });
const recipientSchema = z
  .object({
    recipientPolicy: z.enum(["0", "1"]),
    recipients: z.string(),
  })
  .superRefine((d, ctx) => {
    if (d.recipientPolicy !== "1") return;
    try {
      const recipients = addressList(d.recipients);
      if (
        recipients.length > 100 ||
        new Set(recipients).size !== recipients.length
      )
        ctx.addIssue({
          code: "custom",
          message: "Use at most 100 unique recipients.",
          path: ["recipients"],
        });
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Invalid allowlist wallet.",
        path: ["recipients"],
      });
    }
  });

// The wizard and final submission enforce the same rules.
const stepSchemas = [
  detailsSchema,
  fundingSchema,
  governanceSchema,
  recipientSchema,
];
export const draftSchema = detailsSchema
  .and(fundingSchema)
  .and(governanceSchema)
  .and(recipientSchema);
export type Draft = z.infer<typeof draftSchema>;
export function validateStep(d: Draft, step: number) {
  stepSchemas[step]?.parse(d);
}
export const emptyDraft: Draft = {
  title: "",
  summary: "",
  category: "ໂຄງການ",
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
