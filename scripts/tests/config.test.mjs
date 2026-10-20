import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { env, requiredEnv, httpURL, developmentNetwork } from "../config.mjs";

const original = { ...process.env };
afterEach(() => {
  process.env = { ...original };
});

test("loads root .env independently of the working directory and preserves shell overrides", () => {
  const root = mkdtempSync(join(tmpdir(), "openfund-config-"));
  try {
    mkdirSync(join(root, "scripts"));
    const config = join(root, "scripts/config.mjs");
    copyFileSync(new URL("../config.mjs", import.meta.url), config);
    writeFileSync(join(root, ".env"), "OPENFUND_CONFIG_TEST=file-value\n");
    const script = `import { env } from ${JSON.stringify(pathToFileURL(config).href)}; process.stdout.write(env("OPENFUND_CONFIG_TEST"));`;
    const environment = { ...process.env };
    delete environment.OPENFUND_CONFIG_TEST;
    for (const [overrides, expected] of [
      [{}, "file-value"],
      [{ OPENFUND_CONFIG_TEST: "shell-value" }, "shell-value"],
    ]) {
      const result = spawnSync(
        process.execPath,
        ["--input-type=module", "-e", script],
        {
          cwd: tmpdir(),
          env: { ...environment, ...overrides },
          encoding: "utf8",
        },
      );
      if (result.error) throw result.error;
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, expected);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("trims values, uses defaults for blanks, and names missing required settings", () => {
  process.env.DEV_RPC_URL = "  ";
  assert.equal(env("DEV_RPC_URL", "default"), "default");
  assert.throws(() => requiredEnv("DEV_RPC_URL"), /Set DEV_RPC_URL/);
  process.env.DEV_RPC_URL = " https://rpc.example.org ";
  assert.equal(requiredEnv("DEV_RPC_URL"), "https://rpc.example.org");
});

test("requires a precise chain ID and explicit testnet acknowledgement", () => {
  process.env.DEV_RPC_URL = "https://rpc.example.org";
  process.env.DEV_TESTNET = "1";
  for (const id of ["0", "-1", "1.5", "1e3", "9007199254740992", "invalid"]) {
    process.env.DEV_CHAIN_ID = id;
    assert.throws(developmentNetwork, /DEV_CHAIN_ID/);
  }
  process.env.DEV_CHAIN_ID = "11155111";
  assert.deepEqual(developmentNetwork(), {
    rpc: "https://rpc.example.org/",
    chainId: 11155111,
  });
  delete process.env.DEV_TESTNET;
  assert.throws(developmentNetwork, /DEV_TESTNET=1/);
});

test("keeps private CLI credentials separate from public browser endpoints", () => {
  const privateRPC = "https://user:secret@rpc.example.org";
  assert.equal(httpURL(privateRPC, "DEV_RPC_URL"), `${privateRPC}/`);
  for (const value of [
    privateRPC,
    "http://remote.example.org",
    "file:///etc/passwd",
    "invalid",
  ]) {
    assert.throws(
      () => httpURL(value, "BROWSER_RPC_URL", true),
      (error) => {
        assert.match(error.message, /BROWSER_RPC_URL/);
        assert(!error.message.includes(value));
        return true;
      },
    );
  }
  assert.equal(
    httpURL("http://[::1]:8545", "BROWSER_RPC_URL", true),
    "http://[::1]:8545/",
  );
});
