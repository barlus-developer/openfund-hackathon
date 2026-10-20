import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:5180",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "VITE_DEFAULT_DEPLOYMENT=local-v1 VITE_RPC_URL=http://127.0.0.1:8545 npm run dev -w app -- --port 5180 --strictPort",
    url: "http://127.0.0.1:5180",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
