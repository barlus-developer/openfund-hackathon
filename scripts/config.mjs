import { loadEnvFile } from "node:process";

// Every CLI uses the ignored root .env; existing shell variables take precedence.
try {
  loadEnvFile(new URL("../.env", import.meta.url));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

export const env = (name, fallback = "") =>
  process.env[name]?.trim() || fallback;

export function requiredEnv(name) {
  const value = env(name);
  if (!value)
    throw Error(`Set ${name} in your shell or ignored root .env file.`);
  return value;
}

export function httpURL(value, name, publicOnly = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error(`${name} must be a valid HTTP(S) URL.`);
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.hash ||
    (publicOnly &&
      (url.username ||
        url.password ||
        (url.protocol !== "https:" && !loopback)))
  )
    throw Error(
      `${name} must be ${publicOnly ? "public HTTPS (HTTP allowed for loopback), without embedded login credentials" : "an HTTP(S) URL without a fragment"}.`,
    );
  return url.href;
}

export function developmentNetwork() {
  const rpc = httpURL(requiredEnv("DEV_RPC_URL"), "DEV_RPC_URL");
  const id = requiredEnv("DEV_CHAIN_ID");
  const chainId = Number(id);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(chainId))
    throw Error("DEV_CHAIN_ID must be a positive safe integer.");
  if (env("DEV_TESTNET") !== "1")
    throw Error(
      "Set DEV_TESTNET=1 to acknowledge this development deployment uses test tokens.",
    );
  return { rpc, chainId };
}
