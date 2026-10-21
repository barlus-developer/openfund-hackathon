import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  harness,
  d,
  abi,
  tokenAbi,
  rpc,
  client,
  accounts,
} from "./fixtures";
import {
  createWalletClient,
  http,
  encodeAbiParameters,
  keccak256,
  stringToHex,
  parseEther,
  zeroHash,
} from "viem";
import { anvil } from "viem/chains";
test("manager tasks validate inputs, survive account switching, and fit mobile screens", async ({
  page,
}) => {
  await harness(page);
  await page.goto("/e2e.html#/manager/funds/local-v1/3/spending");
  await expect(page.getByLabel("ທີ່ຢູ່ຜູ້ຮັບ", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ສົ່ງຂໍ້ສະເໜີ", exact: true }).click();
  await expect(page.getByLabel("ທີ່ຢູ່ຜູ້ຮັບ", { exact: true })).toBeFocused();
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testWallet: { sent: string[] } }).testWallet
          .sent.length,
    ),
  ).toBe(0);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/manage-connected-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() =>
    (
      window as unknown as { testWallet: { select: (i: number) => void } }
    ).testWallet.select(1),
  );
  await expect(
    page.getByRole("combobox", { name: "ສິ່ງທີ່ຕ້ອງການສະເໜີ", exact: true }),
  ).toHaveValue("1");
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toHaveCount(0);
  await page
    .getByLabel("ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ", { exact: true })
    .fill(accounts[0]);
  await page.getByRole("button", { name: "ສົ່ງຂໍ້ສະເໜີ", exact: true }).click();
  await expect(
    page.getByLabel("ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testWallet: { sent: string[] } }).testWallet
          .sent.length,
    ),
  ).toBe(0);
  await page.goto("/e2e.html#/manager/funds/local-v1/3/settings");
  // Reload resets this test provider to account 0. Switch explicitly again.
  await page.evaluate(() =>
    (
      window as unknown as { testWallet: { select: (i: number) => void } }
    ).testWallet.select(1),
  );
  await expect(
    page.getByLabel("ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ", { exact: true }),
  ).toBeDisabled();
});

test("approver recovery requires the existing quorum and timelock and refreshes roles", async ({
  page,
}) => {
  await harness(page);
  await page.goto("/e2e.html#/manager/funds/local-v1/3/spending?section=team");
  await expect(
    page.getByRole("combobox", { name: "ສິ່ງທີ່ຕ້ອງການສະເໜີ" }),
  ).toBeVisible();
  await page.evaluate(() =>
    (
      window as unknown as { testWallet: { select: (i: number) => void } }
    ).testWallet.select(1),
  );
  await expect(
    page.getByRole("link", { name: "ກະເປົາ 0x7099…79C8" }).first(),
  ).toBeVisible();
  await page
    .getByLabel("ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ", { exact: true })
    .fill(accounts[1]);
  await page
    .getByLabel("ຈຸດປະສົງ", { exact: true })
    .fill("Recovery by existing approver");
  await page.getByRole("button", { name: "ສົ່ງຂໍ້ສະເໜີ", exact: true }).click();
  const review = page.getByRole("link", { name: /^ກວດສອບຂໍ້ສະເໜີ #/ });
  await expect(review).toBeVisible();
  await review.click();
  await page.getByRole("button", { name: "ອະນຸມັດ", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /ອະນຸມັດ · ອະນຸມັດແລ້ວ/ }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "ດຳເນີນການ", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() =>
    (
      window as unknown as { testWallet: { select: (i: number) => void } }
    ).testWallet.select(0),
  );
  await page.getByRole("button", { name: "ອະນຸມັດ", exact: true }).click();
  await expect(page.getByText("ລໍຖ້າຄົບກຳນົດ", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ດຳເນີນການ", exact: true }),
  ).toHaveCount(0);
  await client.request({
    method: "evm_increaseTime",
    params: [86400],
  } as never);
  await client.request({ method: "evm_mine", params: [] } as never);
  await expect(
    page.getByRole("button", { name: "ດຳເນີນການ", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: "ດຳເນີນການ", exact: true }).click();
  await expect(page.getByText("ດຳເນີນການແລ້ວ", { exact: true })).toBeVisible();
  const fund = (await client.readContract({
    address: d.openFundAddress,
    abi,
    functionName: "getFund",
    args: [3n],
  })) as { manager: string };
  expect(fund.manager.toLowerCase()).toBe(accounts[1].toLowerCase());
  const prior = (await client.readContract({
    address: d.openFundAddress,
    abi,
    functionName: "getProposal",
    args: [1n],
  })) as [unknown, number];
  expect(prior[1]).toBe(6); // Old pending payout invalidated by governance version.
  await page.getByRole("link", { name: "ຕັ້ງຄ່າ", exact: true }).click();
  await expect(
    page.getByLabel("ລິ້ງຂໍ້ມູນເພີ່ມເຕີມ", { exact: true }),
  ).toBeDisabled();
});

test("external proposals appear without a manual refresh", async ({ page }) => {
  await harness(page);
  await page.goto("/e2e.html#/manager/funds/local-v1/3/proposals");
  await expect(
    page.getByRole("link").filter({ hasText: "Books for community workshops" }),
  ).toBeVisible();
  const wallet = createWalletClient({
    account: accounts[0],
    chain: anvil,
    transport: http(rpc),
  });
  const hash = await wallet.writeContract({
    address: d.openFundAddress,
    abi,
    functionName: "createProposal",
    args: [
      3n,
      {
        kind: 1,
        target: accounts[1],
        amount: 0n,
        value: 0,
        purpose: "External proposal auto refresh",
        evidenceURI: "",
        evidenceHash: zeroHash,
      },
    ],
  });
  await client.waitForTransactionReceipt({ hash });
  await expect(
    page
      .getByRole("link")
      .filter({ hasText: "External proposal auto refresh" }),
  ).toBeVisible({ timeout: 25000 });
});

test("public and connected management pages pass automated accessibility checks", async ({
  page,
}) => {
  test.setTimeout(180000);
  await harness(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const path of [
    "/funds/local-v1/3",
    "/manager/funds/local-v1/3/spending",
    "/manager/funds/local-v1/3/spending?section=team",
    "/manager/funds/local-v1/3/settings",
    "/manager/funds/local-v1/3/reports",
    "/manager/funds/local-v1/3/proposals/1",
  ]) {
    await page.goto("/e2e.html#" + path);
    await expect(
      page.getByRole("heading", {
        name: "Learning together · Vientiane",
        exact: true,
      }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      scan.violations,
      `${path}: ${JSON.stringify(scan.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
  }
});

test("recipient rules can be removed and restored through governed proposals", async ({
  page,
}) => {
  const wallet = createWalletClient({
    account: accounts[0],
    chain: anvil,
    transport: http(rpc),
  });
  const createdHash = await wallet.writeContract({
    address: d.openFundAddress,
    abi,
    functionName: "createFund",
    args: [
      {
        fundingMode: 1,
        underfundingPolicy: 0,
        recipientPolicy: 1,
        fundingGoal: 0n,
        duration: 0n,
        threshold: 1,
        minimumApprovalThreshold: 1,
        termsHash: keccak256(stringToHex("Recipient policy browser test")),
        manager: accounts[0],
        title: "Recipient rules browser test",
        summary: "Snapshot isolated.",
        category: "Education",
        metadataURI: "",
        termsURI: "",
      },
      [accounts[0]],
      [accounts[1]],
    ],
  });
  await client.waitForTransactionReceipt({ hash: createdHash });
  const id = (await client.readContract({
    address: d.openFundAddress,
    abi,
    functionName: "fundCount",
  })) as bigint;
  await harness(page);
  await page.goto(
    `/e2e.html#/manager/funds/local-v1/${id}/spending?section=recipients`,
  );
  await expect(
    page.getByRole("heading", { name: "ຜູ້ຮັບທີ່ອະນຸຍາດ", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(accounts[1].toLowerCase(), { exact: true }),
  ).toBeVisible();
  for (const kind of ["6", "5"]) {
    const select = page.getByRole("combobox", {
      name: "ສິ່ງທີ່ຕ້ອງການສະເໜີ",
      exact: true,
    });
    await select.selectOption(kind);
    await expect(select).toHaveValue(kind);
    await page
      .getByLabel("ທີ່ຢູ່ກະເປົາທີ່ກ່ຽວຂ້ອງ", { exact: true })
      .fill(accounts[1]);
    await page
      .getByLabel("ຈຸດປະສົງ", { exact: true })
      .fill(`Recipient change ${kind}`);
    await page
      .getByRole("button", { name: "ສົ່ງຂໍ້ສະເໜີ", exact: true })
      .click();
    await page.getByRole("link", { name: /^ກວດສອບຂໍ້ສະເໜີ #/ }).click();
    await page.getByRole("button", { name: "ອະນຸມັດ", exact: true }).click();
    await expect(
      page.getByText("ລໍຖ້າຄົບກຳນົດ", { exact: true }),
    ).toBeVisible();
    await client.request({
      method: "evm_increaseTime",
      params: [86400],
    } as never);
    await client.request({ method: "evm_mine", params: [] } as never);
    await expect(
      page.getByRole("button", { name: "ດຳເນີນການ", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await page.getByRole("button", { name: "ດຳເນີນການ", exact: true }).click();
    await expect(
      page.getByText("ດຳເນີນການແລ້ວ", { exact: true }),
    ).toBeVisible();
    expect(
      await client.readContract({
        address: d.openFundAddress,
        abi,
        functionName: "isAllowedRecipient",
        args: [id, accounts[1]],
      }),
    ).toBe(kind === "5");
    await page.goto(
      `/e2e.html#/manager/funds/local-v1/${id}/spending?section=recipients`,
    );
    await expect(
      page.getByRole("heading", { name: "ຜູ້ຮັບທີ່ອະນຸຍາດ", exact: true }),
    ).toBeVisible();
    if (kind === "6")
      await expect(
        page.getByText(accounts[1].toLowerCase(), { exact: true }),
      ).toHaveCount(0);
    else
      await expect(
        page.getByText(accounts[1].toLowerCase(), { exact: true }),
      ).toBeVisible();
  }
});

test("wallet sends exact OFL amounts and rejects ordinary transfers to protected funds", async ({
  page,
}) => {
  const before = (await client.readContract({
    address: d.oflTokenAddress,
    abi: tokenAbi,
    functionName: "balanceOf",
    args: [accounts[1]],
  })) as bigint;
  await harness(page);
  await page.goto("/e2e.html#/manager/wallet?deployment=local-v1");
  await page.getByLabel("ທີ່ຢູ່ຜູ້ຮັບ", { exact: true }).fill(accounts[1]);
  await page
    .getByLabel("ຈຳນວນ OFL", { exact: true })
    .fill("1.000000000000000001");
  await page
    .getByRole("button", { name: "ໂອນ OFL ຜ່ານ MetaMask", exact: true })
    .click();
  await expect(page.getByText("ຢືນຢັນສຳເລັດ", { exact: true })).toBeVisible();
  expect(
    await client.readContract({
      address: d.oflTokenAddress,
      abi: tokenAbi,
      functionName: "balanceOf",
      args: [accounts[1]],
    }),
  ).toBe(before + 1000000000000000001n);
  const count = await page.evaluate(
    () =>
      (window as unknown as { testWallet: { sent: string[] } }).testWallet.sent
        .length,
  );
  await page
    .getByLabel("ທີ່ຢູ່ຜູ້ຮັບ", { exact: true })
    .fill(d.openFundAddress);
  await page
    .getByRole("button", { name: "ໂອນ OFL ຜ່ານ MetaMask", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("ກະລຸນາເລືອກກອງທຶນ");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { testWallet: { sent: string[] } }).testWallet
          .sent.length,
    ),
  ).toBe(count);
});

test("refund eligibility refreshes when an open fund page crosses its deadline", async ({
  page,
}) => {
  const wallet = createWalletClient({
    account: accounts[0],
    chain: anvil,
    transport: http(rpc),
  });
  const hash = await wallet.writeContract({
    address: d.openFundAddress,
    abi,
    functionName: "createFund",
    args: [
      {
        fundingMode: 0,
        underfundingPolicy: 0,
        recipientPolicy: 0,
        fundingGoal: parseEther("100"),
        duration: 86400n,
        threshold: 1,
        minimumApprovalThreshold: 1,
        termsHash: keccak256(stringToHex("Deadline refresh browser test")),
        manager: accounts[0],
        title: "Deadline refresh browser test",
        summary: "Snapshot isolated.",
        category: "Healthcare",
        metadataURI: "",
        termsURI: "",
      },
      [accounts[0]],
      [],
    ],
  });
  await client.waitForTransactionReceipt({ hash });
  const id = (await client.readContract({
    address: d.openFundAddress,
    abi,
    functionName: "fundCount",
  })) as bigint;
  const donation = await wallet.writeContract({
    address: d.oflTokenAddress,
    abi: tokenAbi,
    functionName: "transferAndCall",
    args: [
      d.openFundAddress,
      parseEther("1"),
      encodeAbiParameters([{ type: "uint256" }], [id]),
    ],
  });
  await client.waitForTransactionReceipt({ hash: donation });
  await harness(page);
  await page.goto(`/e2e.html#/funds/local-v1/${id}`);
  await expect(
    page.getByRole("heading", {
      name: "Deadline refresh browser test",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "ຮັບເງິນຄືນ", exact: true }),
  ).toHaveCount(0);
  await client.request({
    method: "evm_increaseTime",
    params: [86400],
  } as never);
  await client.request({ method: "evm_mine", params: [] } as never);
  await expect(
    page.getByRole("button", { name: "ຮັບເງິນຄືນ", exact: true }),
  ).toBeEnabled({ timeout: 25000 });
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

test("RPC errors show recovery controls and retry loads real fund data", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:8545/**", (route) =>
    route.abort("failed"),
  );
  await page.goto("/#/manager/funds/local-v1/3/spending");
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole("button", { name: "ລອງໂຫຼດໃໝ່", exact: true }),
  ).toBeEnabled();
  await page.unroute("http://127.0.0.1:8545/**");
  await page.getByRole("button", { name: "ລອງໂຫຼດໃໝ່", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Learning together · Vientiane",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
