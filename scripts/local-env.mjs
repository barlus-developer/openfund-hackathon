import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
} from "viem";
import { mnemonicToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";
export const rpc = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
export const chain = defineChain({
  id: 31337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
});
export const client = createPublicClient({ chain, transport: http(rpc) });
export async function requireAnvil() {
  const host = new URL(rpc).hostname;
  if (!["127.0.0.1", "localhost", "[::1]"].includes(host))
    throw Error("Local scripts require a loopback RPC.");
  const version = await client.request({ method: "web3_clientVersion" });
  if (
    (await client.getChainId()) !== 31337 ||
    !version.toLowerCase().includes("anvil")
  )
    throw Error("Local scripts require Anvil chain 31337.");
}
// Anvil's PUBLIC, UNSAFE development mnemonic. CLI scripts only; never imported by the app.
export const account = (i) =>
  mnemonicToAccount(
    "test test test test test test test test test test test junk",
    { addressIndex: i },
  );
export const wallet = (i) =>
  createWalletClient({ account: account(i), chain, transport: http(rpc) });
export const artifact = (name) =>
  JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`, "utf8"));
export async function transact(i, address, abi, functionName, args = []) {
  const { request } = await client.simulateContract({
    account: account(i),
    address,
    abi,
    functionName,
    args,
  });
  const hash = await wallet(i).writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw Error(`Reverted: ${hash}`);
  return receipt;
}
