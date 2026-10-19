// DEVELOPMENT TEST ENTRY ONLY. Not part of Vite's production build (index.html only).
// Playwright injects an EIP-1193 provider forwarding to unlocked loopback Anvil accounts.
import ReactDOM from "react-dom/client";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors/injected";
import type { EIP1193Provider } from "viem";
import { App } from "../src/App";
import { chainFor, defaultDeployment } from "../src/web3/deployments";
declare global {
  interface Window {
    testProvider: EIP1193Provider;
  }
}
if (
  !["127.0.0.1", "localhost"].includes(location.hostname) ||
  defaultDeployment?.chainId !== 31337
)
  throw Error("Harness requires loopback and Anvil 31337.");
const chain = chainFor(defaultDeployment);
const walletConfig = createConfig({
  chains: [chain],
  multiInjectedProviderDiscovery: false,
  connectors: [
    injected({
      target: () => ({
        id: "anvil-harness",
        name: "Anvil test wallet (not MetaMask)",
        provider: window.testProvider,
      }),
    }),
  ],
  transports: { [chain.id]: http(chain.rpcUrls.default.http[0]) },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <App walletConfig={walletConfig} />,
);
