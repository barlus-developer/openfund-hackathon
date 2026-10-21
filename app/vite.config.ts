import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { loadEnv } from "vite";
import { readAppConfig } from "./src/config.ts";
import {
  deploymentChain,
  selectDeployment,
  type Deployment,
} from "./src/web3/network.ts";
import deployments from "./src/web3/generated/deployments.json" with { type: "json" };

const envDir = fileURLToPath(new URL("..", import.meta.url));
export default defineConfig(({ mode }) => {
  const settings = readAppConfig(loadEnv(mode, envDir, "VITE_"));
  const selected = selectDeployment(
    deployments as Deployment[],
    settings.defaultDeployment,
  );
  for (const deployment of deployments)
    deploymentChain(deployment as Deployment, {
      rpcURL: settings.rpcURL,
      chainId: selected?.chainId,
    });
  return {
    base: "./",
    envDir,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    test: {
      environment: "jsdom",
      // Each UI file creates a full DOM; bound workers to keep interaction tests reliable on CI/dev laptops.
      maxWorkers: 2,
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
    },
  };
});
