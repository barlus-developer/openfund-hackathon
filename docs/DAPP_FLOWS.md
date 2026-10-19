# DApp flows

All routes are hash routes in the static build. The configured version resolves a canonical chain/address; arbitrary URL contract addresses are rejected.

| Route                                                                                                  | Behavior                                                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `/`                                                                                                    | Mission, live recent funds, policy disclosures                                                      |
| `/funds`                                                                                               | 12-fund pages, loaded-scope title/category/mode/status/policy/quorum filters and sort               |
| `/funds/create`                                                                                        | Identity → funding → governance → recipients → review; on-chain creation ID decoded from receipt    |
| `/funds/:version/:fundId`                                                                              | Exact current ledger, immutable terms, manager, approvers and official identity                     |
| `…/donate`                                                                                             | BigInt amount, exact remaining goal, policy preview, one token transferAndCall                      |
| `…/governance`, `…/proposals`, `…/proposals/:proposalId`                                               | Current roles, action payloads, votes, versions, timelock, approve/cancel/execute                   |
| `…/transactions`, `…/payouts`                                                                          | Public per-fund RPC event history                                                                   |
| `…/reports`                                                                                            | Public report references; manager publishing, HTTPS Kubo / Pinata IPFS upload, content verification |
| `…/manage`                                                                                             | Every allowed proposal type, metadata-only edit and eligible finalization                           |
| `/dashboard`, `/dashboard/funds`, `/dashboard/donations`, `/dashboard/approvals`, `/dashboard/refunds` | Scanned wallet history with verified current permissions/claims                                     |
| `/wallet`                                                                                              | OFL/native balances, receive/copy, watchAsset and ordinary wallet transfers                         |
| `/transactions`                                                                                        | Public global protocol logs                                                                         |
| `/protocol`, `/about`, unknown route                                                                   | Official versions, rules/risks/privacy, not-found state                                             |

Donor: public browse → connect/switch network if needed → review immutable failure policy → positive exact decimal amount → simulate → MetaMask → submitted hash → mined successful receipt and DonationReceived → refresh ledger. No token allowance transaction. Failed REFUND donor: original donating wallet → current entitlement read → claimRefund → successful receipt. KEEP_FUNDS and CONTINUOUS never show a false failure-refund right.

Manager: five-step creation with explicit policy and immutable terms; saved browser draft is not blockchain state. Choose payout/manager/approver/threshold/recipient/closure action with exact payload. No direct treasury withdrawal. Report/metadata publication changes no money or immutable terms.

Approver: inspect exact target, amount, purpose and evidence → approve once on chain. Sensitive actions wait 24 hours after final approval. Existing approvers may initiate necessary recovery under the original quorum. Any wallet can execute after fresh simulation and all contract checks. Latest balance can make an approved payout fail.

Wallet writes re-check selected account, network, official deployment and gas, simulate with eth_call, request a wallet transaction and wait for receipt. Repriced transactions are followed; cancellation/different-operation replacement is not treated as protocol success. Rejected/reverted/failed states remain visible with hashes where available. Public reads work with no wallet.

Transactions and reports use paged event logs with explicit scan coverage. Provider failures/cancellation do not become empty success. Current role/refund checks use contract reads, not cached logs. No logged content is treated as identity verification or evidence of real-world truth.
