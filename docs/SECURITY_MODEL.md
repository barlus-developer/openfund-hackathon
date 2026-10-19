# Security model

OpenFund has no owner/admin/deployer/issuer privilege, proxy, upgrade, delegatecall, arbitrary execute or treasury sweep. Creators are historical facts; managers and approvers act only within the selected fund. New versions have independent addresses and balances. Public execution of an approved proposal is intentional.

OFL has one immutable issuer. It may mint to unprotected addresses and irreversibly register protected recipients; it cannot seize, freeze, force-transfer, admin-burn or withdraw existing funds. Registration requires nonzero contract code, zero existing token balance, matching token identity, matching chain ID and protocol handshake. **This cannot prove genuine source identity:** a malicious issuer may deploy a mimic and restrict that mimic's ingress. If a compatible zero-balance donor/recipient contract is registered after contributing, its incoming raw refund/payout can be blocked; entitlement bookkeeping survives the failed transfer, but registration cannot be undone. EOAs cannot be registered because code is required. Official application membership still depends exclusively on explicit deployment configuration. Unlimited issuance also creates economic trust in the issuer.

For a protected address, only the three-argument direct `transferAndCall` can authorize ingress, with a 32-byte payload. A one-use `(from,to,amount)` authorization is consumed in `_update` before the external callback. No permissive flag survives into callback execution. Raw transfer, transferFrom, mint, no-data and transferFromAndCall ingress revert. OpenFund independently validates token caller, fund existence, amount, effective lifecycle and cap. Ledger credit is atomic with the token transfer. Standard outgoing OFL transfers have no receiver callback. All value-changing core entrypoints use ReentrancyGuard and effects-before-transfer accounting.

For each fund:

```text
balance = totalRaised - totalWithdrawn - totalRefunded
totalAccountedOFL = sum(fund.balance)
OFL.balanceOf(OpenFund) >= totalAccountedOFL
```

Refund entitlements are included once in balance. Passed proposals reserve nothing. Payout/refund transfers debit only their fund and the global counter; transfer failure rolls back the transaction. Refunds have no expiry or platform approval.

Threats tested: callback permission reuse; allowance ingress bypass; wrong/malformed fund targets; boundary timestamps; duplicate votes/execution; proposal version invalidation; insufficient-balance races; cross-fund spend; forced closure over refunds; unauthorized administration; independent deployments. Stateful handlers vary donations, donors, time, governance, payouts, refunds and closure across three funds.

Remaining threats: approver collusion, loss of threshold keys, unsafe 1/1 governance, issuer dilution, malicious wallet/RPC, phishing, wrong public deployment config, frontend supply-chain compromise, chain reorgs, unavailable documents, false evidence and private information disclosure. Simulations can become stale before inclusion; the contract remains authoritative. Replacement/cancelled transactions are checked before confirmation. Local cache never grants financial rights.

Foreign ERC20 tokens can be transferred into the contract and native currency can be forced into it. They are not OFL donations, are not ledger credits and have no privileged recovery route. Such assets may remain stuck. Ordinary native transfers revert because there is no payable receive function.

Foundry compiler/lint checks and a small source/ABI policy scan are development checks, not an independent audit or formal verification. Timestamp lint findings are inherent to the explicitly documented deadline/timelock semantics; validators control block time within network constraints.
