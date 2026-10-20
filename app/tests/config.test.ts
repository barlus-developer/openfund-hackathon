import { describe, expect, it } from "vitest";
import { readAppConfig } from "../src/config";

describe("public configuration", () => {
  it("needs no environment settings for local development", () => {
    expect(readAppConfig({})).toEqual({
      defaultDeployment: undefined,
      rpcURL: undefined,
      ipfsGateway: "https://ipfs.io/ipfs/",
      ipfsAPI: "",
    });
  });

  it("treats blank optional values as defaults and normalizes endpoints", () => {
    expect(
      readAppConfig({ VITE_DEFAULT_DEPLOYMENT: "  ", VITE_RPC_URL: " " })
        .rpcURL,
    ).toBeUndefined();
    const config = readAppConfig({
      VITE_DEFAULT_DEPLOYMENT: " dev-v1 ",
      VITE_RPC_URL: " https://rpc.example.org ",
      VITE_IPFS_GATEWAY: "https://gateway.example.org/ipfs",
      VITE_IPFS_API_URL: "http://127.0.0.1:5001",
    });
    expect(config.defaultDeployment).toBe("dev-v1");
    expect(config.rpcURL).toBe("https://rpc.example.org/");
    expect(config.ipfsGateway).toBe("https://gateway.example.org/ipfs/");
    expect(config.ipfsAPI).toBe("http://127.0.0.1:5001");
  });

  it.each([
    ["VITE_RPC_URL", "not a URL"],
    ["VITE_RPC_URL", "https://user:secret@rpc.example.org"],
    ["VITE_IPFS_GATEWAY", "javascript:alert(1)"],
    ["VITE_IPFS_API_URL", "http://remote.example.org"],
    ["VITE_IPFS_API_URL", "https://user:secret@ipfs.example.org"],
  ])("rejects invalid %s before any request", (name, value) => {
    expect(() => readAppConfig({ [name]: value })).toThrow(name);
    try {
      readAppConfig({ [name]: value });
    } catch (error) {
      expect(String(error)).not.toContain(value);
    }
  });
});
