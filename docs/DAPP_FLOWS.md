# DApp flows

All routes are hash routes in the static build. The configured version resolves a canonical chain/address; arbitrary URL contract addresses are rejected.

| Route                                                                  | Behavior                                                                                                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                                                    | Donor homepage with direct search, category links and live recent projects; no wallet connection or creation controls               |
| `/funds`                                                               | Public discovery with loaded-scope filters, sort, pagination and direct donation actions; search/category/deployment in the URL     |
| `/funds/:version/:fundId`                                              | Project purpose, current progress, donation, spending summary and expandable fund terms                                             |
| `…/donate`                                                             | Exact decimal amount, policy preview, one `transferAndCall`; successful receipt replaces the form and links to tracking             |
| `…/transactions`, `…/payouts`, `…/reports`                             | Public fund activity, spending and published reports with content verification                                                      |
| `/donations`, `/donations/refunds`                                     | Connected donor's history and current refund entitlements                                                                           |
| `/manager`                                                             | Dedicated Funding Manager layout, wallet access, loaded-project totals and managed/approval projects                                |
| `/manager/create`                                                      | Identity → funding → governance → recipients → review; saved draft, inline errors, focusable error summary, receipt-derived fund ID |
| `/manager/funds`, `/manager/approvals`, `/manager/transactions`        | Managed projects, actionable proposals and managed-project activity                                                                 |
| `/manager/funds/:version/:fundId`                                      | Management overview, live balances/progress and contextual actions                                                                  |
| `…/spending`, `…/proposals`, `…/proposals/:proposalId`, `…/governance` | All existing proposal types, votes, timelocks, approval/execution, recovery and eligible closure                                    |
| `…/settings`, `…/reports`, `…/transactions`, `…/payouts`               | Manager metadata editing, report publishing, funding activity and spending history                                                  |
| `/wallet`, `/manager/wallet`                                           | OFL/native balances, receive/copy, watchAsset and ordinary wallet transfers                                                         |
| `/transactions`, `/protocol`, `/manager/network`, `/about`             | Public global logs, configured versions and platform terms                                                                          |

Legacy `/funds/create`, fund governance/proposal/manage links and `/dashboard/*` routes redirect to the corresponding public or manager page. The selected deployment is retained when navigating related manager, wallet and donor history sections. Manager views remain readable without a wallet; contract roles control write actions.

Donor: public browse → project or direct donation → positive exact decimal amount and immutable failure policy → connect/switch network if needed → simulate → MetaMask → submitted hash → mined successful receipt and DonationReceived → refresh ledger. No token allowance transaction. Failed REFUND donor: original donating wallet → current entitlement read → claimRefund → successful receipt. KEEP_FUNDS and CONTINUOUS never show a false failure-refund right.

Manager: five-step creation with explicit policy and immutable terms; saved browser draft is not blockchain state. Choose payout/manager/approver/threshold/recipient/closure action with exact payload. No direct treasury withdrawal. Report/metadata publication changes no money or immutable terms.

Approver: inspect exact target, amount, purpose and evidence → approve once on chain. Sensitive actions wait 24 hours after final approval. Existing approvers may initiate necessary recovery under the original quorum. Any wallet can execute after fresh simulation and all contract checks. Latest balance can make an approved payout fail.

Wallet writes re-check selected account, network, official deployment and gas, simulate with eth_call, request a wallet transaction and wait for receipt. Repriced transactions are followed; cancellation/different-operation replacement is not treated as protocol success. Rejected/reverted/failed states remain visible with hashes where available. Public reads work with no wallet.

Transactions and reports use paged event logs with explicit scan coverage. Provider failures/cancellation do not become empty success. Current role/refund checks use contract reads, not cached logs. No logged content is treated as identity verification or evidence of real-world truth. Manager overview totals are explicitly scoped to loaded managed projects; no platform impact statistics are fabricated.
