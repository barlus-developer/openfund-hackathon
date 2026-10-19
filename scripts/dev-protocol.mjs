import { spawnSync } from "node:child_process";
import { createPublicClient, http, isAddress } from "viem";

// No fallback account, mnemonic, private key, faucet or unlocked-RPC signing on a remote network.
const args = process.argv.slice(2);
const register = args[0] === "register";
if (register) args.shift();
const {
  DEV_RPC_URL: rpc,
  DEV_CHAIN_ID: chainId,
  OFL_ISSUER: issuer,
  OPENFUND_ADDRESS: core,
} = process.env;
if (
  !rpc ||
  !/^[1-9]\d*$/.test(chainId || "") ||
  process.env.DEV_TESTNET !== "1"
)
  throw Error(
    "Set DEV_RPC_URL, DEV_CHAIN_ID and DEV_TESTNET=1 for the development network.",
  );
if (register ? !isAddress(core || "") : !isAddress(issuer || ""))
  throw Error(
    register
      ? "Set actual OPENFUND_ADDRESS."
      : "Set OFL_ISSUER to your issuer wallet address.",
  );
if (
  !args.some((arg) =>
    ["--account", "--ledger", "--trezor", "--keystore"].includes(arg),
  )
)
  throw Error(
    "Specify a Foundry --account / --keystore or hardware wallet. Never use the Anvil seed on a public development network.",
  );
if (
  args.some((arg) =>
    [
      "--private-key",
      "--mnemonic",
      "--unlocked",
      "--rpc-url",
      "--chain",
      "--chain-id",
      "--skip-simulation",
    ].includes(arg.split("=")[0]),
  )
)
  throw Error(
    "Use the explicit DEV_RPC_URL/DEV_CHAIN_ID and a keystore/hardware signer; raw keys, unlocked RPC and skipped simulation are not supported here.",
  );
const client = createPublicClient({ transport: http(rpc) });
if ((await client.getChainId()) !== Number(chainId))
  throw Error("RPC chain ID mismatch; nothing broadcast.");
const contract = register ? "RegisterProtocol" : "DeployProtocol";
// Without --broadcast, Foundry only simulates. Caller explicitly opts into broadcasting.
const result = spawnSync(
  process.execPath,
  [
    "scripts/foundry.mjs",
    "forge",
    "script",
    `script/${contract}.s.sol:${contract}`,
    "--root",
    "contracts",
    "--rpc-url",
    rpc,
    "--chain",
    chainId,
    "--slow",
    ...args,
  ],
  { stdio: "inherit" },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
