#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/local-manifest.mjs --check
(cd contracts && node ../scripts/foundry.mjs forge script script/DeployLocal.s.sol:DeployLocal --rpc-url "${LOCAL_RPC_URL:-http://127.0.0.1:8545}" --broadcast --slow)
node scripts/local-manifest.mjs
node scripts/sync-abis.mjs
