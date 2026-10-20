import { createConfig, http } from "wagmi";
import { metaMask } from "wagmi/connectors/metaMask";
import { chainFor, deployments } from "./deployments";

const chains = [
  ...new Map(
    (deployments.length ? deployments : [undefined]).map((d) => {
      const c = chainFor(d);
      return [c.id, c];
    }),
  ).values(),
];
export const config = createConfig({
  chains: [chains[0], ...chains.slice(1)],
  // One connector owns both extension and mobile connection. No duplicate injected provider.
  connectors: [
    metaMask({
      dapp: {
        name: "OpenFund Laos",
        url:
          typeof window === "undefined"
            ? "http://localhost:5173"
            : window.location.origin,
      },
    }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: Object.fromEntries(
    chains.map((c) => [c.id, http(c.rpcUrls.default.http[0])]),
  ),
});
