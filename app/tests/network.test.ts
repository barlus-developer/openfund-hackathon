import { describe, it, expect } from "vitest";
import {
  deploymentChain,
  selectDeployment,
  type Deployment,
} from "../src/web3/network";
const local: Deployment = {
  chainId: 31337,
  version: "local-v1",
  name: "Anvil",
  openFundAddress: "0x1111111111111111111111111111111111111111",
  oflTokenAddress: "0x2222222222222222222222222222222222222222",
  deploymentBlock: "1",
  deploymentBlockHash: `0x${"ab".repeat(32)}`,
  rpcUrls: ["http://127.0.0.1:8545"],
  demoMode: true,
};
const remote: Deployment = {
  ...local,
  chainId: 11155111,
  version: "dev-v1",
  name: "Developer testnet",
  rpcUrls: ["https://rpc.example.org"],
  testnet: true,
  nativeCurrency: { name: "Test Gas", symbol: "TEST", decimals: 18 },
};
describe("development network configuration", () => {
  it("selects an explicit official version and rejects missing deployments", () => {
    expect(selectDeployment([local, remote], "dev-v1")).toBe(remote);
    expect(() => selectDeployment([local], "unknown")).toThrow("missing");
  });
  it("does not treat remote demo tokens as a local chain", () => {
    const chain = deploymentChain(remote);
    expect(chain.rpcUrls.default.http[0]).toBe("https://rpc.example.org/");
    expect(chain.testnet).toBe(true);
    expect(chain.nativeCurrency.symbol).toBe("TEST");
  });
  it("scopes a browser RPC override to its selected chain", () => {
    const overrides = {
      rpcURL: "https://developer-rpc.example.org/",
      chainId: remote.chainId,
    };
    expect(deploymentChain(remote, overrides).rpcUrls.default.http[0]).toBe(
      overrides.rpcURL,
    );
    expect(deploymentChain(local, overrides).rpcUrls.default.http[0]).toBe(
      local.rpcUrls[0] + "/",
    );
  });
  it("keeps native network identity separate from demo labeling", () => {
    expect(deploymentChain({ ...remote, testnet: false }).testnet).toBe(false);
    expect(
      deploymentChain(local, {
        rpcURL: "http://localhost:8546",
        chainId: 31337,
      }).rpcUrls.default.http[0],
    ).toBe("http://localhost:8546/");
    expect(() =>
      deploymentChain({
        ...remote,
        rpcUrls: ["https://user:password@rpc.example.org"],
      }),
    ).toThrow("credentials");
  });
});
