import { describe, it, expect, vi, afterEach } from "vitest";
import { keccak256, stringToBytes } from "viem";
import {
  contentURL,
  normalizeContentURI,
  kuboAddURL,
  uploadIPFS,
  verifyContent,
} from "../src/lib/ipfs";
const cid = "bafkreigh2akiscaildc6zze3ukwl7r3oyvwj7wzsyqzkzpm7oks4bkx4jy";
const file = () =>
  Object.assign(new File(["public report"], "report.txt"), {
    arrayBuffer: async () =>
      stringToBytes("public report").buffer as ArrayBuffer,
  });
afterEach(() => vi.unstubAllGlobals());
describe("public evidence references", () => {
  it("accepts a bare CID without any upload account", () => {
    const cid = "bafkreigh2akiscaildc6zze3ukwl7r3oyvwj7wzsyqzkzpm7oks4bkx4jy";
    expect(normalizeContentURI(cid)).toBe(`ipfs://${cid}`);
    expect(contentURL(cid)).toMatch(new RegExp(`/ipfs/${cid}$`));
    expect(contentURL(`ipfs://${cid}`)).toBe(contentURL(cid));
  });
  it("blocks executable URI schemes and traversal", () => {
    expect(() => contentURL("javascript:alert(1)")).toThrow();
    expect(() => contentURL("ipfs://bafkreigh/../secret")).toThrow();
  });
});
describe("real IPFS upload protocols", () => {
  it("supports an HTTPS Kubo reverse proxy, preserves its prefix and pins", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(`${JSON.stringify({ Name: "report.txt", Hash: cid })}\n`),
      );
    vi.stubGlobal("fetch", fetcher);
    const output = await uploadIPFS(file(), {
      provider: "kubo",
      endpoint: "https://ipfs.example.org/team/api/v0",
      authorization: "Bearer scoped-user-token",
    });
    const [url, options] = fetcher.mock.calls[0];
    expect(url.pathname).toBe("/team/api/v0/add");
    expect(url.searchParams.get("pin")).toBe("true");
    expect(url.searchParams.get("wrap-with-directory")).toBe("false");
    expect(options.headers.Authorization).toBe("Bearer scoped-user-token");
    expect(options.redirect).toBe("error");
    expect(options.credentials).toBe("omit");
    expect(options.body.get("file").name).toBe("report.txt");
    expect(output).toEqual({
      uri: `ipfs://${cid}`,
      hash: keccak256(stringToBytes("public report")),
    });
  });
  it("accepts an origin, API base or complete Kubo endpoint without doubling paths", () => {
    for (const suffix of ["", "/api/v0/", "/api/v0/add"])
      expect(
        kuboAddURL(`https://node.example.org/proxy${suffix}`).pathname,
      ).toBe("/proxy/api/v0/add");
    expect(kuboAddURL("http://127.0.0.1:5001").protocol).toBe("http:");
    expect(() => kuboAddURL("http://remote.example.org")).toThrow("HTTPS");
    expect(() => kuboAddURL("https://user:secret@node.example.org")).toThrow(
      "authorization",
    );
  });
  it("uses Pinata public multipart upload with a signed URL and no API key", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ data: { cid } })));
    vi.stubGlobal("fetch", fetcher);
    expect(
      (
        await uploadIPFS(file(), {
          provider: "pinata",
          signedURL:
            "https://uploads.pinata.cloud/v3/files?signature=temporary",
        })
      ).uri,
    ).toBe(`ipfs://${cid}`);
    const options = fetcher.mock.calls[0][1];
    expect(options.body.get("network")).toBe("public");
    expect(options.headers).toEqual({});
    await expect(
      uploadIPFS(file(), {
        provider: "pinata",
        signedURL: "https://evil.example.org/v3/files",
      }),
    ).rejects.toThrow("uploads.pinata.cloud");
  });
  it("rejects failed, malformed and unsupported CID responses", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response("private service error body", { status: 401 }),
      )
      .mockResolvedValueOnce(new Response('{"Hash":"not-a-cid"}'))
      .mockResolvedValueOnce(new Response("not-json"));
    vi.stubGlobal("fetch", fetcher);
    const publisher = {
      provider: "kubo" as const,
      endpoint: "https://node.example.org",
    };
    await expect(uploadIPFS(file(), publisher)).rejects.toThrow("401");
    await expect(uploadIPFS(file(), publisher)).rejects.toThrow("CID");
    await expect(uploadIPFS(file(), publisher)).rejects.toThrow("Invalid IPFS");
  });
  it("limits file size, propagates cancellation, and redacts service connection errors", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValue(
        new Error("https://node.example.org?secret=do-not-log"),
      );
    vi.stubGlobal("fetch", fetcher);
    const publisher = {
      provider: "kubo" as const,
      endpoint: "https://node.example.org",
    };
    await expect(
      uploadIPFS(
        Object.defineProperty(file(), "size", { value: 5_000_001 }),
        publisher,
      ),
    ).rejects.toThrow("5 MB");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(uploadIPFS(file(), publisher)).rejects.toThrow(
      "could not connect",
    );
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadIPFS(file(), publisher, controller.signal),
    ).rejects.toThrow("abort");
  });
  it("verifies the exact fetched document bytes against the on-chain digest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("public report")),
    );
    expect(
      (
        await verifyContent(
          `ipfs://${cid}`,
          keccak256(stringToBytes("public report")),
        )
      ).match,
    ).toBe(true);
    expect(
      (await verifyContent(`ipfs://${cid}`, `0x${"00".repeat(32)}`)).match,
    ).toBe(false);
  });
});
