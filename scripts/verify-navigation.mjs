import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = (process.argv[2] || "http://127.0.0.1:4173/agent-interview-prep/").replace(/\/?$/, "/");
const out = path.resolve("output/playwright/navigation", new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
const page = await context.newPage();
page.setDefaultTimeout(8000);
const results = [];
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const go = async (route) => {
  await page.goto(base + route);
  await page.locator(".site-header").waitFor();
  await page.waitForTimeout(200);
};
const chapters = () => page.locator(".chapter-rail nav a").evaluateAll((links) =>
  links.map((a) => ({ text: a.textContent.trim(), href: a.getAttribute("href") })),
);
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, status: "passed" });
    console.log("PASS " + name);
  } catch (error) {
    results.push({ name, status: "failed", error: error.stack });
    process.exitCode = 1;
    console.error("FAIL " + name + ": " + error.message);
  }
  await page.screenshot({ path: path.join(out, `${results.length}.png`) });
};

await check("library uses sources as the primary navigation", async () => {
  await go("library");
  const nav = page.getByRole("navigation", { name: "资料来源", exact: true });
  assert.equal(await nav.getByRole("button").count(), 7);
  await nav.getByRole("button", { name: /Zero2Agent/ }).click();
  assert.match(page.url(), /source=zero2agent/);
  assert.equal(await page.locator(".library-topic-heading h2").innerText(), "Zero2Agent");
  const links = await page.locator(".library-rows a").evaluateAll((es) => es.map((a) => a.getAttribute("href")));
  assert.ok(links.some((href) => href.endsWith("/learn-agent-interview/")));
  assert.ok(links.every((href) => href.includes("/materials/zero2agent/")));
  await page.reload();
  await page.getByRole("button", { name: /Zero2Agent/, pressed: true }).waitFor();
  await nav.getByRole("button", { name: /JavaGuide/ }).click();
  await page.goBack();
  await page.getByRole("button", { name: /Zero2Agent/, pressed: true }).waitFor();
  await page.locator('.desktop-nav a[href$="/library"]').click();
  await page.waitForURL(base + "library");
  await page.getByRole("button", { name: /LLM Agent Guide/, pressed: true }).waitFor();
});

await check("overview and chapters share one directory and contextual return", async () => {
  await go("notes/ml-basics/");
  await page.locator('.chapter-rail a[aria-current="page"]').waitFor();
  const overview = await chapters();
  await page.locator('.chapter-rail nav a[href$="/01-generalization"]').click();
  await page.locator('.reader-body h1').waitFor();
  assert.deepEqual(await chapters(), overview);
  assert.match(await page.locator(".rail-back").getAttribute("href"), /library\?source=personal/);
  assert.equal(await page.locator('.desktop-nav a[aria-current="page"]').innerText(), "资料库");
  assert.ok(overview.every((p) => p.href.includes("/notes/ml-basics/")));
  await page.locator('.reader-pagination a').last().click();
  await page.waitForURL(/02-evaluation$/);
  assert.deepEqual(await chapters(), overview);
  await page.locator(".rail-back").click();
  await page.getByRole("button", { name: /个人笔记/, pressed: true }).waitFor();
});

await check("every source has usable entries, a matching return and a readable mobile library", async () => {
  const sources = [
    ["llm-agent-interview-guide", "/materials/llm-agent-interview-guide/"],
    ["zero2agent", "/materials/zero2agent/"],
    ["hello-agents", "/materials/hello-agents/"],
    ["ai-agent-interview-guide", "/materials/ai-agent-interview-guide/"],
    ["javaguide", "/materials/javaguide/"],
    ["system-design-primer", "/materials/system-design-primer/"],
    ["personal", "/notes/"],
  ];
  for (const [id, root] of sources) {
    await go("library?source=" + id);
    await page.locator('.topic-nav button[aria-pressed="true"]').waitFor();
    const links = await page.locator(".library-rows a").evaluateAll((es) => es.map((a) => a.getAttribute("href")));
    assert.ok(links.length, id);
    assert.ok(links.every((href) => href.includes(root)), id);
    const overview = page.locator(".library-topic-heading .primary-button");
    if (await overview.count()) {
      await overview.click();
      await page.locator(".reader-body").waitFor();
      assert.match(await page.locator(".rail-back").getAttribute("href"), new RegExp("source=" + id));
      assert.equal(await page.locator('.desktop-nav a[aria-current="page"]').innerText(), "资料库");
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await go("library?source=zero2agent");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, "library-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("source overview and child keep source order instead of unrelated directories", async () => {
  const root = "materials/javaguide/docs/cs-basics/network/";
  await go(root + "README");
  await page.locator('.chapter-rail a[aria-current="page"]').waitFor();
  const overview = await chapters();
  assert.ok(overview.length > 5);
  assert.ok(overview.every((p) => p.href.includes("/javaguide/docs/cs-basics/network/")));
  await page.locator('.chapter-rail nav a[href$="/http-vs-https"]').click();
  await page.waitForURL(/http-vs-https$/);
  assert.deepEqual(await chapters(), overview);
  assert.equal(await page.locator('.chapter-rail [aria-current="page"]').count(), 1);
  await go("materials/zero2agent/learn-agent-interview/");
  const original = await chapters();
  assert.ok(original.some((p) => p.href.endsWith("/18-others/")));
  await page.locator('.chapter-rail nav a[href$="/18-others/"]').click();
  await page.waitForURL(/18-others\/$/);
  assert.deepEqual(await chapters(), original);
});

await check("Chinese routes, mobile directory and question section retain orientation", async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await go("materials/hello-agents/Extra-Chapter/Extra01-面试问题总结");
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  assert.equal(await page.locator('#chapter-navigation a[aria-current="page"]').count(), 1);
  assert.ok((await page.locator('#chapter-navigation nav a').count()) > 1);
  await page.keyboard.press("Escape");
  await go("byte-agent/analysis");
  await page.getByRole("button", { name: "打开导航", exact: true }).click();
  assert.equal(await page.locator('.navigation-sheet:not(.reader-sheet) a[aria-current="page"]').innerText(), "题库 ↗");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
});

await check("legacy topic links filter sources without replacing source navigation", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await go("library?topic=" + encodeURIComponent("RAG 与检索"));
  assert.equal(await page.getByLabel("按专题筛选").inputValue(), "RAG 与检索");
  const nav = page.getByRole("navigation", { name: "资料来源", exact: true });
  assert.equal(await nav.getByRole("button").count(), 7);
  assert.ok(await page.locator(".library-rows a").count());
  await page.getByLabel("筛选资料").fill("no-such-material");
  await page.getByRole("heading", { name: "没有找到匹配的章节。" }).waitFor();
  await page.getByRole("button", { name: "清空筛选 ↗", exact: true }).click();
  assert.ok(await page.locator(".library-rows a").count());
});

await check("browser has no uncaught errors", async () => assert.deepEqual(errors, []));
await context.tracing.stop({ path: path.join(out, "trace.zip") });
await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ base, results, errors }, null, 2));
await browser.close();
console.log("Artifacts: " + out);
