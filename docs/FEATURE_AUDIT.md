# OpenFund Laos feature audit — 2026-10-21

Implemented directly against the existing React 19 / Vite / TypeScript application. Wagmi and Viem connect the browser to the immutable OFL/OpenFund contracts; TanStack Query owns chain reads. There is no application API server or database. The other external boundary is IPFS upload/gateway access.

Existing uncommitted image, homepage, and Docker work was retained. No root or ancestor `AGENTS.md` was present. Project README, architecture, fund rules, testing instructions, component configuration, and selected skills were read. Contract policies and contract source were not changed.

## Skill discovery and selection

Started with the explicitly requested `find-skills` skill and the skills.sh leaderboard, then ran searches for `playwright testing`, `web3 security`, `react accessibility`, `solidity testing`, and Vercel React architecture. Source instructions and repository reputation were inspected before installation. Three skills were installed in project scope and recorded in `skills-lock.json`.

| Skill                         | Discovery evidence                                              | Use                                                                                                   |
| ----------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `find-skills`                 | Existing user-invoked skill                                     | Search, source inspection, compatibility and trust assessment                                         |
| `vercel-react-best-practices` | Existing project installation; CLI returned about 822K installs | Separate component responsibilities, derive permissions, retain parallel independent reads            |
| `web-design-guidelines`       | Vercel leaderboard, about 764K installs; official repository    | Navigation, labels, keyboard focus, field errors, destructive-action confirmation                     |
| `webapp-testing`              | Anthropic CLI result, about 183K installs                       | Browser reconnaissance, DOM-driven actions, screenshots, errors and real workflow verification        |
| `property-based-testing`      | Trail of Bits CLI result, about 6.8K installs                   | Review existing Foundry fuzz/invariant assertions and distinguish example checks from properties      |
| `ui-ux-pro-max`               | Existing local catalog, also on leaderboard                     | Navigation hierarchy and mobile layout guidance; targeted UX search                                   |
| `shadcn`                      | Existing local skill, confirmed `components.json` uses Base UI  | Reuse FieldGroup, Card, Dialog, Accordion, semantic variants and Lucide icons; inspect component docs |

The inspected upstream repositories had approximately 183K (Anthropic), 33K (Vercel), and 7.7K (Trail of Bits) GitHub stars at discovery. Counts are discovery evidence, not a security guarantee. Solana-specific and low-adoption generic Web3 results were rejected. Existing TypeScript Playwright conventions were retained. No additional property-testing framework was added.

## Feature inventory and evidence

| Area / routes                                                               | Audit and verification                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home, `/funds`                                                              | Search, filters, sort, reset, pagination notices, navigation, donation links, empty/error states; component and browser tests                                                                                                           |
| `/funds/:version/:fundId`                                                   | Fund status, target/continuous policy, exact accounting, public metadata/images, terms, donor refund action; source/contract trace and browser reads                                                                                    |
| `…/donate`                                                                  | Positive amounts, 18 decimals, remaining target, balance checks, presets, one `transferAndCall`, receipt event, duplicate-signature guard; browser transaction and regression tests                                                     |
| `/manager/create`                                                           | Five-step validation, immutable review, local draft, approver/recipient settings, image handoff, `FundCreated` receipt navigation; component tests and actual Anvil creation                                                            |
| `/manager`, `/manager/funds`, `/manager/approvals`, `/manager/transactions` | Wallet-based discovery, current membership, task pagination, proposal state reads, event coverage and retries; source audit, component tests, route/browser coverage                                                                    |
| `…/spending`                                                                | All eight action kinds traced to contract permissions and state rules. Payout, manager recovery, recipient add/remove, and closure exercised in the browser; approver and threshold boundaries covered by validators and Solidity tests |
| `…/governance`, `…/proposals`, `…/proposals/:proposalId`                    | Team/quorum, proposal creation, voting, duplicate vote, execution, cancellation, 24-hour timelock, expiry/version invalidation; contract tests and two-wallet browser recovery                                                          |
| `…/settings`                                                                | Metadata URI/digest, image uploads/reordering/removal, permissions, canonical refresh, closed-fund restrictions; component tests, actual metadata transaction, and accessibility scan                                                   |
| `…/reports`                                                                 | Public records, upload/digest, safe document references, executed-payout association, publication, integrity-check path; actual on-chain publication, unit tests and mocked upload/gateway protocols                                    |
| `…/transactions`, `…/payouts`, `/transactions`                              | Event parsing, dedupe, reorg/cache identity, coverage, load-more, cancel/retry, fund/proposal links; component/script tests and browser navigation                                                                                      |
| `/donations`, `/donations/refunds`                                          | Original-donor discovery and entitlement, no-approval refunds, no repeat entitlement; contract and browser transactions                                                                                                                 |
| `/wallet`, `/manager/wallet`                                                | Connection, network checks, balances, exact transfer, protected-recipient rejection, copy/watch-asset handling; browser transfer plus unit/source audit. MetaMask-only APIs still need device QA                                        |
| `/about`, `/protocol`, `/manager/network`                                   | Navigation, configured chain/token/native currency, policy/help text; route and configuration tests                                                                                                                                     |
| Legacy `/dashboard/*`, `/funds/create`, public governance/manage links      | Redirects to the current public or manager routes; browser coverage                                                                                                                                                                     |
| Responsive/accessibility                                                    | 375/390, 768, 812 landscape and 1440 layouts across existing/new tests; mobile menus, overflow, reduced motion, keyboard error focus, automated WCAG A/AA scans                                                                         |

Rendered-route checks are distinguished from complete workflows above. This is not a claim that every combination of wallet, policy, and contract state was browser-tested.

## Fixes and organization

- Replaced the mixed eight-action selector with addressable payout, team, recipient, and closure sections. The selected section survives reload/back navigation through `?section=`.
- Reduced the main fund navigation from eight destinations to six. Team details and payout history remain reachable from Manage, with their existing deep links preserved.
- Added current balance, quorum, wallet role, status guidance, and context-sensitive next actions. Fundraising, refundable, closing, and closed states explain what users can do.
- Removed the fabricated fallback payout option when no proposal is permitted. Current approvers retain recovery proposals, including while fundraising. No privileged path was added.
- Separated `Manage`, `ProposalComposer`, proposal validation/encoding, `Recipients`, `FundSettings`, and shared status guidance. Removed the `settingsOnly` mode switch.
- Added field-specific validation for exact positive payouts, balances, nonzero wallets, duplicate/current team members, threshold bounds/no-op changes, digest syntax, and contract UTF-8 byte limits. Invalid submission focuses the relevant field and sends no transaction.
- Added recipient discovery from loaded events with fresh contract eligibility checks, pagination, and coverage/error notices.
- Added mined-receipt proposal links, busy feedback, editing locks, and an explicit reset before another proposal. Permanent closure now has a confirmation dialog and still requires the contract's zero-balance rule.
- Blocked metadata editing for other wallets/closed funds, validated the URI byte limit, and reset the editor after canonical metadata changes while preserving transaction feedback and image capabilities.
- Refreshed activity, votes, and refund entitlement periodically. External proposals and deadline transitions are covered by browser regression scenarios. Vote reads must succeed before approval is enabled.
- Pinned each fund's balance, effective status, and team reads to the same block.
- Prevented cache-refresh failure from changing a successfully mined transaction into a failed operation. Added lifecycle regressions for rejection, reverted receipts, account/network changes, concurrent submission, and cache errors.
- Rejected empty/oversized report titles and zero digests, checked linked payouts, cleared the previous document URI when selecting a replacement file, and reset fields only after a confirmed publication.
- Fixed the brand link's accessible-name mismatch found by axe. Kept the existing visible Lao interface.
- Bounded Vitest to two workers: unrestricted concurrent DOM tests hit timing limits alongside browser/build work; the ordinary `npm test` command now runs reliably without increasing test timeouts.
- Strengthened the Foundry refund invariant (medium-severity test-oracle weakness): each donor's refunds are now bounded by their independently tracked successful donations, and each claim must increase that donor's token balance by exactly the entitlement. The earlier whole-fund bound could miss a repeated small refund within a larger pool.

## Verification

See [TESTING.md](TESTING.md) for commands and wallet-harness limitations. Contract and browser verification uses disposable local Anvil 31337. Browser writes are real local transactions with successful receipts; the injected provider is a test wallet, not MetaMask automation. Snapshots are reverted, and test receipts are not retained canonical history.

| Check                               | Result                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm test`                          | 111 passed in 17 files, including new proposal, role, report, and transaction-hook regressions          |
| `npm run contracts:test`            | 33 passed, including five stateful invariants with the strengthened refund oracle                       |
| `npm run test:scripts`              | 8 passed                                                                                                |
| `npm run e2e`                       | 14 Chromium scenarios passed; six public/management views passed axe WCAG A/AA scans without exclusions |
| `npm run local:verify`              | Deployment/runtime verification and 14 mined local lifecycle transactions passed; snapshot restored     |
| `npm run typecheck`, `npm run lint` | Passed                                                                                                  |
| `npm run build`                     | Passed; shared Web3 chunk size warning remains                                                          |
| Foundry format check                | Passed                                                                                                  |
| `npm run security`                  | Source/ABI policy checks passed; OpenFund runtime remains 16,165 bytes                                  |
| `npm audit`                         | Zero reported vulnerabilities, including the added axe development dependency                           |

Browser tests are separated into the original demonstration scenarios, the audit regressions, and motion scenarios. A shared test-only provider/snapshot fixture avoids duplicating wallet setup. Screenshots are available under `.local/manage-connected-{375,768,1440}.png` in the audited workspace.

The disposable Vite/Anvil services were stopped and the original deployment manifests/generated ABIs restored after verification. Existing deployment configuration is preserved. Follow the normal local deployment instructions to start a fresh chain for review.

## Remaining limits

- Actual MetaMask extension/mobile prompts, physical mobile devices, human translation review, screen readers, and inclusive usability sessions remain unverified. Automated accessibility scans cover common violations, not full accessibility certification.
- No public/testnet transaction or live third-party IPFS upload was performed. IPFS request, digest, retry, gallery and failure tests use explicit mocks. Endpoint credentials, CORS, pinning, and persistence need the user's actual service.
- Activity/fund discovery is bounded to loaded pages and log windows; notices disclose partial coverage. It is not an exhaustive off-chain index.
- Build output still reports a shared Web3 chunk slightly above 500 kB. The build succeeds; further wallet/library chunk work is separate performance work.
- Source/ABI policy checks, dependency audit, fuzzing, and local workflows do not constitute an independent contract security audit or formal proof.
