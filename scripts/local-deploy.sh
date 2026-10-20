#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
rpc=$(node --input-type=module -e 'import { rpc } from "./scripts/local-env.mjs"; process.stdout.write(rpc)')
node scripts/local-manifest.mjs --check
node scripts/foundry.mjs forge script contracts/script/DeployLocal.s.sol:DeployLocal --root contracts --rpc-url "$rpc" --broadcast --slow
node scripts/local-manifest.mjs
node scripts/sync-abis.mjs
