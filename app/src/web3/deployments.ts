import { createPublicClient, http, type Chain } from "viem";
import manifests from "./generated/deployments.json";
import { deploymentChain, selectDeployment, type Deployment } from "./network";
import { appConfig } from "../config";
export type { Deployment } from "./network";

export const deployments = manifests as Deployment[];
export function resolveDeployment(version: string | undefined) {
  return deployments.find((d) => d.version === version);
}
export const defaultDeployment = selectDeployment(
  deployments,
  appConfig.defaultDeployment,
);
export function chainFor(d?: Deployment): Chain {
  return deploymentChain(d, {
    rpcURL: appConfig.rpcURL,
    chainId: defaultDeployment?.chainId,
  });
}
const clients = new Map<string, ReturnType<typeof createPublicClient>>();
export function clientFor(d: Deployment) {
  let client = clients.get(d.version);
  if (!client) {
    const chain = chainFor(d);
    client = createPublicClient({
      chain,
      transport: http(chain.rpcUrls.default.http[0], {
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

export const managerFundPath = (d: Deployment, id: bigint | string) =>
  `/manager/funds/${d.version}/${id}`;
