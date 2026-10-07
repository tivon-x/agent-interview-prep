import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] || "http://localhost:5173/agent-interview-prep/";
const out = path.resolve("output/playwright/reader-layout", new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext();
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const errors = [];
const results = [];
page.on("pageerror", (error) => errors.push(error.message));
const geometry = () => page.locator(".reader-column").evaluate((el) => {
  const box = el.getBoundingClientRect();
  return { width: box.width, center: box.x + box.width / 2 };
});
try {
  for (const width of [1920, 1440, 1280, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "materials/zero2agent/learn-agent-interview/03-fault-tolerance/");
    await page.locator(".reader-body h3").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const initial = await geometry();
    assert.ok(initial.width <= 821);
    if (width >= 1440 || width < 1200) assert.ok(Math.abs(initial.center - width / 2) < 1);
    assert.equal(await page.locator(".chapter-rail").isVisible(), width >= 1200);
    assert.equal(await page.locator(".outline-rail").isVisible(), width >= 1440);
    if (width >= 1200) assert.equal(initial.width, 820);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(out, `reader-${width}.png`) });

    for (const [label, id] of [["章节导航", "chapter-navigation"], ["本页目录", "page-outline"]]) {
      const trigger = page.getByRole("button", { name: label, exact: true });
      if (!(await trigger.isVisible())) continue;
      await trigger.click();
      const dialog = page.locator(`#${id}[open]`);
      await dialog.waitFor();
      assert.ok(await dialog.locator("nav a").count());
      assert.deepEqual(await geometry(), initial);
      await page.screenshot({ path: path.join(out, `${id}-${width}.png`) });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog[open]").count(), 0);
      assert.ok(await trigger.evaluate((el) => el === document.activeElement));
    }

    if (width < 1440) await page.getByRole("button", { name: "本页目录", exact: true }).click();
    const destination = page.locator(width >= 1440 ? ".outline-rail nav a" : "#page-outline nav a").filter({ hasText: "Agent 如何减少幻觉" }).first();
    const hash = await destination.getAttribute("href");
    await destination.click();
    await page.waitForFunction((hash) => decodeURIComponent(location.hash) === decodeURIComponent(hash), hash);
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page.waitForTimeout(200);
    const heading = page.locator(".reader-body h3").filter({ hasText: "Agent 如何减少幻觉" }).first();
    const toolbarBottom = await page.locator(".reader-tools").evaluate((el) => el.getBoundingClientRect().bottom);
    assert.ok(await heading.evaluate((el, bottom) => el.getBoundingClientRect().top >= bottom + 12, toolbarBottom));
    if (width === 1440) await page.screenshot({ path: path.join(out, "reader-question.png") });

    await page.getByRole("button", { name: "专注阅读", exact: true }).click();
    await page.getByRole("button", { name: "退出专注", exact: true }).waitFor();
    assert.equal((await geometry()).width, initial.width);
    assert.equal(await page.locator(".chapter-rail").isVisible(), false);
    assert.equal(await page.locator(".outline-rail").isVisible(), false);
    assert.equal(await page.locator(".reader-navigation").isVisible(), false);
    await page.getByRole("button", { name: "退出专注", exact: true }).click();
    await page.getByRole("button", { name: "专注阅读", exact: true }).waitFor();
    assert.equal(await page.locator(".reader-navigation").isVisible(), width < 1440);
    assert.equal(await page.locator(".chapter-rail").isVisible(), width >= 1200);
    assert.equal(await page.locator(".outline-rail").isVisible(), width >= 1440);
    await page.getByRole("button", { name: "切换深色主题" }).click();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(out, `reader-${width}-dark.png`) });
    await page.getByRole("button", { name: "切换浅色主题" }).click();
    results.push({ width, status: "passed", readingWidth: initial.width });
    console.log(`PASS reader layout, drawers, anchors and focus at ${width}px`);
  }
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  const nextChapter = page.locator("#chapter-navigation nav a").filter({ hasText: "工具" }).first();
  await nextChapter.click();
  await page.waitForURL(/02-tool-management/);
  assert.equal(await page.locator("dialog[open]").count(), 0);
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  assert.ok(await page.locator('#chapter-navigation a[aria-current="page"]').count());
  assert.deepEqual(errors, []);
} catch (error) {
  results.push({ status: "failed", error: error.stack });
  await page.screenshot({ path: path.join(out, "failure.png") });
  process.exitCode = 1;
} finally {
  await context.tracing.stop({ path: path.join(out, "trace.zip") });
  await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ base, results, errors }, null, 2));
  await browser.close();
  console.log(out);
}
