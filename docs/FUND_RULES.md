# Fund rules

| Mode / policy         | Accepting period               | Spendable                                   | Failure refund                                          |
| --------------------- | ------------------------------ | ------------------------------------------- | ------------------------------------------------------- |
| TARGETED / REFUND     | Before deadline and below goal | At exact goal, including early completion   | Below goal at deadline: original donors self-claim 100% |
| TARGETED / KEEP_FUNDS | Before deadline and below goal | At goal or after deadline                   | None                                                    |
| CONTINUOUS            | ACTIVE only                    | While active and during governed settlement | None                                                    |

Target goals are positive; duration is 1–365 days inclusive. Deadline is set by the creation block. At `timestamp == deadline`, donations fail. Over-goal donations fail completely. Spending cannot reopen a completed goal. Continuous config uses zero goal/duration and neutral `REFUND=0`; that neutral value creates no refund rights.

Effective status is computed on every relevant read/write. No keeper or deadline transaction is needed. `totalRaised` is historical accepted funding; `balance` is spendable or refundable OFL still held.

Managers propose one of eight prescribed actions. Existing approvers may propose manager/approver/threshold recovery using the existing threshold. Proposal submission never votes. Initial and future approver sets contain 1–10 unique nonzero addresses. Threshold is at least the immutable minimum.

Approval deadline is exclusive at creation + 7 days. Final approval records `approvedAt`. Payouts are immediately executable; all other action types wait 24 hours. Execution deadline is exclusive at executable time + 7 days, independent of approval deadline. Current membership, version, status, recipient rules and funds are revalidated at execution. Proposer or current manager may cancel a live proposal before execution.

Governance changes increment governance version and invalidate old proposals. Allowlist changes increment recipient-rules version, invalidating old payout proposals. OPEN/ALLOWLIST mode itself is immutable. No pending payout reserves money; multiple approved proposals race against current balance.

Only ACTIVE funds can start closure through governance. This moves to CLOSING and invalidates previous proposals. New settlement payouts and necessary manager/approver/threshold/recipient maintenance may proceed under normal approval and timelock rules. Deposits never reopen. Anyone may finalize at zero balance in CLOSING or fully refunded REFUNDABLE state. Positive payout obligations cannot execute at zero balance; finalization invalidates them in O(1). There is no sweep, default recipient or expiry of refund rights.

Refunds aggregate a donor's donations to a targeted REFUND fund. Failed funds cannot spend through proposals. The claimant must be the original donor wallet. Full entitlement is cleared before transfer and restored on revert. Native gas is paid by the claimant.
