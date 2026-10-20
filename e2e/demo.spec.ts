import { test, expect, type Page } from "@playwright/test";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeAbiParameters,
  keccak256,
  stringToHex,
  parseEther,
  decodeEventLog,
  zeroHash,
} from "viem";
import { anvil } from "viem/chains";
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync("deployments/official.json", "utf8")).find(
  (entry: { version: string }) => entry.version === "local-v1",
);
const abi = JSON.parse(
  readFileSync("contracts/out/OpenFund.sol/OpenFund.json", "utf8"),
).abi;
const tokenAbi = JSON.parse(
  readFileSync("contracts/out/OFLToken.sol/OFLToken.json", "utf8"),
).abi;
const rpc = "http://127.0.0.1:8545";
const client = createPublicClient({ chain: anvil, transport: http(rpc) });
const accounts = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
] as const;
let snapshot: `0x${string}`;
test.beforeEach(async () => {
  expect(await client.getChainId()).toBe(31337);
  snapshot = await client.request({ method: "evm_snapshot" } as never);
});
test.afterEach(async () => {
  await client.request({ method: "evm_revert", params: [snapshot] } as never);
});
async function harness(page: Page) {
  await page.addInitScript(
    ({ rpc, accounts }) => {
      localStorage.setItem("ofl-language", "en"); // A stale English preference must not change the Lao-only UI.
      localStorage.removeItem("ofl-draft-v1");
      let connected = sessionStorage.getItem("test-connected") === "1",
        selected = accounts[0];
      const sent: string[] = [];
      const listeners = new Map<string, Set<(...v: unknown[]) => void>>();
      const provider = {
        isMetaMask: false,
        on: (event: string, fn: (...v: unknown[]) => void) => {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event)!.add(fn);
        },
        removeListener: (event: string, fn: (...v: unknown[]) => void) =>
          listeners.get(event)?.delete(fn),
        request: async ({
          method,
          params = [],
        }: {
          method: string;
          params?: unknown[];
        }) => {
          if (method === "eth_requestAccounts") {
            connected = true;
            sessionStorage.setItem("test-connected", "1");
            return [selected];
          }
          if (method === "eth_accounts") return connected ? [selected] : [];
          if (method === "wallet_requestPermissions") {
            connected = true;
            sessionStorage.setItem("test-connected", "1");
            return [{ parentCapability: "eth_accounts" }];
          }
          if (method === "wallet_getPermissions")
            return connected ? [{ parentCapability: "eth_accounts" }] : [];
          if (method === "wallet_revokePermissions") {
            connected = false;
            return null;
          }
          if (
            method === "wallet_switchEthereumChain" ||
            method === "wallet_addEthereumChain"
          )
            return null;
          if (method === "eth_sendTransaction") sent.push(method);
          const result = await fetch(rpc, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
          }).then((r) => r.json());
          if (result.error)
            throw Object.assign(Error(result.error.message), result.error);
          return result.result;
        },
      };
      Object.assign(window, {
        testProvider: provider,
        testWallet: {
          sent,
          select: (i: number) => {
            selected = accounts[i];
            listeners.get("accountsChanged")?.forEach((fn) => fn([selected]));
          },
        },
      });
    },
    { rpc, accounts: [...accounts] },
  );
  await page.goto("/e2e.html#/manager");
  await page
    .getByRole("button", { name: "ເຊື່ອມຕໍ່ MetaMask", exact: true })
    .first()
    .click();
  await expect(page.getByText("0xf39F…2266", { exact: true })).toBeVisible();
}
test("public routes and mobile navigation read actual seeded chain state", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByText("Learning together · Vientiane", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: ".local/ux-home-desktop.png", fullPage: true });
  for (const path of [
    "/funds",
    "/funds/local-v1/3",
    "/funds/local-v1/3/donate",
    "/funds/local-v1/3/governance",
    "/funds/local-v1/3/proposals/1",
    "/funds/local-v1/3/transactions",
    "/funds/local-v1/3/payouts",
    "/funds/local-v1/3/reports",
    "/funds/local-v1/3/manage",
    "/wallet",
    "/dashboard/refunds",
    "/donations",
    "/manager",
    "/manager/funds",
    "/manager/approvals",
    "/manager/transactions",
    "/manager/funds/local-v1/3/settings",
    "/protocol",
    "/about",
    "/transactions",
  ]) {
    await page.goto("/#" + path);
    await expect(page.locator("main")).not.toBeEmpty();
    await expect(
      page.getByText("ບໍ່ສາມາດດຳເນີນການໄດ້", { exact: true }),
    ).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "ເຊື່ອມຕໍ່ MetaMask", exact: true }),
  ).toHaveCount(0);
  await page.goto("/");
  await page.getByRole("button", { name: "ເປີດເມນູ" }).click();
  await page
    .getByRole("navigation", { name: "ເມນູຫຼັກ" })
    .getByRole("link", { name: "ຄົ້ນຫາກອງທຶນ" })
    .click();
  await expect(
    page.getByRole("heading", { name: "ຄົ້ນຫາກອງທຶນ", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("browser wallet harness creates, donates once, approves, pays, reports and closes", async ({
  page,
}) => {
  await harness(page);
  await page.goto("/e2e.html#/manager/create");
  await page
    .getByLabel("ຊື່ກອງທຶນ", { exact: true })
    .fill("Browser verified education fund");
  await page
    .getByLabel("ລາຍລະອຽດສາທາລະນະ", { exact: true })
    .fill("Real on-chain browser test, snapshot isolated.");
  await page.getByLabel("ທີ່ຢູ່ຜູ້ຈັດການ", { exact: true }).fill(accounts[0]);
  await page
    .getByLabel(/ຈຸດປະສົງ ແລະເງື່ອນໄຂຖາວອນ/)
    .fill("Public education supplies; no private beneficiary data.");
  await page.getByRole("button", { name: "ຕໍ່ໄປ", exact: true }).click();
  await page.getByLabel(/ຮູບແບບການລະດົມທຶນ/).selectOption("1");
  await page.getByRole("button", { name: "ຕໍ່ໄປ", exact: true }).click();
  await page.getByLabel(/ທີ່ຢູ່ກະເປົາຜູ້ອະນຸມັດ/).fill(accounts[0]);
  await page.getByLabel(/ຈຳນວນຄົນທີ່ຕ້ອງອະນຸມັດ/).fill("1");
  await page.getByLabel(/ຈຳນວນຄົນອະນຸມັດຂັ້ນຕ່ຳຖາວອນ/).fill("1");
  await page.getByRole("button", { name: "ຕໍ່ໄປ", exact: true }).click();
  await page.getByRole("button", { name: "ຕໍ່ໄປ", exact: true }).click();
  await page
    .getByRole("button", { name: "ສ້າງກອງທຶນ · MetaMask", exact: true })
    .click();
  await expect(page).toHaveURL(/funds\/local-v1\/\d+$/);
  const fundId = BigInt(page.url().split("/").at(-1)!);
  await expect(
    page.getByRole("heading", { name: "Browser verified education fund" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/ux-manager-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "ຕັ້ງຄ່າ", exact: true }).click();
  await page
    .getByLabel("ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ", { exact: true })
    .fill("https://example.invalid/public-metadata");
  await page.getByRole("button", { name: /ບັນທຶກລິ້ງຂໍ້ມູນ/ }).click();
  await expect(page.getByText("ຢືນຢັນສຳເລັດ", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /ເບິ່ງໜ້າສະໜັບສະໜູນ/ }).click();
  await page
    .getByRole("link", { name: "ຮ່ວມສະໜັບສະໜູນ", exact: true })
    .first()
    .click();
  await page
    .getByLabel("ຈຳນວນ OFL", { exact: true })
    .fill("12.000000000000000001");
  const countBefore = await page.evaluate(
    () =>
      (window as unknown as { testWallet: { sent: string[] } }).testWallet.sent
        .length,
  );
  await page.getByRole("button", { name: /ຮ່ວມສະໜັບສະໜູນ 12/ }).click();
  await expect(
    page.getByText("ໃບຢືນຢັນການສະໜັບສະໜູນ", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testWallet: { sent: string[] } }).testWallet
          .sent.length,
    ),
  ).toBe(countBefore + 1);
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toHaveCount(0);
  await page
    .locator("main")
    .getByRole("link", { name: "ການສະໜັບສະໜູນຂອງຂ້ອຍ", exact: true })
    .click();
  await expect(
    page.locator("main article").filter({ hasText: "12.000000000000000001" }),
  ).toBeVisible();
  await page
    .locator("main article")
    .filter({ hasText: "12.000000000000000001" })
    .getByRole("link", { name: `ກອງທຶນ #${fundId}`, exact: true })
    .click();
  await page.getByRole("link", { name: /ເປີດໃນ Funding Manager/ }).click();
  await page.getByRole("link", { name: "ຈັດການກອງທຶນ", exact: true }).click();
  await page.getByLabel("ທີ່ຢູ່ຜູ້ຮັບ", { exact: true }).fill(accounts[1]);
  await page
    .getByLabel("ຈຳນວນ OFL", { exact: true })
    .fill("12.000000000000000001");
  await page
    .getByLabel("ຈຸດປະສົງ", { exact: true })
    .fill("Public books purchase");
  await page.getByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }).click();
  await expect(page.getByText("ຢືນຢັນສຳເລັດ", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ຂໍ້ສະເໜີ", exact: true }).click();
  await page
    .getByRole("link")
    .filter({ hasText: "Public books purchase" })
    .click();
  await page.getByRole("button", { name: "ອະນຸມັດ", exact: true }).click();
  await expect(page.getByText("ພ້ອມດຳເນີນການ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ດຳເນີນການ", exact: true }).click();
  await expect(page.getByText("ດຳເນີນການແລ້ວ", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ລາຍງານ", exact: true }).click();
  await page.getByLabel(/ຫົວຂໍ້ລາຍງານ/).fill("Public books receipt");
  await page
    .getByLabel(/ລິ້ງ ຫຼືລະຫັດເອກະສານ IPFS/)
    .fill("https://example.invalid/test-only-public-report");
  await page
    .getByLabel("ລະຫັດຢືນຢັນເອກະສານ", { exact: true })
    .fill(keccak256(stringToHex("Public test document")));
  await page.getByRole("button", { name: /ເຜີຍແຜ່ລາຍງານ/ }).click();
  await expect(
    page.getByRole("heading", { name: "Public books receipt", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "ຈັດການກອງທຶນ", exact: true }).click();
  await page
    .getByLabel("ສິ່ງທີ່ຕ້ອງການສະເໜີ", { exact: true })
    .selectOption("7");
  await page
    .getByLabel("ຈຸດປະສົງ", { exact: true })
    .fill("Completed education project");
  await page.getByRole("button", { name: /ສົ່ງຂໍ້ສະເໜີ/ }).click();
  await expect(page.getByText("ຢືນຢັນສຳເລັດ", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ຂໍ້ສະເໜີ", exact: true }).click();
  await page
    .getByRole("link")
    .filter({ hasText: "Completed education project" })
    .click();
  await page.getByRole("button", { name: "ອະນຸມັດ", exact: true }).click();
  await expect(page.getByText("ລໍຖ້າຄົບກຳນົດ", { exact: true })).toBeVisible();
  await client.request({
    method: "evm_increaseTime",
    params: [86400],
  } as never);
  await client.request({ method: "evm_mine", params: [] } as never);
  await page.reload();
  await expect(page.getByText("ພ້ອມດຳເນີນການ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ດຳເນີນການ", exact: true }).click();
  await expect(page.getByText("ກຳລັງປິດ", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "ຈັດການກອງທຶນ", exact: true }).click();
  await page
    .getByRole("button", {
      name: "ປິດກອງທຶນຖາວອນ",
      exact: true,
    })
    .click();
  await expect(page.getByText("ປິດແລ້ວ", { exact: true })).toBeVisible();
  expect(
    await client.readContract({
      address: d.openFundAddress,
      abi,
      functionName: "getFundBalance",
      args: [fundId],
    }),
  ).toBe(0n);
});
test("browser self-claims an expired targeted refund without approvals", async ({
  page,
}) => {
  const wallet = createWalletClient({
    account: accounts[0],
    chain: anvil,
    transport: http(rpc),
  });
  const p = {
    fundingMode: 0,
    underfundingPolicy: 0,
    recipientPolicy: 0,
    fundingGoal: parseEther("100"),
    duration: 86400n,
    threshold: 1,
    minimumApprovalThreshold: 1,
    termsHash: keccak256(stringToHex("Refund test terms")),
    manager: accounts[0],
    title: "Browser refund verification",
    summary: "Snapshot-isolated refund test.",
    category: "Healthcare",
    metadataURI: "",
    termsURI: "",
  };
  const hash = await wallet.writeContract({
    address: d.openFundAddress,
    abi,
    functionName: "createFund",
    args: [p, [accounts[0]], []],
  });
  const receipt = await client.waitForTransactionReceipt({ hash });
  const event = receipt.logs
    .map((l) => {
      try {
        return decodeEventLog({ abi, ...l });
      } catch {
        return null;
      }
    })
    .find((e) => e?.eventName === "FundCreated");
  const id = (event?.args as { fundId: bigint }).fundId;
  const donation = await wallet.writeContract({
    address: d.oflTokenAddress,
    abi: tokenAbi,
    functionName: "transferAndCall",
    args: [
      d.openFundAddress,
      parseEther("5"),
      encodeAbiParameters([{ type: "uint256" }], [id]),
    ],
  });
  await client.waitForTransactionReceipt({ hash: donation });
  await client.request({
    method: "evm_increaseTime",
    params: [86400],
  } as never);
  await client.request({ method: "evm_mine", params: [] } as never);
  await harness(page);
  await page.goto(`/e2e.html#/funds/local-v1/${id}`);
  await expect(
    page.getByText("ສາມາດຮັບເງິນຄືນ", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "ຮັບເງິນຄືນ", exact: true }).click();
  await expect(page.getByText("ຢືນຢັນສຳເລັດ", { exact: true })).toBeVisible();
  expect(
    await client.readContract({
      address: d.openFundAddress,
      abi,
      functionName: "getRefundableAmount",
      args: [id, accounts[0]],
    }),
  ).toBe(0n);
});

test("donor discovery and manager navigation stay distinct on small screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "ເຊື່ອມຕໍ່ MetaMask", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "ສ້າງກອງທຶນ", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: ".local/ux-home-mobile.png", fullPage: true });
  await page.getByLabel("ຢາກຊ່ວຍເລື່ອງໃດ?").fill("Learning together");
  await page.getByRole("button", { name: "ຄົ້ນຫາກອງທຶນ", exact: true }).click();
  await expect(page.getByLabel("ຄົ້ນຫາກອງທຶນ", { exact: true })).toHaveValue(
    "Learning together",
  );
  await expect(page.locator("article")).toHaveCount(1);
  await page
    .locator("article")
    .getByRole("link", { name: /ຮ່ວມສະໜັບສະໜູນ/ })
    .click();
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toBeVisible();
  await page.getByLabel("ຈຳນວນ OFL", { exact: true }).fill("-1");
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(
    page.getByRole("button", { name: "ເຊື່ອມຕໍ່ MetaMask", exact: true }),
  ).toBeVisible();
  await page.goto("/#/funds/create");
  await expect(page).toHaveURL(/#\/manager\/create$/);
  await page.getByRole("button", { name: "ຕໍ່ໄປ", exact: true }).click();
  await expect(page.getByLabel("ຊື່ກອງທຶນ", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.locator('a[href="#fund-title"]').click();
  await expect(page.getByLabel("ຊື່ກອງທຶນ", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "ເປີດເມນູຈັດການ" }).click();
  await page
    .getByRole("navigation", { name: "Funding Manager", exact: true })
    .getByRole("link", { name: "ກອງທຶນຂອງຂ້ອຍ", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/manager\/funds$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 812, height: 375 });
  await page.getByRole("button", { name: "ເປີດເມນູຈັດການ" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "ຂໍ້ມູນເຄືອຂ່າຍ", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/manager\/network$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
