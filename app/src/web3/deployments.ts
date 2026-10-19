import { createPublicClient, http, type Chain } from "viem";
import manifests from "./generated/deployments.json";
import { deploymentChain, selectDeployment, type Deployment } from "./network";
export type { Deployment } from "./network";

export const deployments = manifests as Deployment[];
export function resolveDeployment(version: string | undefined) {
  return deployments.find((d) => d.version === version);
}
let selected: Deployment | undefined;
export let deploymentConfigurationError: Error | undefined;
try {
  selected = selectDeployment(
    deployments,
    import.meta.env.VITE_DEFAULT_DEPLOYMENT,
  );
} catch (error) {
  deploymentConfigurationError = error as Error;
}
export const defaultDeployment = selected;
export function chainFor(d?: Deployment): Chain {
  return deploymentChain(d, {
    rpcURL: import.meta.env.VITE_RPC_URL,
    chainId: defaultDeployment?.chainId,
    localRPC: import.meta.env.VITE_LOCAL_RPC_URL,
  });
}
const clients = new Map<string, ReturnType<typeof createPublicClient>>();
export function clientFor(d: Deployment) {
  let client = clients.get(d.version);
  if (!client) {
    client = createPublicClient({
      chain: chainFor(d),
      transport: http(chainFor(d).rpcUrls.default.http[0], {
        retryCount: 2,
        timeout: 12000,
      }),
    });
    clients.set(d.version, client);
  }
  return client;
}
export async function verifyDeployment(d: Deployment) {
  const c = clientFor(d);
  const [id, block, code] = await Promise.all([
    c.getChainId(),
    c.getBlock({ blockNumber: BigInt(d.deploymentBlock) }),
    c.getCode({ address: d.openFundAddress }),
  ]);
  if (
    id !== d.chainId ||
    block.hash !== d.deploymentBlockHash ||
    !code ||
    code === "0x"
  )
    throw new Error(
      "Deployment mismatch. Verify the RPC chain and imported deployment receipt/block hash. A reset development chain needs a fresh manifest.",
    );
}
export const fundPath = (d: Deployment, id: bigint | string) =>
  `/funds/${d.version}/${id}`;
