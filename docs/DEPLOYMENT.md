# Deployment

Run commands from repository root. `npm ci` installs pinned npm Foundry binaries, OpenZeppelin and the app. forge-std is vendored; do not run forge install. First compilation obtains the configured compiler.

```bash
REPLACE_LOCAL_DEPLOYMENT=1 npm run local
```

This starts Anvil on the configured loopback `LOCAL_RPC_URL` (default `http://127.0.0.1:8545`), checks client identity/chain, broadcasts DeployLocal sequentially (`--slow`, avoiding local transaction-pool ordering gaps), generates actual manifest/ABI files, seeds three funds and runs Vite. Default chain is 31337, native currency ETH. Use `npm run dev -w app -- --port 5180 --strictPort` for a specific UI port. The convenience script refuses an occupied RPC port and cleans up its Anvil on exit.

For a separate persistent Anvil process:

```bash
node scripts/foundry.mjs anvil --host 127.0.0.1 --port 8545 --chain-id 31337
# Another terminal:
REPLACE_LOCAL_DEPLOYMENT=1 npm run deploy:local
npm run seed:local
npm run dev
```

DeployLocal derives only Anvil's public development mnemonic inside the CLI script, deploys OFL with index 0 as immutable issuer, deploys OpenFund pointing to that token, registers the protocol as protected, then mints to indices 0–5. Funds cannot be created before registration. No OFL is minted to the core. These development keys are never imported by the app.

`local-manifest.mjs` reads Foundry broadcast addresses and mines/reads the actual deployment receipt and block hash. `sync-abis.mjs` copies compiled ABIs as TypeScript `as const` exports and copies official deployment JSON. Never edit generated ABIs by hand. Local scripts reject non-loopback/non-Anvil/non-31337 endpoints. Seed refuses a nonempty deployment. The `REPLACE_LOCAL_DEPLOYMENT=1` flag authorizes replacing the local manifest, not deleting historical contracts. For another version on the same chain, archive the prior manifest under a distinct unique version key first.

Anvil resets invalidate the old deployment-block hash even if deterministic addresses repeat. Regenerate the manifest and restart/reload the frontend. If MetaMask has stale nonces after reset, clear the development account's activity/nonce data using current wallet settings.

For your remote developer RPC, use [Remote developer network and real IPFS](DEVELOPMENT_NETWORK.md). It documents keystore/hardware-wallet simulation and deployment, separate issuer registration, and receipt/runtime-verified manifest import. Developer testnets remain labeled DEMO OFL / NOT FIAT-BACKED. No public deployment has been performed without your network/signing configuration.

Never embed wallet keys or service secrets in Vite variables. Copy `.env.example` to the repository root `.env`; Vite now reads that root directory and exposes only `VITE_` settings. The CLI helpers read the same ignored file. Static hosting serves only `app/dist`; its hash router needs no route fallback. Mobile access needs a reachable RPC and app origin.

Reports support real HTTPS Kubo endpoints (including authenticated reverse-proxy prefixes) and Pinata public IPFS using a short-lived signed upload URL from the CLI. Credentials are not stored in the static build. Configure your actual gateway and narrow CORS; never publicly expose an unrestricted Kubo admin API. See the linked guide for exact upload setup.
