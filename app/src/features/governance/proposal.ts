import {
  getAddress,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem";
import { amount } from "@/lib/amount";
import { walletAddress } from "@/features/funds/creation";
import type { FundRow } from "@/web3/reads";

export type ProposalKind = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ProposalSection = "payout" | "team" | "recipients" | "closure";
export const proposalSections = [
  { id: "payout", label: "ສະເໜີຈ່າຍເງິນ", kinds: [0] },
  { id: "team", label: "ຜູ້ຈັດການ ແລະຜູ້ອະນຸມັດ", kinds: [1, 2, 3, 4] },
  { id: "recipients", label: "ລາຍຊື່ຜູ້ຮັບ", kinds: [5, 6] },
  { id: "closure", label: "ປິດກອງທຶນ", kinds: [7] },
] as const;
export const utf8Bytes = (value: string) =>
  new TextEncoder().encode(value).length;
export function fundRoles(row: FundRow, address?: string) {
  const same = (a: string) => a.toLowerCase() === address?.toLowerCase();
  return {
    manager: same(row.fund.manager),
    approver: row.approvers.some(same),
  };
}

// These affordances mirror OpenFund._validateAction; simulation remains authoritative.
export function availableActions(
  row: FundRow,
  address?: string,
): ProposalKind[] {
  const { manager, approver } = fundRoles(row, address);
  if ((!manager && !approver) || [2, 4].includes(row.status)) return [];
  const kinds: ProposalKind[] = [];
  if (manager && [1, 3].includes(row.status)) kinds.push(0);
  kinds.push(1);
  if (row.approvers.length < 10) kinds.push(2);
  if (row.approvers.length > row.fund.threshold) kinds.push(3);
  if (row.fund.config.minimumApprovalThreshold < row.approvers.length)
    kinds.push(4);
  if (manager && row.fund.config.recipientPolicy === 1) kinds.push(5, 6);
  if (manager && row.status === 1) kinds.push(7);
  return kinds;
}

export type ProposalDraft = {
  target: string;
  sum: string;
  value: string;
  purpose: string;
  uri: string;
  hash: string;
};
export type ProposalErrors = Partial<Record<keyof ProposalDraft, string>>;
export const emptyProposal: ProposalDraft = {
  target: "",
  sum: "",
  value: "",
  purpose: "",
  uri: "",
  hash: "",
};
export function proposalErrors(
  row: FundRow,
  kind: ProposalKind,
  draft: ProposalDraft,
): ProposalErrors {
  const errors: ProposalErrors = {};
  if (![4, 7].includes(kind)) {
    const parsed = walletAddress.safeParse(draft.target.trim());
    if (!parsed.success)
      errors.target = "ປ້ອນທີ່ຢູ່ກະເປົາ EVM ທີ່ຖືກຕ້ອງ ແລະບໍ່ແມ່ນສູນ.";
    else {
      const same = (a: string) => a.toLowerCase() === parsed.data.toLowerCase();
      if (kind === 1 && same(row.fund.manager))
        errors.target = "ກະເປົານີ້ເປັນຜູ້ຈັດການປັດຈຸບັນແລ້ວ.";
      if (kind === 2 && row.approvers.some(same))
        errors.target = "ກະເປົານີ້ຢູ່ໃນລາຍຊື່ຜູ້ອະນຸມັດແລ້ວ.";
      if (kind === 3 && !row.approvers.some(same))
        errors.target = "ເລືອກກະເປົາຜູ້ອະນຸມັດປັດຈຸບັນ.";
    }
  }
  if (kind === 0) {
    try {
      if (amount(draft.sum) > row.fund.balance)
        errors.sum = "ຈຳນວນນີ້ເກີນຍອດຄົງເຫຼືອກອງທຶນ.";
    } catch {
      errors.sum = "ປ້ອນຈຳນວນ OFL ຫຼາຍກວ່າ 0 (ສູງສຸດ 18 ທົດສະນິຍົມ).";
    }
    if (!draft.purpose.trim()) errors.purpose = "ກະລຸນາລະບຸຈຸດປະສົງການໃຊ້ເງິນ.";
  }
  if (
    kind === 4 &&
    (!/^\d+$/.test(draft.value) ||
      +draft.value < row.fund.config.minimumApprovalThreshold ||
      +draft.value > row.approvers.length ||
      +draft.value === row.fund.threshold)
  ) {
    errors.value = `ເລືອກຈຳນວນ ${row.fund.config.minimumApprovalThreshold}–${row.approvers.length} ທີ່ຕ່າງຈາກປັດຈຸບັນ (${row.fund.threshold}).`;
  }
  if (utf8Bytes(draft.purpose) > 240)
    errors.purpose = "ຈຸດປະສົງຕ້ອງບໍ່ເກີນ 240 ໄບຕ໌ UTF-8.";
  if (utf8Bytes(draft.uri) > 300)
    errors.uri = "ລິ້ງຫຼັກຖານຕ້ອງບໍ່ເກີນ 300 ໄບຕ໌ UTF-8.";
  if (draft.hash && !/^0x[\da-fA-F]{64}$/.test(draft.hash))
    errors.hash = "ໃຊ້ລະຫັດ keccak256 32 ໄບຕ໌ (0x ແລະ 64 ຕົວເລກຖານສິບຫົກ).";
  return errors;
}
export function proposalAction(kind: ProposalKind, draft: ProposalDraft) {
  return {
    kind,
    target: ([4, 7].includes(kind)
      ? zeroAddress
      : getAddress(draft.target.trim())) as Address,
    amount: kind === 0 ? amount(draft.sum) : 0n,
    value: kind === 4 ? Number(draft.value) : 0,
    purpose: draft.purpose,
    evidenceURI: draft.uri,
    evidenceHash: (draft.hash || zeroHash) as Hex,
  };
}
