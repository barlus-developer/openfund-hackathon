import { test, expect } from "@playwright/test";

test("fund interactions stay stable and donation presets work at each viewport", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/funds");
    const card = page.locator("article").first();
    await expect(card).toBeVisible();
    const before = await card.boundingBox();
    await card.hover();
    const after = await card.boundingBox();
    expect(after!.width).toBeCloseTo(before!.width, 2);
    expect(after!.height).toBeCloseTo(before!.height, 2);
    await card.getByRole("link", { name: /ຮ່ວມສະໜັບສະໜູນ/ }).click();
    const amount = page.getByLabel("ຈຳນວນ OFL", { exact: true });
    await expect(amount).toBeVisible();
    await page.getByRole("button", { name: "500 OFL", exact: true }).click();
    await expect(amount).toHaveValue("500");
    await expect(
      page.getByRole("button", { name: "500 OFL", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await amount.fill("-1");
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    await page.getByRole("button", { name: "100 OFL", exact: true }).click();
    await expect(amount).toHaveValue("100");
    await expect(amount).toHaveAttribute("aria-invalid", "false");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/motion-donation-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});

test("reduced motion removes animation and keeps navigation and focus usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const heading = page.locator(".hero-copy h1");
  await expect(heading).toBeVisible();
  expect(
    await heading.evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
  expect(
    await page
      .locator(".route-surface")
      .evaluate((node) => node.getAnimations().length),
  ).toBe(0);
  const search = page.getByLabel("ຢາກຊ່ວຍເລື່ອງໃດ?");
  await search.fill("Learning");
  await search.press("Enter");
  await expect(page.getByLabel("ຄົ້ນຫາກອງທຶນ", { exact: true })).toHaveValue(
    "Learning",
  );
  const cardLink = page
    .locator("article")
    .first()
    .getByRole("link", { name: /ຮ່ວມສະໜັບສະໜູນ/ });
  await cardLink.focus();
  await expect(cardLink).toBeFocused();
  await cardLink.press("Enter");
  await expect(page.getByLabel("ຈຳນວນ OFL", { exact: true })).toBeVisible();
  expect(
    await page
      .locator(".route-surface")
      .evaluate((node) => node.getAnimations().length),
  ).toBe(0);
});
