import { test as base, expect, type Page } from "@playwright/test";
import { createPublicClient, http } from "viem";
import { anvil } from "viem/chains";
import { readFileSync } from "node:fs";
export { expect };
export const d = JSON.parse(
  readFileSync("deployments/official.json", "utf8"),
).find((entry: { version: string }) => entry.version === "local-v1");
export const abi = JSON.parse(
  readFileSync("contracts/out/OpenFund.sol/OpenFund.json", "utf8"),
).abi;
export const tokenAbi = JSON.parse(
  readFileSync("contracts/out/OFLToken.sol/OFLToken.json", "utf8"),
).abi;
export const rpc = "http://127.0.0.1:8545";
export const client = createPublicClient({
  chain: anvil,
  transport: http(rpc),
});
export const accounts = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
] as const;

// Test-only provider, actual local receipts, and a fresh/reverted snapshot for every scenario.
export const test = base.extend<{ anvilSnapshot: void }>({
  anvilSnapshot: [
    async ({}, use) => {
      expect(await client.getChainId()).toBe(31337);
      const snapshot = await client.request({
        method: "evm_snapshot",
      } as never);
      try {
        await use();
      } finally {
        await client.request({
          method: "evm_revert",
          params: [snapshot],
        } as never);
      }
    },
    { auto: true },
  ],
});
export async function harness(page: Page) {
  await page.addInitScript(
    ({ rpc, accounts }) => {
      localStorage.setItem("ofl-language", "en"); // A stale English preference must not change the Lao-only UI.
      localStorage.removeItem("ofl-draft-v1");
      let connected = sessionStorage.getItem("test-connected") === "1",
        selected = accounts[0];
      const sent: string[] = [];
      const listeners = new Map<string, Set<(...v: unknown[]) => void>>();
      const provider = {
        isMetaMask: false,
        on: (event: string, fn: (...v: unknown[]) => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(fn);
        },
        removeListener: (event: string, fn: (...v: unknown[]) => void) =>
          listeners.get(event)?.delete(fn),
        request: async ({
          method,
          params = [],
        }: {
          method: string;
          params?: unknown[];
        }) => {
          if (method === "eth_requestAccounts") {
            connected = true;
            sessionStorage.setItem("test-connected", "1");
            return [selected];
          }
          if (method === "eth_accounts") return connected ? [selected] : [];
          if (method === "wallet_requestPermissions") {
            connected = true;
            sessionStorage.setItem("test-connected", "1");
            return [{ parentCapability: "eth_accounts" }];
          }
          if (method === "wallet_getPermissions")
            return connected ? [{ parentCapability: "eth_accounts" }] : [];
          if (method === "wallet_revokePermissions") {
            connected = false;
            return null;
          }
          if (
            method === "wallet_switchEthereumChain" ||
            method === "wallet_addEthereumChain"
          )
            return null;
          if (method === "eth_sendTransaction") sent.push(method);
          const result = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          }).then((r) => r.json());
          if (result.error)
            throw Object.assign(Error(result.error.message), result.error);
          return result.result;
        },
      };
      Object.assign(window, {
        testProvider: provider,
        testWallet: {
          sent,
          select: (i: number) => {
            selected = accounts[i];
            listeners.get("accountsChanged")?.forEach((fn) => fn([selected]));
          },
        },
      });
    },
    { rpc, accounts: [...accounts] },
  );
  await page.goto("/e2e.html#/manager");
  await page
    .getByRole("button", { name: "ເຊື່ອມຕໍ່ MetaMask", exact: true })
    .first()
    .click();
  await expect(page.getByText("0xf39F…2266", { exact: true })).toBeVisible();
}
