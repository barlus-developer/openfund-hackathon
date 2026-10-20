// Vite exposes only public VITE_ settings. Credentials belong in the CLI environment.
export function publicURL(value: string, name: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw Error(`${name} must be a valid HTTP(S) URL.`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash
  )
    throw Error(
      `${name} must be an HTTP(S) URL without credentials or a fragment.`,
    );
  return url.href;
}

export function readAppConfig(env: Record<string, string | undefined>) {
  const rpcURL = env.VITE_RPC_URL?.trim();
  const ipfsAPI = env.VITE_IPFS_API_URL?.trim();
  const gateway = publicURL(
    env.VITE_IPFS_GATEWAY?.trim() || "https://ipfs.io/ipfs/",
    "VITE_IPFS_GATEWAY",
  );
  if (ipfsAPI) {
    const url = new URL(publicURL(ipfsAPI, "VITE_IPFS_API_URL"));
    if (
      url.protocol !== "https:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    )
      throw Error(
        "VITE_IPFS_API_URL requires HTTPS (HTTP is allowed for loopback).",
      );
  }
  return {
    defaultDeployment: env.VITE_DEFAULT_DEPLOYMENT?.trim() || undefined,
    rpcURL: rpcURL ? publicURL(rpcURL, "VITE_RPC_URL") : undefined,
    ipfsGateway: gateway.endsWith("/") ? gateway : `${gateway}/`,
    ipfsAPI: ipfsAPI || "",
  };
}

export const appConfig = readAppConfig(import.meta.env ?? {});
