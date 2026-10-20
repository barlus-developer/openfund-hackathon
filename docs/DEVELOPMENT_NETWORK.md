# Remote developer network and real IPFS

The app can use your EVM development RPC and real IPFS independently of Anvil. A remote testnet still uses **DEMO OFL / NOT FIAT-BACKED**. No remote chain, contract address or upload receipt is fabricated. The checked-in deployment remains the actual local deployment until you import your network.

Run everything from the repository root with Node 22.22.1 or newer:

```bash
cp .env.example .env
```

The root `.env` is ignored by git. Vite reads browser settings from this root directory; restart Vite after editing them. CLI helpers load the same file. Only `VITE_` variables enter the public browser bundle. A browser RPC URL is visible to users, even if a provider calls its URL token an API key. Use a browser-safe endpoint with provider origin/quota restrictions; keep privileged RPC credentials in `DEV_RPC_URL` only.

## Connect an existing deployment

Set these root `.env` fields to **actual** values:

| Field                                   | Value                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DEV_RPC_URL`                           | Development network HTTPS JSON-RPC endpoint for CLI reads/deployment                              |
| `BROWSER_RPC_URL`                       | Browser-safe RPC for the same chain; must allow browser reads                                     |
| `DEV_CHAIN_ID`                          | Exact EIP-155 chain ID                                                                            |
| `DEV_TESTNET`                           | `1` for this developer deployment                                                                 |
| `PROTOCOL_VERSION`                      | Unique URL/version identity, e.g. your chosen `dev-v1`; never reuse a version for another address |
| `OPENFUND_DEPLOYMENT_TX`                | Confirmed OpenFund **contract-creation** transaction hash                                         |
| `DEV_EXPLORER_URL`                      | Optional HTTPS explorer base URL                                                                  |
| `DEV_NATIVE_NAME` / `DEV_NATIVE_SYMBOL` | Native gas currency; default Ether / ETH, 18 decimals                                             |

```bash
npm run contracts:build
npm run deployment:import -- --check
npm run deployment:import
```

The importer checks chain ID, successful creation receipt, canonical deployment block/hash, two confirmations, both compiled runtimes (excluding compiler-declared immutable slots), immutable token/chain identity, OFL precision and issuer, and protected registration. Both CLI and browser endpoints must resolve to the deployment. CORS must additionally allow your browser origin. The manifest name comes from `PROTOCOL_VERSION`; confirmation depth is fixed at two for remote imports. Use matching source/compiler/EVM settings for an older deployment; do not bypass a runtime mismatch.

Actual addresses/block/hash are written to `deployments/official.json` and synchronized to `app/src/web3/generated/deployments.json`. Other local/testnet versions are preserved. Reimporting the same deployment can update its public connection settings; repointing a version to another contract or reset chain is rejected.

The newest imported deployment is selected by default. Set `VITE_DEFAULT_DEPLOYMENT` only to pin a specific version. Optionally set `VITE_RPC_URL` to override the selected chain's browser RPC (it never changes chain/address identity). Then:

```bash
npm run dev
```

Open `/protocol` to verify the selected network, actual addresses, RPC, native currency and confirmation count. Connect MetaMask and approve the offered network switch/add prompt. Public fund reads require no wallet. A phone needs an HTTPS app origin and reachable RPC; localhost on a phone refers to the phone itself.

## Deploy new developer contracts

Use a separate testnet wallet with testnet gas and a Foundry encrypted keystore or hardware wallet. **Never use Anvil's public mnemonic on a remote network.** Set `OFL_ISSUER` to your issuer's wallet address and configure the network above. Check that the chain supports the compiler's configured EVM target (`prague`); if necessary set `FOUNDRY_EVM_VERSION` consistently for compilation, simulation, deployment and later import.

```bash
# Simulate first; --account selects your existing encrypted Foundry keystore.
npm run deploy:dev -- --account your-dev-keystore
# Explicitly broadcast after reviewing the simulation:
npm run deploy:dev -- --account your-dev-keystore --broadcast
```

This deploys OFL and the single immutable OpenFund core with no minting or automatic treasury privileges. Foundry records actual addresses and hashes under `contracts/broadcast/DeployProtocol.s.sol/<chainId>/run-latest.json`. Set `OPENFUND_ADDRESS` and `OPENFUND_DEPLOYMENT_TX` from the **OpenFund CREATE transaction** in that record. Do not use the token creation or registration hash.

The issuer must now register the core. An EOA issuer can use its keystore:

```bash
npm run register:dev -- --account your-issuer-keystore
npm run register:dev -- --account your-issuer-keystore --broadcast
npm run deployment:import
```

A multisig issuer instead signs `OFL.registerProtectedFund(actualCoreAddress)` using its own wallet. The importer refuses an unprotected core. Set the selected browser version as above. The issuer may mint test OFL to your regular MetaMask wallet through `mint(address,uint256)` using its own signer; amounts have 18 decimals. There is no remote permissionless faucet, no Anvil seed distribution on a remote chain, and no production reserve/redemption service. Create funds and make real test-token transactions through the app.

`deploy:dev`/`register:dev` have no fallback signer and reject raw private keys, mnemonic flags, unlocked-RPC signing and skipped simulation. They do not broadcast without `--broadcast`. You can also use the underlying Foundry scripts directly for a hardware/multisig-specific operational workflow. No private key enters React.

## Real IPFS publishing

Reading works with pasted CIDs and `ipfs://` references. The default read gateway is `https://ipfs.io/ipfs/`. Set `VITE_IPFS_GATEWAY` only to use a different public path gateway, ending in `/ipfs/`. Publishing uploads actual file bytes, returns the service's CID and computes the raw-byte keccak256 digest locally; the manager separately signs `publishReport` to anchor the URI/digest on-chain. The app supports documents up to 5 MB. A successful upload does not itself publish an on-chain report.

Choose one upload path in Reports:

1. **Your IPFS / Kubo endpoint:** optionally set `VITE_IPFS_API_URL` to your actual HTTPS API or authenticated reverse-proxy endpoint. An origin, prefix, `/api/v0` base or full `/api/v0/add` endpoint works. Prefixes are preserved. The app posts multipart bytes to Kubo `add` with `pin=true`, CIDv1 and no wrapping directory. If authentication is needed, enter your scoped `Bearer …` or `Basic …` Authorization header in the password field. It stays in component memory and is cleared after an upload attempt. Never embed it in a `VITE_` setting. HTTP is allowed only for a loopback node. Configure narrow CORS for your actual app origin, POST and Authorization; do not expose an unrestricted Kubo admin API publicly. See [Kubo RPC documentation](https://docs.ipfs.tech/reference/kubo/rpc/).
2. **Pinata public IPFS:** choose Pinata in Reports. Keep your scoped `PINATA_JWT` in your shell or ignored root `.env`, then run `npm run ipfs:sign`. Paste the resulting five-minute signed URL into Reports → Pinata and upload the selected document. The JWT remains in the one-shot CLI, and no application backend is needed. URLs are temporary upload capabilities; do not commit or share them. The browser sends multipart data with `network=public` and uses the CID from Pinata's real response. See [Pinata signed uploads](https://docs.pinata.cloud/files/uploading-files#client-side-uploads).

After uploading, publish the reference with MetaMask. Open the report and choose **Verify document byte integrity** to fetch from your configured gateway and compare the exact bytes with the on-chain digest. Propagation and gateway availability may take time. CIDs do not promise permanent hosting or real-world truth; maintain your node/pinning subscription. Never upload private beneficiary or patient data.

## Verification limits

Automated tests cover remote network selection, chain identity, receipt/runtime import checks and the real Kubo/Pinata request/response protocols using controlled responses. The existing Anvil integration covers on-chain transactions. A live remote deployment/upload can only be verified once your RPC, actual deployment receipt and IPFS endpoint or temporary upload capability are configured. No live remote result is claimed by the presence of this configuration support.

## Configuration defaults and migration

Local development needs no `.env`. Browser settings are centralized in `app/src/config.ts` and validated before Vite serves or builds the app. All CLI tools use `scripts/config.mjs` to load root `.env`, preserving shell overrides. Missing required remote fields and invalid URLs/chain IDs fail before RPC calls or signing.

`VITE_LOCAL_RPC_URL` was removed: use `VITE_RPC_URL` for the selected chain, or regenerate its manifest with `LOCAL_RPC_URL`. `VITE_IPFS_PROVIDER` was removed: choose Kubo or Pinata in Reports. `DEPLOYMENT_NAME` and `DEV_CONFIRMATIONS` were removed: imports use the version as their name and wait for two confirmations. Existing manifests retain their network names and confirmation settings. Remove these four old variables from existing `.env` files.

RPC timeouts, retry counts, upload limits and protocol rules are code defaults. Credentials and optional external endpoints remain configurable. A custom `LOCAL_RPC_URL` is shared by local startup, deployment, seeding and verification; `npm run local` requires an HTTP loopback origin. Remote URLs and signer requirements never inherit local development keys.
