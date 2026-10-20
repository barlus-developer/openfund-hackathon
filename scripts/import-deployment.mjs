import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, isHash } from "viem";
import { inspectDeployment, mergeDeployment } from "./deployment-utils.mjs";
import { developmentNetwork, env, requiredEnv, httpURL } from "./config.mjs";

// Import is read-only on-chain. Never derives or requests a wallet private key.
try {
  const { rpc, chainId } = developmentNetwork();
  const browserRPC = httpURL(
    requiredEnv("BROWSER_RPC_URL"),
    "BROWSER_RPC_URL",
    true,
  );
  const version = requiredEnv("PROTOCOL_VERSION");
  const hash = requiredEnv("OPENFUND_DEPLOYMENT_TX");
  const confirmations = 2;
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(version) ||
    version === "local-v1"
  )
    throw Error(
      "Choose a unique non-local PROTOCOL_VERSION (letters, digits, dot, underscore or hyphen).",
    );
  if (!isHash(hash))
    throw Error(
      "OPENFUND_DEPLOYMENT_TX must be an actual 32-byte transaction hash.",
    );
  const explorer = env("DEV_EXPLORER_URL");
  const explorerUrl = explorer
    ? httpURL(explorer, "DEV_EXPLORER_URL", true).replace(/\/$/, "")
    : undefined;
  if (explorerUrl && new URL(explorerUrl).protocol !== "https:")
    throw Error("DEV_EXPLORER_URL must use HTTPS.");
  const artifacts = Object.fromEntries(
    ["OpenFund", "OFLToken"].map((contract) => [
      contract,
      JSON.parse(
        readFileSync(`contracts/out/${contract}.sol/${contract}.json`, "utf8"),
      ),
    ]),
  );
  const client = createPublicClient({
    transport: http(rpc, { timeout: 20000, retryCount: 2 }),
  });
  const actual = await inspectDeployment(
    client,
    hash,
    chainId,
    artifacts,
    confirmations,
  );
  // Check the separate browser endpoint, too; it must serve the same deployment.
  if (browserRPC !== rpc)
    await inspectDeployment(
      createPublicClient({ transport: http(browserRPC) }),
      hash,
      chainId,
      artifacts,
      confirmations,
    );
  const entry = {
    ...actual,
    version,
    name: version,
    rpcUrls: [browserRPC],
    nativeCurrency: {
      name: env("DEV_NATIVE_NAME", "Ether"),
      symbol: env("DEV_NATIVE_SYMBOL", "ETH"),
      decimals: 18,
    },
    ...(explorerUrl ? { explorerUrl } : {}),
    testnet: true,
    confirmations,
    demoMode: true,
  };
  const path = "deployments/official.json";
  const merged = mergeDeployment(JSON.parse(readFileSync(path, "utf8")), entry);
  if (!process.argv.includes("--check")) {
    writeFileSync(path, JSON.stringify(merged, null, 2) + "\n");
    await import("./sync-abis.mjs");
  }
  console.log(
    `${process.argv.includes("--check") ? "Verified" : "Imported"} ${version}: chain ${chainId}, OpenFund ${actual.openFundAddress}, OFL ${actual.oflTokenAddress}, block ${actual.deploymentBlock}. No secrets exported. Set VITE_DEFAULT_DEPLOYMENT=${version} and restart Vite.`,
  );
} catch (error) {
  // Viem network errors can embed credentialed RPC URLs; don't print those error bodies.
  console.error(
    error.name === "Error" || error.name === "TypeError"
      ? error.message
      : "Deployment RPC validation failed. Check endpoint, chain, transaction receipt and compiled artifacts. Credentials were not logged.",
  );
  process.exitCode = 1;
}
