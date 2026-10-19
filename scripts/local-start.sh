#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .local
if curl -sf -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null; then
 echo 'RPC port 8545 is already in use. Run npm run deploy:local / seed:local explicitly, or stop the existing chain.' >&2; exit 1
fi
node scripts/foundry.mjs anvil --host 127.0.0.1 --port 8545 --chain-id 31337 --silent >.local/anvil.log 2>&1 &
anvil_pid=$!
trap 'kill "$anvil_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..40}; do
 if curl -sf -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' http://127.0.0.1:8545 >/dev/null; then break; fi
 sleep .25
done
bash scripts/local-deploy.sh
node scripts/local-seed.mjs
npm run dev
