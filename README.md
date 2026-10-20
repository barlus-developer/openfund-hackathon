# OpenFund Laos

An immutable Solidity funding protocol and static React Web3 DApp for public community funding. One OpenFund contract contains isolated accounts identified by fund ID. No fund factory, application backend, database, platform treasury administrator or proxy.

**Development/testnet system (Anvil or your configured remote EVM RPC). DEMO OFL is not fiat-backed or redeemable for LAK. Not independently audited.** The reference `1 OFL ≈ 1 LAK` is an intended economic target, not proof of reserves or a guaranteed market peg.

## Quick start

Local development needs no `.env` file. Requires Node **22.22.1+** (Node 24 LTS recommended), npm and a browser. Foundry 1.7.1 is installed as a pinned development dependency; forge-std is vendored. First compilation downloads Solidity 0.8.30. No proprietary RPC or wallet API key is required.

```bash
npm ci
# Fresh local chain; intentionally replace the checked-in local deployment manifest.
REPLACE_LOCAL_DEPLOYMENT=1 npm run local
```

This starts loopback Anvil on **http://127.0.0.1:8545**, deploys and registers OFL/OpenFund, mints development tokens, creates three demo funds and starts Vite. Open the Vite URL printed in the terminal (normally **http://127.0.0.1:5173**). Ctrl-C stops the convenience process and its chain. No application backend runs.

To use separate terminals:

```bash
# Terminal 1
node scripts/foundry.mjs anvil --host 127.0.0.1 --port 8545 --chain-id 31337
# Terminal 2, repository root
REPLACE_LOCAL_DEPLOYMENT=1 npm run deploy:local
npm run seed:local
npm run dev
```

Deployment generates actual addresses and a deployment-block hash in [deployments/official.json](deployments/official.json), generated ABIs and the app manifest under `app/src/web3/generated/`. Never copy an example address into configuration. Restart/reload Vite after redeploying. Scripts refuse accidental manifest overwrite and refuse seeding a nonempty protocol. Existing funds remain at their original address. Keep their manifest under a **distinct version name** if intentionally deploying another version on an existing chain.

## Local blockchain and IPFS with Docker

Requires Docker Engine/Desktop with Docker Compose v2 or newer. From the repository root:

```bash
docker compose up --build -d --wait
```

This builds and serves the OpenFund app at **http://127.0.0.1:5173** alongside Anvil, IPFS and Blockscout. With an existing deployed Docker chain, the stack needs only Docker to run. `npm run docker:up` runs the same command when Node/npm are installed.

For a fresh chain, deploy and seed once before building the app. These contract CLI commands require the Node/npm versions listed above:

```bash
npm ci
docker compose up -d --wait anvil ipfs explorer
# First deployment to a fresh Docker chain:
LOCAL_EXPLORER_URL=http://127.0.0.1:4000 REPLACE_LOCAL_DEPLOYMENT=1 npm run deploy:local
npm run seed:local
docker compose up --build -d --wait
```

Compose builds the static React app in a Node stage and serves its `app/dist` output with Nginx. It starts Anvil **1.7.1** (chain ID **31337**), IPFS Kubo **0.43.1**, and a **Blockscout** explorer, waits for healthy services, and saves chain, IPFS and explorer data in named Docker volumes. The app uses local IPFS uploads and document verification. In Reports, choose Kubo and leave the authorization field empty for this local node.

| Service               | Local URL                          |
| --------------------- | ---------------------------------- |
| OpenFund app          | `http://127.0.0.1:5173`            |
| Ethereum JSON-RPC     | `http://127.0.0.1:8545`            |
| Blockscout explorer   | `http://127.0.0.1:4000`            |
| IPFS upload/admin API | `http://127.0.0.1:5001`            |
| IPFS content gateway  | `http://127.0.0.1:8080/ipfs/<CID>` |

Use `docker compose ps`, `docker compose logs -f`, and `docker compose down` to manage the stack; the corresponding `npm run docker:status`, `npm run docker:logs`, and `npm run docker:down` aliases also work. Start everything again with `docker compose up --build -d --wait`; existing deployments, funds and pinned files are retained, so skip deployment and seeding on subsequent starts. Stop any native Anvil already using port 8545 or Vite using port 5173 before starting Compose. `npm run local` starts its own native Anvil; use the Docker commands above for this workflow.

The app image includes its deployment manifest and public Vite configuration at build time. Rebuild it after changing source, redeploying contracts or changing the public build arguments in `compose.yaml`: `docker compose up --build -d --wait app`. Host `.env` files and host `node_modules` are excluded from the build context. For Vite development with live updates, run `docker compose stop app` to free port 5173, then `npm run dev:docker` on the host.

Blockscout indexes existing and new blocks, transactions, addresses and token transfers from Anvil. The explorer's PostgreSQL and Redis services are internal to Docker. Its first start runs database migrations and can take a few minutes. Anvil's internal-transaction and pending-transaction fetchers are disabled following Blockscout's Anvil configuration; the optional statistics, account and verification microservices are not included. `LOCAL_EXPLORER_URL` adds explorer links to the app and wallet network metadata when generating a deployment manifest. For an already deployed chain, update the metadata without redeploying:

```bash
LOCAL_EXPLORER_URL=http://127.0.0.1:4000 node scripts/local-manifest.mjs
npm run abi
docker compose up --build -d --wait app
```

All published ports bind to loopback. IPFS runs offline and serves locally pinned content; these files are available through this local gateway and are not advertised to the public IPFS network. Upload CORS allows localhost/127.0.0.1 on app ports 5173, 5180 and 4173. Anvil uses the public development accounts described below, checkpoints every five seconds and saves on graceful shutdown. Docker volumes are removed only by an explicit `docker compose down --volumes`; that deletes chain, IPFS and explorer data and requires a fresh deployment/seed afterward.

Configuration follows the official [Foundry Docker guide](https://getfoundry.sh/guides/docker), [Kubo Docker guide](https://docs.ipfs.tech/install/run-ipfs-inside-docker/), and [Blockscout Anvil setup](https://github.com/blockscout/blockscout/blob/master/docker-compose/anvil.yml).

## Your developer RPC and real IPFS

Use [the remote development guide](docs/DEVELOPMENT_NETWORK.md) to configure your actual network and upload service. Copy `.env.example` to the **repository root** `.env`; Vite and the development CLI helpers read it. Import a deployed protocol using its real creation receipt with `npm run deployment:import`, then run `npm run dev`. The importer validates chain identity, compiled runtimes and protected registration before exporting addresses. The first manifest entry is selected automatically; set `VITE_DEFAULT_DEPLOYMENT` only to pin a version.

For new testnet contracts, `npm run deploy:dev -- --account your-keystore` simulates; add `--broadcast` to send. `npm run register:dev` uses the issuer's signer. No remote key, RPC or contract address is guessed, and Anvil's public mnemonic is restricted to local tools.

Reports upload real files to your HTTPS IPFS/Kubo endpoint, or to Pinata using a temporary signed upload URL generated by `npm run ipfs:sign`. A configurable gateway reads the CID and verifies its raw-byte digest against the on-chain report. Pinning credentials never enter the build. Full field names and commands are in the guide.

## MetaMask demo

Add a custom network: RPC `http://127.0.0.1:8545`, chain ID **31337**, currency **ETH**. Use a separate development wallet. Anvil's **public, unsafe development mnemonic** is `test test test test test test test test test test test junk`. Never send real funds to these accounts. Private keys never enter the React bundle.

| Anvil index       | Role in seeded examples                               |
| ----------------- | ----------------------------------------------------- |
| 0 (`0xf39F…2266`) | Token demo issuer, fund manager and first approver    |
| 1 (`0x7099…79C8`) | Second approver                                       |
| 2 (`0x3C44…93BC`) | Third approver                                        |
| 3 (`0x90F7…b906`) | Fourth healthcare approver                            |
| 4 (`0x15d3…6A65`) | Fifth healthcare approver; sample payout recipient    |
| 5 (`0x9965…A4dc`) | Seed donor; claim healthcare refunds from this wallet |

Each receives 10,000,000 demo OFL. The issuer has **no special OpenFund authority**; account 0 has fund permissions only because it is explicitly listed in each seed fund.

1. Browse public records without connecting. Switch Lao/English using the header.
2. Connect MetaMask, open Education fund #3, donate using **one** `transferAndCall` transaction, with no approval transaction.
3. Inspect its pending books payout. Approve from indices 0 and 1, then execute from any wallet.
4. The manager can publish report references, propose governance changes or start closure. Sensitive actions wait 24 hours; remaining funds require separate approved settlement payouts.
5. For healthcare refunds, advance local time by a day, then connect donor index 5 and claim from the fund page or My Refunds. No manager approval.

```bash
node scripts/foundry.mjs cast rpc evm_increaseTime 86400 --rpc-url http://127.0.0.1:8545
node scripts/foundry.mjs cast rpc evm_mine --rpc-url http://127.0.0.1:8545
```

MetaMask mobile is supported by the current Wagmi MetaMask Connect connector, with one connector for extension/mobile. **Mobile cannot access a computer's loopback Anvil using the phone's localhost.** Use a safely configured reachable development RPC or your configured public testnet. Extension/mobile device prompts require manual verification; automated tests use a separately documented test wallet harness.

## Verify

```bash
npm run contracts:fmt
npm run contracts:build
npm run contracts:test
npm run abi
npm run typecheck
npm test
npm run test:scripts
npm run lint
npm run build
npm run local:verify   # requires deployed Anvil; restores its snapshot afterward
npm run e2e           # requires seeded Anvil; starts/reuses Vite on port 5180
node scripts/security-check.mjs
npm audit
```

Playwright needs Chromium: `npx playwright install chromium` if absent. Browser tests run real transactions with a **test-only EIP-1193 provider using unlocked Anvil accounts**, not automated MetaMask extension prompts. Test snapshots are reverted: their receipt hashes are test evidence, not retained canonical demo history. See [TESTING](docs/TESTING.md).

## Build and host

`npm run build` produces `app/dist`. Serve **only that directory** on any static host or IPFS gateway. Hash routing (`/#/funds/local-v1/3`) and relative build paths support deep links without an application server. The development-only `app/e2e.html` wallet harness is excluded from this build.

Public network configuration uses explicit official deployment records with globally unique version keys, real deployment block hashes, compatible ABIs and reachable RPC URLs. See [DEPLOYMENT](docs/DEPLOYMENT.md). No deployer key may use a `VITE_` environment name.

## Protocol and documentation

- [Architecture](docs/ARCHITECTURE.md) and [compiled API inventory](docs/CONTRACTS.md)
- [Funding and governance rules](docs/FUND_RULES.md), [DApp flows](docs/DAPP_FLOWS.md)
- [Security model](docs/SECURITY_MODEL.md), [decisions](docs/DECISIONS.md), [limits](docs/LIMITATIONS.md)
- [Deployment](docs/DEPLOYMENT.md), [remote RPC / real IPFS](docs/DEVELOPMENT_NETWORK.md) and [verification](docs/TESTING.md)

Current library APIs were checked against official [OpenZeppelin](https://docs.openzeppelin.com/contracts/5.x/api/token/erc20), [Wagmi](https://wagmi.sh/react/getting-started), [MetaMask Connect](https://docs.metamask.io/metamask-connect/evm/), [Vite](https://vite.dev/guide/) and [React Router](https://reactrouter.com/start/declarative/installation) documentation. Vercel's React best-practices skill is installed in `.agents/skills/` and recorded in `skills-lock.json`.
