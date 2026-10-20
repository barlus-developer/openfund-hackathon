# Verification

This records development checks actually executed in this repository; it is not an independent audit.

| Command                  | Result                                                                       |
| ------------------------ | ---------------------------------------------------------------------------- |
| `npm run contracts:test` | 33 tests passed: 28 deterministic/fuzz cases plus 5 stateful invariants      |
| `npm test`               | 65 client tests passed across 11 files                                       |
| `npm run test:scripts`   | 8 configuration/deployment cases passed (also executed directly with Node)   |
| `npm run typecheck`      | Strict TypeScript passed                                                     |
| `npm run lint`           | ESLint passed                                                                |
| `npm run build`          | Vite production build passed                                                 |
| `npm run local:verify`   | Receipt/runtime importer check plus 14 mined transactions; snapshot restored |
| `npm run e2e`            | 4 Chromium browser tests passed against seeded Anvil                         |
| `npm audit`              | Zero known dependency advisories after compatible uuid override              |

Contract fuzzing runs 256 amount cases. Stateful invariants run 128 sequences × 64 calls per invariant (8,192 calls), across three funds, multiple donors, time warps, governance, payouts, refunds and closure. Assertions cover per-fund/global accounting, token solvency, double execution/refunds, cross-fund spending, unauthorized withdrawal and donations outside funding states.

Unit/integration tests exercise protected transfer/mint/allowance routes, callback authorization consumption, registration, exact deadlines/goals, immutable policy divergence, 1/1–2/3–3/5 governance, recovery, duplicate votes, distinct approval/execution windows, timelocks, allowlist invalidation, payout races, refunds without expiry, closure settlement, reports, metadata and version isolation.

Frontend tests exercise remote network/version selection, scoped RPC overrides, native network metadata, HTTPS Kubo prefix/auth/pinning requests, Pinata signed public uploads, upload cancellation/response validation, session credential clearing, file replacement/size limits, gateway integrity checks, bare CID references and unsafe URI rejection, exact BigInt conversion, the real overloaded ABI, canonical creation and receipt IDs, malformed input, log dedupe/reorg removal, range subdivision, partial RPC failure/cancel, cache identity, receipt-only confirmation, replacement validation, wallet connection/switch/rejection, current manager/approver role visibility and empty states.

Configuration tests cover empty defaults, malformed URLs, safe error messages, exact chain IDs, testnet acknowledgement, root `.env` loading outside the working directory and shell precedence. Creation wizard steps share and test the final submission validation rules.

Deployment utility tests reject wrong-chain/failed-create/unprotected/mismatched-runtime/reorg/underconfirmed imports and prevent version repointing. The read-only importer inspection was also run against the actual Anvil creation receipt, both compiled runtimes and protected registration. No live external RPC deployment or third-party IPFS upload was performed without user endpoints/capabilities.

Browser tests use `app/e2e.html` with an injected **test-only** EIP-1193 provider. It forwards actual transactions to unlocked loopback Anvil accounts, without private keys in the browser or fabricated hashes. This entry is excluded from the Vite production build. Tests cover public and manager routes, legacy redirects, mobile navigation/overflow in portrait and landscape, reduced motion, homepage search, inline validation and keyboard error recovery, real creation/metadata editing/donation/tracking/approval/payout/report/closure and original-donor refunds. They **do not automate or certify the MetaMask extension or a physical mobile wallet**.

Each integration/browser test restores an Anvil snapshot. Receipts existed and succeeded during execution, but are not canonical history after restoration. Seed receipts remain in `.local/seed-receipts.json` for the running demo. Snapshot-test hashes are explicitly marked reverted in `.local/verification-receipts.json`.

Static verification commands:

```bash
node scripts/foundry.mjs forge fmt --root contracts --check
node scripts/foundry.mjs forge build --root contracts --sizes
node scripts/security-check.mjs
```

Foundry emits expected block-timestamp lint warnings for deadline/timelock comparisons, plus test-only cast/unchecked-transfer warnings where revert behavior is asserted. Runtime OpenFund code is 16,165 bytes (under the 24,576-byte EIP-170 limit). The source/ABI policy check detects forbidden authority/execution patterns; it is not a general vulnerability analyzer. No Slither/Mythril/independent audit result is claimed.

Manual MetaMask QA:

1. Import your developer deployment, select its configured version, confirm chain/RPC/native currency on `/protocol`, then connect/disconnect; reject a connection and transaction; change account; switch/add local network explicitly.
2. Browse without MetaMask; disable RPC and verify error/retry instead of misleading empty data.
3. Create targeted REFUND and continuous funds; inspect every immutable preview and byte-length validation.
4. Donate once, verify token Transfer and DonationReceived in the same successful receipt; attempt an ordinary send to the protected core and observe rejection.
5. Use two/three separate listed wallets to approve 2/3 or 3/5 actions; advance local time for sensitive changes. Check stale proposals after governance/recipient updates.
6. Claim from original donor after failed target deadline; check KEEP_FUNDS/continuous have no entitlement. Finalize only after zero balance.
7. Publish a public report digest/CID; fetch and compare exact bytes. Test missing gateway, mismatched hash, HTTPS endpoint CORS/authorization, expired Pinata signed URLs and privacy guidance.
8. Check phone-width navigation, keyboard focus, Lao labels, screen-reader semantics, physical mobile wallet and a device-reachable RPC.
