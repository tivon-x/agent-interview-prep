import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { sources } from "../docs/.vitepress/theme/data/navigation.js";

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

const sourceFilter = () => page.getByRole("combobox", { name: "资料来源", exact: true });

await check("library starts with all sources and retains the selected source in history", async () => {
  await go("library");
  assert.equal(await sourceFilter().inputValue(), "");
  assert.equal(await sourceFilter().locator("option").count(), sources.length + 1);
  assert.equal(await page.locator(".library-rows a").count(), sources.length);
  await page.locator('.library-rows a[href$="source=zero2agent"]').click();
  await page.waitForURL(/source=zero2agent/);
  assert.match(page.url(), /source=zero2agent/);
  assert.equal(await page.locator(".library-topic-heading h2").innerText(), "Zero2Agent");
  const links = await page.locator(".library-rows a").evaluateAll((es) => es.map((a) => a.getAttribute("href")));
  assert.ok(links.some((href) => href.endsWith("/learn-agent-interview/")));
  assert.ok(links.every((href) => href.includes("/materials/zero2agent/")));
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#library-source")?.value === "zero2agent");
  await sourceFilter().selectOption("javaguide");
  await page.goBack();
  await page.waitForFunction(() => document.querySelector("#library-source")?.value === "zero2agent");
  await page.locator('.desktop-nav a[href$="/library"]').click();
  await page.waitForURL(base + "library");
  await page.waitForFunction(() => document.querySelector("#library-source")?.value === "");
  assert.equal(await page.locator(".library-rows a").count(), sources.length);
});

await check("mobile can reach a company preparation page in two taps", async () => {
  await page.setViewportSize({ width: 375, height: 812 });
  await go("");
  await page.locator(".home-page").getByRole("link", { name: /^(全部)?岗位专项/ }).click();
  await page.getByRole("heading", { name: "岗位专项", exact: true }).waitFor();
  await page.getByRole("link", { name: /AI 应用开发/ }).click();
  await page.waitForURL(/notes\/cmb-ai\/$/);
  await page.getByRole("heading", { name: /招商银行上海分行 AI 应用开发一面准备/ }).waitFor();
  await page.getByRole("link", { name: /岗位专项.*招商银行/ }).filter({ visible: true }).click();
  await page.waitForURL(/\/preparations$/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("home resumes the latest saved practice answer", async () => {
  for (const [id, draft] of [["Q001", "第一题草稿"], ["Q002", "练习草稿保留"]]) {
    await go("byte-agent/practice?q=" + id);
    await page.getByLabel("用自己的话回答").fill(draft);
    await page.waitForFunction(({ id, draft }) =>
      JSON.parse(localStorage.getItem("agent-interview-prep:study:v1"))?.questions[id]?.draft === draft,
    { id, draft });
  }
  await go("");
  await page.getByRole("link", { name: /继续练习/ }).click();
  await page.waitForURL(/q=Q002/);
  const answer = page.getByLabel("用自己的话回答");
  await answer.waitFor();
  assert.equal(await answer.inputValue(), "练习草稿保留");
});

await check("overview and chapters share one directory and contextual return", async () => {
  await go("notes/ml-basics/");
  await page.locator('.chapter-rail a[aria-current="page"]').waitFor();
  const overview = await chapters();
  await page.locator('.chapter-rail nav a[href$="/01-generalization"]').click();
  await page.locator('.reader-body h1').filter({ hasText: "泛化" }).waitFor();
  assert.deepEqual(await chapters(), overview);
  assert.match(await page.locator(".rail-back").getAttribute("href"), /library\?source=personal/);
  assert.equal(await page.locator('.desktop-nav a[aria-current="page"]').innerText(), "资料库");
  assert.ok(overview.every((p) => p.href.includes("/notes/ml-basics/")));
  await page.locator('.reader-pagination a').last().click();
  await page.waitForURL(/02-evaluation$/);
  await page.locator('.chapter-rail a[aria-current="page"][href$="/02-evaluation"]').waitFor();
  assert.deepEqual(await chapters(), overview);
  await page.locator(".rail-back").click();
  await page.waitForFunction(() => document.querySelector("#library-source")?.value === "personal");
});

await check("every source has usable entries, a matching return and a readable mobile library", async () => {
  for (const { id, root } of sources) {
    await go("library?source=" + id);
    await page.waitForFunction((id) => document.querySelector("#library-source")?.value === id, id);
    const links = await page.locator(".library-rows a").evaluateAll((es) => es.map((a) => a.getAttribute("href")));
    assert.ok(links.length, id);
    assert.ok(links.every((href) => href.includes(root)), id);
    const overview = page.getByRole("link", { name: "原资料总览 →", exact: true });
    if (await overview.count()) {
      await overview.click();
      await page.locator(".reader-body").waitFor();
      assert.match(await page.locator(".rail-back").getAttribute("href"), new RegExp("source=" + id));
      assert.equal(await page.locator('.desktop-nav a[aria-current="page"]').innerText(), "资料库");
    }
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await go("library");
  await page.getByLabel("筛选资料").fill("招商银行");
  const first = page.locator(".library-rows a").first();
  await first.waitFor();
  assert.match(await first.innerText(), /招商银行/);
  const bounds = await first.boundingBox();
  assert.ok(bounds.y + bounds.height <= 812);
  await sourceFilter().selectOption("zero2agent");
  await page.getByRole("heading", { name: "没有找到匹配的章节。" }).waitFor();
  await page.getByRole("button", { name: "清空筛选", exact: true }).click();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, "library-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("computer science books retain all chapters, images, math and source navigation", async () => {
  await go("library?source=aye10032");
  assert.equal(await page.locator(".library-rows a").count(), 4);
  const assets = new Set();
  const documents = new Map();
  for (const [book, title, count] of [
    ["network", "计算机网络笔记", 31],
    ["os", "操作系统笔记", 20],
    ["organization", "计算机组成原理笔记", 33],
    ["data-structure", "数据结构笔记", 10],
  ]) {
    await go(`materials/aye10032/${book}/README`);
    await page.locator(".reader-body h1").filter({ hasText: title }).waitFor();
    const overview = await chapters();
    assert.equal(overview.length, count, book);
    for (const chapter of overview) {
      const response = await context.request.get(new URL(chapter.href, base).href);
      assert.equal(response.status(), 200, chapter.href);
      const html = await response.text();
      const body = await page.evaluate((html) => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        const body = doc.querySelector(".reader-body");
        return {
          text: body?.textContent,
          mathErrors: body?.querySelectorAll('mjx-merror, [data-mjx-error], [data-mml-node="merror"]').length,
          images: [...(body?.querySelectorAll("img") || [])].map((img) => img.getAttribute("src")),
          links: [...(body?.querySelectorAll("a[href]") || [])].map((a) => a.getAttribute("href")),
          ids: [...(body?.querySelectorAll("[id]") || [])].map((el) => el.id),
        };
      }, html);
      assert.ok(body.text?.trim(), chapter.href);
      assert.ok(!body.text.includes("{%"), chapter.href);
      assert.equal(body.mathErrors, 0, chapter.href);
      documents.set(new URL(chapter.href, base).pathname, body);
      for (const image of body.images) {
        if (image.startsWith("data:")) assert.match(image, /^data:image\//);
        else assets.add(image);
      }
    }
    const groups = page.locator(".chapter-rail details");
    if (await groups.count()) await groups.last().locator("summary").click();
    await page.locator(".chapter-rail nav a").last().click();
    await page.waitForURL(new URL(overview.at(-1).href, base).href);
    await page.locator('.chapter-rail a[aria-current="page"]').waitFor();
    assert.deepEqual(await chapters(), overview);
    assert.match(await page.locator(".rail-back").getAttribute("href"), /source=aye10032/);
  }
  for (const [pathname, body] of documents) {
    for (const href of body.links) {
      const url = new URL(href, new URL(pathname, base));
      if (url.origin !== new URL(base).origin || !url.pathname.includes("/materials/aye10032/")) continue;
      const target = documents.get(url.pathname.replace(/\.html$/, ""));
      assert.ok(target, pathname + " -> " + href);
      if (url.hash) assert.ok(target.ids.includes(decodeURIComponent(url.hash.slice(1))), pathname + " -> " + href);
    }
  }
  assert.ok(assets.size > 200, "local illustrations are included");
  for (const asset of assets) {
    const response = await context.request.get(new URL(asset, base).href);
    assert.equal(response.status(), 200, asset);
    assert.match(response.headers()["content-type"], /^image\//, asset);
  }
  console.log(`Verified 94 book pages and ${assets.size} illustration URLs`);
  await page.screenshot({ path: path.join(out, "computer-science.png") });
});

await check("computer science search and mobile reading work", async () => {
  await go("materials/aye10032/network/README");
  await page.locator(".DocSearch-Button").click();
  await page.locator("#localsearch-input").fill("计算机网络体系结构与参考模型");
  const result = page.locator('.VPLocalSearchBox a[href*="/1.2-ji-suan-ji-wang-luo-ti-xi-jie-gou-yu-can-kao-mo-xing"]').first();
  await result.waitFor();
  await result.click();
  await page.locator(".reader-body h1").filter({ hasText: "体系结构与参考模型" }).waitFor();
  const image = page.locator(".reader-body img").first();
  await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const image = document.querySelector(".reader-body img");
    return image?.complete && image.naturalWidth > 0;
  });
  await page.setViewportSize({ width: 375, height: 812 });
  await go("materials/aye10032/organization/di-er-zhang-shu-ju-de-biao-shi-he-yun-suan/2.2-ding-dian-shu-de-biao-shi-yu-yun-suan");
  assert.ok(await page.locator(".reader-body mjx-container").count());
  assert.ok(await page.locator(".reader-body .custom-block.warning").count());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  assert.equal(await page.locator('#chapter-navigation a[aria-current="page"]').count(), 1);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: path.join(out, "computer-science-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("chapter groups fold, reveal the current page and keep reading order on desktop and mobile", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const root = "materials/aye10032/network/";
  const tcp = root + "di-wu-zhang-chuan-shu-ceng/5.3-tcp-xie-yi";
  const dns = root + "di-liu-zhang-ying-yong-ceng/6.2-yu-ming-xi-tong-dns";
  await go(tcp);
  const rail = page.locator(".chapter-rail");
  assert.equal(await rail.locator("details").count(), 7);
  const transport = rail.locator("details").filter({ has: page.locator("summary", { hasText: "第五章 传输层" }) });
  assert.equal(await transport.getAttribute("open"), "");
  assert.equal(await transport.locator("a").count(), 3);
  await transport.locator("summary").click();
  assert.equal(await transport.locator('a[aria-current="page"]').isVisible(), false);
  await transport.locator("summary").focus();
  await page.keyboard.press("Enter");
  await transport.locator('a[aria-current="page"]').waitFor();
  await page.screenshot({ path: path.join(out, "chapter-groups-desktop.png") });
  await page.locator(".reader-pagination a").last().click();
  await page.waitForURL(/6\.1-wang-luo-ying-yong-mo-xing$/);
  await rail.locator('details[open] a[aria-current="page"][href$="/6.1-wang-luo-ying-yong-mo-xing"]').waitFor();
  assert.match(await rail.locator("details[open] summary").innerText(), /第六章 应用层/);
  await page.reload();
  await rail.locator('details[open] a[aria-current="page"]').waitFor();
  for (const [book, count] of [["os", 6], ["organization", 7], ["data-structure", 0]]) {
    await go(`materials/aye10032/${book}/README`);
    assert.equal(await rail.locator("details").count(), count, book);
    assert.ok(!(await rail.innerText()).includes("<a"));
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await go(tcp);
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  const sheet = page.locator("#chapter-navigation");
  assert.equal(await sheet.locator("details").count(), 7);
  await sheet.locator('details[open] a[aria-current="page"][href$="/5.3-tcp-xie-yi"]').waitFor();
  const application = sheet.locator("details").filter({ has: page.locator("summary", { hasText: "第六章 应用层" }) });
  await application.locator("summary").click();
  await application.locator('a[href$="/6.2-yu-ming-xi-tong-dns"]').click();
  await page.waitForURL(base + dns);
  assert.equal(await sheet.isVisible(), false);
  await page.getByRole("button", { name: "章节导航", exact: true }).click();
  await sheet.locator('details[open] a[aria-current="page"][href$="/6.2-yu-ming-xi-tong-dns"]').waitFor();
  assert.match(await sheet.locator("details[open] summary").innerText(), /第六章 应用层/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(out, "chapter-groups-mobile.png") });
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check("source overview and child keep source order instead of unrelated directories", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const root = "materials/javaguide/docs/cs-basics/network/";
  await go(root + "README");
  await page.locator('.chapter-rail a[aria-current="page"]').waitFor();
  const overview = await chapters();
  assert.ok(overview.length > 5);
  assert.ok(overview.every((p) => p.href.includes("/javaguide/docs/cs-basics/network/")));
  await page.locator('.chapter-rail nav a[href$="/http-vs-https"]').click();
  await page.waitForURL(/http-vs-https$/);
  await page.locator('.chapter-rail a[aria-current="page"][href$="/http-vs-https"]').waitFor();
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
  assert.equal(await page.locator('.navigation-sheet:not(.reader-sheet) a[aria-current="page"]').innerText(), "题库 →");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
});

await check("legacy topic links filter sources without replacing source navigation", async () => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await go("library?topic=" + encodeURIComponent("RAG 与检索"));
  assert.equal(await page.getByLabel("按专题筛选").inputValue(), "RAG 与检索");
  assert.equal(await sourceFilter().inputValue(), "");
  assert.ok(await page.locator(".library-rows a").count());
  await page.getByLabel("筛选资料").fill("no-such-material");
  await page.getByRole("heading", { name: "没有找到匹配的章节。" }).waitFor();
  await page.getByRole("button", { name: "清空筛选", exact: true }).click();
  assert.ok(await page.locator(".library-rows a").count());
});

await check("browser has no uncaught errors", async () => assert.deepEqual(errors, []));
await context.tracing.stop({ path: path.join(out, "trace.zip") });
await fs.writeFile(path.join(out, "results.json"), JSON.stringify({ base, results, errors }, null, 2));
await browser.close();
console.log("Artifacts: " + out);
