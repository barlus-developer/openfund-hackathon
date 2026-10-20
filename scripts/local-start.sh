#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
connection=$(node --input-type=module <<'NODE'
import { rpc } from "./scripts/local-env.mjs";
const url = new URL(rpc);
if (url.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) || url.pathname !== "/" || url.search || url.username || url.password)
  throw Error("LOCAL_RPC_URL must be an HTTP loopback origin for npm run local.");
console.log(url.hostname.replace(/^\[|\]$/g, ""), url.port || "80", url.href);
NODE
)
read -r host port rpc <<< "$connection"
mkdir -p .local
if curl -sf -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' "$rpc" >/dev/null; then
 echo "RPC port $port is already in use. Run npm run deploy:local / seed:local explicitly, or stop the existing chain." >&2; exit 1
fi
node scripts/foundry.mjs anvil --host "$host" --port "$port" --chain-id 31337 --silent >.local/anvil.log 2>&1 &
anvil_pid=$!
trap 'kill "$anvil_pid" 2>/dev/null || true' EXIT INT TERM
for attempt in {1..40}; do
 if curl -sf -H 'content-type: application/json' --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' "$rpc" >/dev/null; then break; fi
 sleep .25
done
bash scripts/local-deploy.sh
node scripts/local-seed.mjs
npm run dev
