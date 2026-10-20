import { keccak256, type Hex } from "viem";
import { appConfig } from "../config";

export const MAX_DOCUMENT_BYTES = 5_000_000;
export function normalizeContentURI(value: string) {
  const uri = value.trim();
  // Common CIDv0 (base58btc) and CIDv1 (base32) forms can be pasted without a scheme.
  return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})(\/[^\s]*)?$/.test(uri)
    ? `ipfs://${uri}`
    : uri;
}
export function contentURL(uri: string) {
  uri = normalizeContentURI(uri);
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice(7).replace(/^ipfs\//, "");
    if (!/^[a-zA-Z0-9]+(?:\/[^\s]*)?$/.test(path) || path.includes(".."))
      throw Error("Invalid IPFS content path.");
    return new URL(path, appConfig.ipfsGateway).href;
  }
  const u = new URL(uri);
  if (!["http:", "https:"].includes(u.protocol))
    throw Error("Only IPFS and HTTP(S) document references are supported.");
  return u.href;
}
export async function verifyContent(uri: string, hash: Hex) {
  const r = await fetch(contentURL(uri), {
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw Error(`Document unavailable (${r.status}).`);
  if (Number(r.headers.get("content-length") || 0) > MAX_DOCUMENT_BYTES)
    throw Error("Document exceeds 5 MB verification limit.");
  const reader = r.body?.getReader();
  if (!reader) throw Error("Document body unavailable.");
  let length = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > MAX_DOCUMENT_BYTES)
        throw Error("Document exceeds 5 MB verification limit.");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const actual = keccak256(bytes);
  return {
    match: actual === hash,
    actual,
    bytes: length,
  };
}
export type IPFSPublisher =
  | { provider: "kubo"; endpoint: string; authorization?: string }
  | { provider: "pinata"; signedURL: string };

function uploadURL(value: string) {
  const url = new URL(value);
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw Error(
      "IPFS uploads require HTTPS, or HTTP for a loopback development node.",
    );
  if (url.username || url.password || url.hash)
    throw Error(
      "Use the authorization field rather than embedding credentials in an endpoint.",
    );
  return url;
}

export function kuboAddURL(endpoint: string) {
  const url = uploadURL(endpoint);
  // Accept an origin, a reverse-proxy prefix, /api/v0, or the full add endpoint.
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path.endsWith("/api/v0/add")
    ? path
    : path.endsWith("/api/v0")
      ? `${path}/add`
      : `${path}/api/v0/add`;
  url.searchParams.set("pin", "true");
  url.searchParams.set("cid-version", "1");
  url.searchParams.set("wrap-with-directory", "false");
  url.searchParams.set("progress", "false");
  return url;
}

export async function uploadIPFS(
  file: File,
  publisher: IPFSPublisher,
  signal?: AbortSignal,
) {
  signal?.throwIfAborted();
  if (file.size > MAX_DOCUMENT_BYTES)
    throw Error("Choose a document up to 5 MB.");
  const url =
    publisher.provider === "kubo"
      ? kuboAddURL(publisher.endpoint)
      : uploadURL(publisher.signedURL);
  if (
    publisher.provider === "pinata" &&
    (url.origin !== "https://uploads.pinata.cloud" ||
      !url.pathname.startsWith("/v3/files"))
  )
    throw Error("Use a signed upload URL from uploads.pinata.cloud/v3/files.");
  const body = new FormData();
  body.append("file", file);
  if (publisher.provider === "pinata") body.append("network", "public");
  const headers: Record<string, string> = {};
  if (publisher.provider === "kubo" && publisher.authorization?.trim())
    headers.Authorization = publisher.authorization.trim();
  let r: Response;
  try {
    r = await fetch(url, {
      method: "POST",
      body,
      headers,
      credentials: "omit",
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60000)])
        : AbortSignal.timeout(60000),
    });
  } catch {
    signal?.throwIfAborted();
    // Do not echo signed URLs or authorization credentials from provider errors.
    throw Error(
      "IPFS upload could not connect. Check HTTPS, endpoint, timeout and allowed-origin CORS settings.",
    );
  }
  if (!r.ok)
    throw Error(
      `IPFS upload failed (${r.status}). Check authorization, service limits or signed URL expiry.`,
    );
  let cid: unknown;
  try {
    if (publisher.provider === "pinata") {
      const output = (await r.json()) as { data?: { cid?: string } };
      cid = output.data?.cid;
    } else {
      // Kubo emits newline-delimited JSON, even for a single uploaded file.
      const output = (await r.text())
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as { Hash?: string });
      cid = output.at(-1)?.Hash;
    }
  } catch {
    throw Error("Invalid IPFS upload response.");
  }
  if (
    typeof cid !== "string" ||
    !/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{20,})$/.test(cid)
  )
    throw Error("IPFS service did not return a supported content CID.");
  const hash = keccak256(new Uint8Array(await file.arrayBuffer()));
  signal?.throwIfAborted();
  return { uri: `ipfs://${cid}`, hash };
}
