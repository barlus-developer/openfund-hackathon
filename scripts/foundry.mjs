// Preserve native Foundry exit codes. The upstream 1.7.1 npm launcher omits child exit forwarding.
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
const require = createRequire(import.meta.url);
const [tool, ...args] = process.argv.slice(2);
if (!["forge", "anvil", "cast"].includes(tool))
  throw Error("Expected forge, anvil, or cast.");
const arch = { x64: "amd64", arm64: "arm64" }[process.arch];
if (!arch)
  throw Error(
    "Unsupported architecture; install native Foundry for this platform.",
  );
const exe = process.platform === "win32" ? `${tool}.exe` : tool;
const path = require.resolve(
  `@foundry-rs/${tool}-${process.platform}-${arch}/bin/${exe}`,
);
const child = spawn(path, args, { stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("error", (e) => {
  console.error(e);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
