import { defineChain, type Address, type Chain } from "viem";
import { publicURL } from "../config.ts";

export type Deployment = {
  chainId: number;
  version: string;
  name: string;
  openFundAddress: Address;
  oflTokenAddress: Address;
  deploymentBlock: string;
  deploymentBlockHash: `0x${string}`;
  rpcUrls: string[];
  explorerUrl?: string;
  nativeCurrency?: { name: string; symbol: string; decimals: number };
  testnet?: boolean;
  confirmations?: number;
  demoMode: boolean;
};

export function selectDeployment(list: Deployment[], version?: string) {
  if (!version) return list[0];
  const d = list.find((item) => item.version === version);
  if (!d)
    throw Error(
      `Configured deployment "${version}" is missing. Import its verified deployment manifest first.`,
    );
  return d;
}

export function deploymentChain(
  d?: Deployment,
  overrides: { rpcURL?: string; chainId?: number } = {},
): Chain {
  const id = d?.chainId ?? 31337;
  const rpc =
    overrides.rpcURL && overrides.chainId === id
      ? overrides.rpcURL
      : d?.rpcUrls[0] || "http://127.0.0.1:8545";
  return defineChain({
    id,
    name: d?.name ?? "Anvil (not deployed)",
    nativeCurrency: d?.nativeCurrency ?? {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: {
      default: {
        http: [rpc, ...(d?.rpcUrls.slice(1) ?? [])].map((url) =>
          publicURL(url, "RPC"),
        ),
      },
    },
    ...(d?.explorerUrl
      ? {
          blockExplorers: { default: { name: "Explorer", url: d.explorerUrl } },
        }
      : {}),
    testnet: d?.testnet ?? id === 31337,
  });
}
