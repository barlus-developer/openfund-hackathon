import { BaseError } from "viem";
export function friendlyError(error: unknown): string {
  const message =
    error instanceof BaseError
      ? error.shortMessage
      : error instanceof Error
        ? error.message
        : String(error);
  if (/rejected|denied|4001/i.test(message))
    return "Wallet request rejected. You can retry.";
  if (/InsufficientFundBalance/i.test(message))
    return "The latest fund balance is insufficient. Other payouts may have executed.";
  if (/InvalidDonation/i.test(message))
    return "Donation rejected: check deadline, goal remaining, amount, and current fund status.";
  if (/ProposalUnavailable/i.test(message))
    return "Proposal is not executable: check quorum, versions, timelock, and expiry.";
  if (/ProtectedIngress/i.test(message))
    return "Use Donate and choose a fund ID to send OFL to OpenFund.";
  return message;
}
