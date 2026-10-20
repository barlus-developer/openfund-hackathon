import { spawnSync } from "node:child_process";
import { createPublicClient, http, isAddress, zeroAddress } from "viem";
import { developmentNetwork, requiredEnv } from "./config.mjs";

// No fallback account, mnemonic, private key, faucet or unlocked-RPC signing on a remote network.
const args = process.argv.slice(2);
const register = args[0] === "register";
if (register) args.shift();
const { rpc, chainId } = developmentNetwork();
const addressName = register ? "OPENFUND_ADDRESS" : "OFL_ISSUER";
const address = requiredEnv(addressName);
if (!isAddress(address) || address === zeroAddress)
  throw Error(`${addressName} must be a valid nonzero EVM address.`);
if (
  !args.some((arg) =>
    ["--account", "--ledger", "--trezor", "--keystore"].includes(
      arg.split("=")[0],
    ),
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
if ((await client.getChainId()) !== chainId)
  throw Error("RPC chain ID mismatch; nothing broadcast.");
const contract = register ? "RegisterProtocol" : "DeployProtocol";
// Without --broadcast, Foundry only simulates. Caller explicitly opts into broadcasting.
const result = spawnSync(
  process.execPath,
  [
    "scripts/foundry.mjs",
    "forge",
    "script",
    `contracts/script/${contract}.s.sol:${contract}`,
    "--root",
    "contracts",
    "--rpc-url",
    rpc,
    "--chain",
    String(chainId),
    "--slow",
    ...args,
  ],
  { stdio: "inherit", env: { ...process.env, [addressName]: address } },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
