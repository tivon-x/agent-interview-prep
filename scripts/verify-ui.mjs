import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { chromium, firefox, webkit } from "playwright";

const args = process.argv.slice(2);
const base = (
  args.includes("--url")
    ? args[args.indexOf("--url") + 1]
    : "http://127.0.0.1:4173/agent-interview-prep/"
).replace(/\/?$/, "/");
const quick = args.includes("--quick");
const run = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.resolve("output/design/verification", run);
await fs.mkdir(out, { recursive: true });
const results = [];
const errors = [];
const urls = {
  home: "",
  route: "reading-path",
  library: "library",
  reader: "materials/llm-agent-interview-guide/01-Foundation/01-Transformer",
  practice: "byte-agent/practice?q=Q001",
  project: "notes/project-defense",
  source: "sources",
  missing: "page-that-does-not-exist",
};
const storageKey = "agent-interview-prep:study:v1";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
await context.tracing.start({
  screenshots: true,
  snapshots: true,
  sources: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error" && /Hydration/i.test(message.text()))
    errors.push(message.text());
});
const manifest = {
  date: new Date().toISOString(),
  url: base,
  git: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  changes: execFileSync("git", ["status", "--short"], { encoding: "utf8" }),
  node: process.version,
  playwright: JSON.parse(
    await fs.readFile("node_modules/playwright/package.json"),
  ).version,
  chromium: browser.version(),
  platform: os.platform(),
  cpu: os.cpus()[0]?.model,
  screenshots: [],
  quick,
};
const check = async (name, fn) => {
  try {
    const checked = await fn();
    results.push({
      name,
      status: checked === false ? "not-available" : "passed",
    });
    console.log((checked === false ? "NOT AVAILABLE " : "PASS ") + name);
  } catch (e) {
    results.push({ name, status: "failed", error: e.stack });
    console.error("FAIL " + name + ": " + e.message);
    await page
      .screenshot({
        path: path.join(out, `failure-${results.length}.png`),
        fullPage: false,
      })
      .catch(() => {});
  }
};
const settle = async (p) => {
  await p.locator(".site-header").waitFor();
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(180);
};
const go = async (route) => {
  await page.goto(base + route);
  await settle(page);
};
const draft = (p) => p.locator("#answer-draft");
const expectDraft = async (p, text) => {
  await draft(p).waitFor();
  assert.equal(await draft(p).inputValue(), text);
};
const click = (label, options) =>
  page.getByRole("button", { name: label, exact: true, ...options }).click();
const snapshot = async (name, p = page) => {
  const file = name + ".png";
  await p.screenshot({ path: path.join(out, file), fullPage: false });
  manifest.screenshots.push(file);
};

await check("current tracked study content and reading anchors are preserved", async () => {
  // The old redesign snapshot predates later content edits; compare with current HEAD.
  const changed = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "docs"], { encoding: "utf8" })
    .trim().split(/\r?\n/).filter(Boolean);
  const allowed = new Set(["docs/reading-path.md", "docs/sources.md", "docs/library.md"]);
  assert.deepEqual(changed.filter(f => !f.startsWith("docs/.vitepress/") && !allowed.has(f)), []);
  const route = await fs.readFile("docs/.vitepress/dist/reading-path.html", "utf8");
  assert.ok(route.includes('id="_1-大模型与-agent-基础"'));
  assert.ok(route.includes('id="_2-rag-与-agent-工程"'));
  await fs.writeFile(path.join(out, "content-preservation.json"), JSON.stringify({
    baseline: "git HEAD", changed, allowedContentEdits: [...allowed],
    retainedLegacyAnchors: ["_1-大模型与-agent-基础", "_2-rag-与-agent-工程"]
  }, null, 2));
});
await check(
  "question chunks contain exactly 360 paired questions",
  async () => {
    const files = (await fs.readdir("docs/.vitepress/dist/assets")).filter(
      (f) => /^questions-.*\.json$/.test(f),
    );
    assert.equal(files.length, 21);
    const items = (
      await Promise.all(
        files.map((f) =>
          fs
            .readFile("docs/.vitepress/dist/assets/" + f, "utf8")
            .then(JSON.parse),
        ),
      )
    ).flat();
    assert.equal(new Set(items.map((q) => q.id)).size, 360);
    for (let n = 1; n <= 360; n++) {
      const id = `Q${String(n).padStart(3, "0")}`;
      const q = items.find((i) => i.id === id);
      assert.ok(q?.title && q.question && q.answer && q.anchor, id);
      assert.match(q.answer, /参考回答/);
    }
    await fs.writeFile(
      path.join(out, "question-manifest.json"),
      JSON.stringify(
        items.map(({ id, group, anchor }) => ({ id, group, anchor })),
        null,
        2,
      ),
    );
  },
);
await check("local links regressions and known snapshot gaps", async () => {
  const walk = async (dir) =>
    (
      await Promise.all(
        (await fs.readdir(dir, { withFileTypes: true })).map(async (entry) =>
          entry.isDirectory()
            ? walk(path.join(dir, entry.name))
            : [path.join(dir, entry.name)],
        ),
      )
    ).flat();
  const files = (await walk("docs/.vitepress/dist")).filter((f) =>
    f.endsWith(".html"),
  );
  const pages = new Map(
    await Promise.all(
      files.map(async (file) => {
        const relative = file
          .replaceAll("\\", "/")
          .split("docs/.vitepress/dist/")[1];
        return [
          decodeURI(
            new URL(
              relative === "index.html"
                ? ""
                : relative
                    .replace(/\/index\.html$/, "/")
                    .replace(/\.html$/, ""),
              base,
            ).pathname,
          ),
          await fs.readFile(file, "utf8"),
        ];
      }),
    ),
  );
  const missing = [];
  const scan = (from, html) =>
    [...html.matchAll(/href="([^"]+)"/g)].flatMap((m) => {
      if (/^(mailto:|tel:|javascript:)/.test(m[1])) return [];
      const url = new URL(m[1].replaceAll("&amp;", "&"), new URL(from, base));
      if (
        url.origin !== new URL(base).origin ||
        !url.pathname.startsWith(new URL(base).pathname) ||
        /\.(svg|png|jpg|pdf|woff2|json|css|js|txt|py)$/.test(url.pathname)
      )
        return [];
      let target = decodeURI(url.pathname).replace(/\.html$/, "");
      if (!pages.has(target) && target.endsWith("/"))
        target = target.slice(0, -1);
      const body = pages.get(target);
      let anchor;
      try {
        anchor = decodeURIComponent(url.hash.slice(1));
      } catch {
        anchor = url.hash.slice(1);
      }
      return !body ||
        (anchor && !body.includes(`id="${anchor.replaceAll('"', "&quot;")}"`))
        ? [{ from, href: m[1], target, anchor }]
        : [];
    });
  for (const [from, html] of pages) missing.push(...scan(from, html));
  const known = JSON.parse(await fs.readFile("scripts/known-link-gaps.json"));
  const sourceKey = (from) =>
    (decodeURI(from.slice(new URL(base).pathname.length)).replace(
      /\/$/,
      "/index",
    ) || "index") + ".html";
  const additions = missing.filter(
    (m) => !known.includes(sourceKey(m.from) + "|" + m.href),
  );
  await fs.writeFile(
    path.join(out, "links.json"),
    JSON.stringify({ checkedPages: pages.size, missing, additions }, null, 2),
  );
  assert.equal(additions.length, 0, JSON.stringify(additions.slice(0, 5)));
});

await check("ML/DL chapters, formulas, practice and mobile entry points", async () => {
  const folders = ["ml-basics", "dl-basics", "ml-dl-practice"];
  const routes = [];
  for (const folder of folders) {
    const files = (await fs.readdir("docs/notes/" + folder)).filter(f => f.endsWith(".md"));
    assert.equal(files.length, folder === "ml-dl-practice" ? 1 : 7);
    for (const file of files) routes.push("notes/" + folder + "/" + (file === "index.md" ? "" : file.slice(0, -3)));
  }
  for (const route of routes) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200, route);
    await settle(page);
    assert.ok(await page.locator(".reader-body h1").count(), route);
    assert.equal(await page.locator("mjx-merror").count(), 0, route);
    if (!route.endsWith("/")) {
      assert.ok(await page.locator("mjx-container").count(), route);
      assert.ok(await page.locator(".reader-body details").count() >= 3, route);
    }
  }
  await go("");
  assert.equal(await page.locator(".topic-list a").count(), 7);
  await page.locator(".topic-list a").filter({ hasText: "机器学习基础" }).click();
  await page.getByRole("heading", { name: "机器学习基础", exact: true }).waitFor();
  await page.getByRole("link", { name: "主线阅读 ↗" }).click();
  await page.locator(".reader-body h1").waitFor();
  assert.equal(await page.locator('.reader-body a[href^="./0"]').count(), 6);
  await snapshot("ml-dl-ml-index-desktop");
  await go("library?topic=" + encodeURIComponent("深度学习基础"));
  await page.getByRole("link", { name: "主线阅读 ↗" }).click();
  await page.locator(".reader-body h1").waitFor();
  assert.equal(await page.locator('.reader-body a[href^="./0"]').count(), 6);
  await go("reading-path");
  for (const folder of folders) assert.ok(await page.locator('[data-study-section=full] a[href*="/notes/' + folder + '/"]').count());
  await go("notes/ml-dl-practice/");
  const download = await page.locator('.reader-body a[href$="reference.py"]').getAttribute("href");
  const response = await page.request.get(new URL(download, page.url()).href);
  assert.equal(response.status(), 200);
  assert.ok((await response.text()).includes("def gmm_m_step"));
  await page.locator(".reader-body details summary").first().click();
  assert.ok(await page.locator(".reader-body details[open]").count());
  await snapshot("ml-dl-practice-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await snapshot("ml-dl-practice-mobile");
  for (const route of ["", "library?topic=" + encodeURIComponent("机器学习基础"), "notes/ml-basics/06-clustering-features"]) {
    await go(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, route);
  }
  await snapshot("ml-dl-gmm-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator(".DocSearch-Button").click();
  await page.locator("#localsearch-input").fill("GMM");
  await page.locator(".VPLocalSearchBox .result").first().waitFor();
  assert.match(await page.locator(".VPLocalSearchBox").innerText(), /GMM/);
  await snapshot("ml-dl-search-gmm");
  await page.keyboard.press("Escape");
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.setViewportSize({ width: 1440, height: 900 });
});

await check(
  "desktop learning route, filtering, history and project deep links",
  async () => {
    await go("");
    await page.getByRole("link", { name: "学习路线", exact: true }).first().click();
    await page.locator(".route-stations a").first().waitFor();
    assert.equal(await page.locator(".route-stations a").count(), 5);
    await click("近期安排 2026.10");
    assert.ok(await page.locator("[data-study-section=schedule]").isVisible());
    assert.match(page.url(), /view=schedule/);
    await page.goBack();
    await page.waitForTimeout(200);
    assert.ok(await page.locator("[data-study-section=full]").isVisible());
    await go("library");
    await page.getByRole("button", { name: /03 RAG 与检索/ }).click();
    await page.getByLabel("筛选当前专题").fill("no-such-material");
    await page.getByRole("heading", { name: "没有找到匹配的章节。" }).waitFor();
    await click("清空筛选 ↗");
    assert.ok(await page.locator(".library-rows a").count());
    await page.reload();
    await settle(page);
    assert.equal(
      await page.locator(".library-topic-heading h2").innerText(),
      "RAG 与检索",
    );
    await page.getByRole("link", { name: "主线阅读 ↗" }).click();
    await page.locator(".reader-body h1").waitFor();
    await page.getByRole("link", { name: "← 回到学习路线" }).click();
    await page.locator(".route-page").waitFor();
    await go("notes/project-defense#forge");
    assert.ok(await page.locator("[data-study-section=forge]").isVisible());
    assert.ok(
      !(await page.locator("[data-study-section=agentic-rag]").isVisible()),
    );
    await page
      .getByRole("button", { name: "Deep Research", exact: true })
      .click();
    await page.goBack();
    await page.waitForTimeout(200);
    assert.ok(await page.locator("[data-study-section=forge]").isVisible());
  },
);
await check(
  "catalog semantics, distinct project destinations and compact openings",
  async () => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await go("library?topic=" + encodeURIComponent("RAG 与检索"));
    const ragLinks = await page
      .locator(".library-rows a")
      .evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")));
    assert.ok(ragLinks.length > 0);
    assert.ok(
      ragLinks.every((href) => !href.includes("/database/")),
      "Backend storage and fragmentation are not RAG",
    );
    const documentTitle = await page
      .locator('.library-rows a[href$="/rag-document-processing"] h4')
      .innerText();
    assert.equal(
      documentTitle,
      "RAG 文档处理与切分策略：从解析、清洗、Chunking 到多模态内容处理",
    );
    await go("library?topic=" + encodeURIComponent("后端与系统设计"));
    assert.equal(
      await page
        .locator('.library-rows a[href$="/redis-memory-fragmentation"] h4')
        .innerText(),
      "Redis内存碎片详解",
    );
    assert.equal(
      await page
        .locator(
          '.library-rows a[href$="/some-thoughts-on-database-storage-time"]',
        )
        .count(),
      1,
    );
    await go("library");
    assert.equal(
      await page.locator(".library-section").first().locator("h3").innerText(),
      "主线章节",
    );
    assert.equal(
      await page
        .locator(".library-section")
        .first()
        .locator("h4")
        .first()
        .innerText(),
      "Transformer 架构详解",
    );
    const readme = page.locator(".library-section").filter({
      has: page.getByRole("heading", { name: "资料集入口", exact: true }),
    });
    assert.equal(
      await readme.locator('a[href$="/llm-basis/README"]').count(),
      1,
    );
    const rowCount = await page.locator(".library-rows a").count();
    assert.equal(
      await page.locator(".filter-row [role=status]").innerText(),
      `${rowCount} 篇资料`,
    );
    const geometry = [];
    for (const [name, route, selector, limit] of [
      ["route", urls.route, "[data-study-section=full] ol a", 650],
      ["library", urls.library, ".library-rows a", 650],
      [
        "project",
        urls.project,
        "[data-study-section=agentic-rag] blockquote",
        800,
      ],
      ["practice", urls.practice, ".reveal-controls .primary-button", 900],
    ]) {
      await go(route);
      await page.locator(selector).first().waitFor();
      const box = await page.locator(selector).first().boundingBox();
      assert.ok(box.y < limit, `${name} content starts at ${box.y}px`);
      if (name === "practice")
        assert.ok(
          box.y + box.height <= 900,
          "Reveal action fits the desktop viewport",
        );
      geometry.push({ name, width: 1440, box });
    }
    for (const project of ["agentic-rag", "deep-research", "forge"]) {
      await go(urls.project + "?view=" + project);
      const links = await page
        .locator(".flow-steps a")
        .evaluateAll((nodes) => nodes.map((a) => a.getAttribute("href")));
      assert.equal(new Set(links).size, 4, project);
      for (const link of links) {
        const id = decodeURIComponent(link.slice(1));
        const target = page.locator(
          `[data-study-section="${project}"] [id="${id}"]`,
        );
        assert.equal(await target.count(), 1, project + link);
      }
      assert.ok((await page.locator(".document-rail nav a").count()) > 0);
      await page.locator(".flow-steps a").first().click();
      assert.ok(
        await page.locator(`[data-study-section="${project}"]`).isVisible(),
      );
    }
    await page.setViewportSize({ width: 375, height: 812 });
    for (const [name, route, selector] of [
      ["library", urls.library, ".library-rows a"],
      ["practice", urls.practice, ".reveal-controls .primary-button"],
    ]) {
      await go(route);
      await page.locator(selector).first().waitFor();
      geometry.push({
        name,
        width: 375,
        box: await page.locator(selector).first().boundingBox(),
      });
    }
    await fs.writeFile(
      path.join(out, "opening-geometry.json"),
      JSON.stringify(geometry, null, 2),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
  },
);
await check(
  "practice answer boundaries, drafts, ratings and history",
  async () => {
    await go(urls.practice);
    await draft(page).waitFor();
    assert.equal(await page.locator(".answer-panel").count(), 0);
    assert.equal(
      await page.locator(".self-rating [aria-pressed=true]").count(),
      0,
    );
    await draft(page).fill(
      "自测草稿：结论、依据、边界 / <script>literal</script>",
    );
    await click("能讲清楚");
    await click("我答完了，对照解析 ↗");
    await page.locator(".answer-panel").waitFor();
    assert.match(await page.locator(".answer-panel").innerText(), /参考回答/);
    await click("下一题 →");
    await expectDraft(page, "");
    assert.equal(await page.locator(".answer-panel").count(), 0);
    assert.match(page.url(), /q=Q002/);
    await draft(page).fill("第二题草稿");
    await page.goBack();
    await expectDraft(
      page,
      "自测草稿：结论、依据、边界 / <script>literal</script>",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "能讲清楚", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.reload();
    await expectDraft(
      page,
      "自测草稿：结论、依据、边界 / <script>literal</script>",
    );
    assert.equal(await page.locator(".answer-panel").count(), 0);
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)),
      storageKey,
    );
    assert.equal(stored.questions.Q002.draft, "第二题草稿");
    const other = await context.newPage();
    await other.goto(base + urls.reader);
    await other.locator(".reader-body h1").waitFor();
    const stale = await context.newPage();
    await stale.goto(base + "byte-agent/practice?q=Q001");
    await draft(stale).waitFor();
    await draft(page).fill("多个标签页也保留此草稿");
    await page.waitForTimeout(350);
    await stale.getByRole("button", { name: "下一题 →" }).click();
    await stale.close();
    await other.locator(".reader-body h2").nth(1).scrollIntoViewIfNeeded();
    await other.waitForTimeout(500);
    await other.close();
    assert.equal(
      (
        await page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)),
          storageKey,
        )
      ).questions.Q001.draft,
      "多个标签页也保留此草稿",
    );
    await page
      .getByRole("combobox", { name: "专题", exact: true })
      .selectOption("C");
    await draft(page).waitFor();
    assert.match(
      await page.locator(".source-label").first().innerText(),
      /Agentic RAG/,
    );
    await page
      .getByRole("combobox", { name: "题型", exact: true })
      .selectOption("行为");
    assert.ok(
      await page
        .getByRole("heading", { name: "这个组合还没有题目。" })
        .isVisible(),
    );
    await click("重置筛选 ↗");
    await go("byte-agent/practice?q=Q999");
    await page.getByRole("heading", { name: "没有这个题号。" }).waitFor();
  },
);
await check("all question group edges and Q180/Q360 render", async () => {
  const files = (await fs.readdir("docs/.vitepress/dist/assets")).filter((f) =>
    /^questions-.*\.json$/.test(f),
  );
  const groups = await Promise.all(
    files.map((f) =>
      fs.readFile("docs/.vitepress/dist/assets/" + f, "utf8").then(JSON.parse),
    ),
  );
  const ids = [
    ...new Set([
      "Q001",
      "Q180",
      "Q360",
      ...groups.flatMap((g) => [g[0].id, g.at(-1).id]),
    ]),
  ];
  for (const id of ids) {
    await go("byte-agent/practice?q=" + id);
    await draft(page).waitFor();
    assert.equal(await page.locator(".question-id").innerText(), id);
    assert.equal(await page.locator(".answer-panel").count(), 0);
    await click("我答完了，对照解析 ↗");
    assert.match(await page.locator(".answer-panel").innerText(), /参考回答/);
    if (id === "Q360")
      assert.ok(
        await page.getByRole("button", { name: "下一题 →" }).isDisabled(),
      );
  }
});
await check("export/import validation, supplement and overwrite", async () => {
  await go(urls.practice);
  await draft(page).waitFor();
  await page.getByText("本地学习记录", { exact: true }).click();
  const downloadWait = page.waitForEvent("download");
  await click("导出备份");
  const download = await downloadWait;
  await download.saveAs(path.join(out, "backup.json"));
  const backup = JSON.parse(await fs.readFile(path.join(out, "backup.json")));
  assert.equal(backup.version, 1);
  const file = page.getByLabel("导入学习记录备份");
  const before = await draft(page).inputValue();
  await file.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  assert.equal(await draft(page).inputValue(), before);
  assert.match(await page.locator(".state-controls").innerText(), /未导入/);
  const incoming = {
    version: 1,
    focus: false,
    reading: {},
    questions: {
      Q001: { draft: "导入覆盖", rating: "需要复习", updatedAt: Date.now() },
      Q180: { draft: "补充记录", rating: null, updatedAt: Date.now() },
    },
  };
  await file.setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incoming)),
  });
  assert.equal(await draft(page).inputValue(), before);
  await page.getByRole("checkbox").check();
  await file.setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(incoming)),
  });
  await expectDraft(page, "导入覆盖");
  await page.evaluate(() => localStorage.setItem("unrelated-app", "retain"));
  await click("清除记录");
  await click("取消");
  await expectDraft(page, "导入覆盖");
  await click("清除记录");
  await click("确认删除");
  assert.equal(
    await page.evaluate(() => localStorage.getItem("unrelated-app")),
    "retain",
  );
  await expectDraft(page, "");
});
await check(
  "storage denied, corrupt and quota errors retain current input",
  async () => {
    for (const failure of ["denied", "corrupt", "quota"]) {
      const ctx = await browser.newContext();
      await ctx.addInitScript(
        ({ key, failure }) => {
          if (failure === "corrupt") localStorage.setItem(key, "{bad json");
          if (failure === "denied")
            Object.defineProperty(Storage.prototype, "getItem", {
              value() {
                throw new DOMException("Blocked", "SecurityError");
              },
            });
          if (failure !== "corrupt")
            Object.defineProperty(Storage.prototype, "setItem", {
              value() {
                throw new DOMException("Blocked", "QuotaExceededError");
              },
            });
        },
        { key: storageKey, failure },
      );
      const p = await ctx.newPage();
      await p.goto(base + urls.practice);
      await draft(p).waitFor();
      await draft(p).fill("存储失败时保留草稿");
      await p.waitForTimeout(350);
      assert.equal(await draft(p).inputValue(), "存储失败时保留草稿");
      assert.match(
        await p.locator(".answer-draft").innerText(),
        /未保存|无法读取/,
      );
      await p.getByRole("button", { name: "下一题 →" }).click();
      await draft(p).waitFor();
      await p.getByRole("button", { name: "← 上一题" }).click();
      await expectDraft(p, "存储失败时保留草稿");
      await p.screenshot({
        path: path.join(out, "storage-" + failure + ".png"),
      });
      await ctx.close();
    }
  },
);
await check("search keyboard lifecycle and plain draft input", async () => {
  await go("");
  await page.locator(".DocSearch-Button").click();
  const input = page.locator("#localsearch-input");
  await input.waitFor();
  for (const term of ["Transformer", "RAG", "Q001"]) {
    await input.fill(term);
    await page.locator(".VPLocalSearchBox .result").first().waitFor();
  }
  await input.fill("zzzzqqqqxxvvaa0987654321");
  await page.locator(".VPLocalSearchBox .no-results").waitFor();
  assert.match(
    await page.locator(".VPLocalSearchBox .no-results").innerText(),
    /没有找到相关内容/,
  );
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#localsearch-input").count(), 0);
  await page.keyboard.press("Control+k");
  await input.waitFor();
  await input.fill("Transformer");
  await page.locator(".VPLocalSearchBox .result").first().waitFor();
  await page.keyboard.press("Enter");
  await page.locator(".reader-body").waitFor();
  await go(urls.practice);
  await draft(page).waitFor();
  await draft(page).fill("");
  await draft(page).pressSequentially("/普通输入");
  assert.equal(await page.locator("#localsearch-input").count(), 0);
});
await check("reader focus position, math, code and Mermaid", async () => {
  await go(urls.reader);
  const section = page.locator(".reader-body h2").nth(1);
  await section.scrollIntoViewIfNeeded();
  const before = await section.evaluate((e) => e.getBoundingClientRect().top);
  const focusButton = await page
    .getByRole("button", { name: "专注阅读", exact: true })
    .boundingBox();
  await page.mouse.click(
    focusButton.x + focusButton.width / 2,
    focusButton.y + focusButton.height / 2,
  );
  assert.ok(
    await page
      .locator(".study-layout")
      .evaluate((e) => e.classList.contains("focus-reading")),
  );
  assert.ok(
    Math.abs(
      (await section.evaluate((e) => e.getBoundingClientRect().top)) - before,
    ) < 3,
  );
  await click("退出专注");
  assert.ok((await page.locator("mjx-container").count()) > 0);
  assert.ok((await page.locator(".vp-doc button.copy").count()) > 0);
  const recordBefore = await page.evaluate(() => scrollY);
  await page.waitForTimeout(500);
  await go("library");
  await go(urls.reader);
  await page.waitForTimeout(350);
  assert.ok(Math.abs((await page.evaluate(() => scrollY)) - recordBefore) < 16);
  const headingId = await page
    .locator(".reader-body h2")
    .nth(0)
    .getAttribute("id");
  await go(urls.reader + "#" + headingId);
  await page.waitForTimeout(350);
  assert.ok(
    await page
      .locator(".reader-body h2")
      .first()
      .evaluate((e) => e.getBoundingClientRect().top < 200),
  );
  await go("materials/llm-agent-interview-guide/04-RAG/01-RAG-Complete-Guide");
  assert.ok((await page.locator(".reader-body table").count()) > 0);
  await go("materials/zero2agent/learn-deepseek-harness/05-agent-loop/");
  await page.locator(".study-diagram").first().scrollIntoViewIfNeeded();
  await page.locator(".study-diagram svg").first().waitFor({ timeout: 30000 });
  await page.locator(".study-diagram svg").first().scrollIntoViewIfNeeded();
  await snapshot("mermaid-light");
  await click("切换深色主题");
  await page.waitForTimeout(900);
  assert.ok(await page.locator(".study-diagram svg").count());
  await page.locator(".study-diagram svg").first().scrollIntoViewIfNeeded();
  await snapshot("mermaid-dark");
  await click("切换浅色主题");
});
await check(
  "mobile navigation, focus, complete learning path and narrow edge",
  async () => {
    await page.setViewportSize({ width: 375, height: 812 });
    await go("");
    const trigger = page.getByRole("button", { name: "打开导航" });
    await trigger.click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    assert.ok(await trigger.evaluate((e) => e === document.activeElement));
    await trigger.click();
    await page
      .locator("dialog[open]")
      .getByRole("link", { name: "学习路线 ↗" })
      .click();
    await page.locator(".route-page").waitFor();
    await page.locator(".route-stations a").first().click();
    await page.locator("[data-study-section=full] ol a").first().click();
    await page.locator(".reader-body").waitFor();
    await click("本页目录");
    await page.locator("dialog[open] nav a").first().click();
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await go("notes/project-defense#deep-research");
    assert.ok(
      await page.locator("[data-study-section=deep-research]").isVisible(),
    );
    await go("byte-agent/practice?q=Q180");
    await draft(page).waitFor();
    await draft(page).fill("手机自测");
    await click("我答完了，对照解析 ↗");
    assert.ok(await page.locator(".answer-panel").isVisible());
    await page.reload();
    await expectDraft(page, "手机自测");
    await go("page-that-does-not-exist");
    await page.getByRole("heading", { name: /这一页/ }).waitFor();
    await page.getByRole("link", { name: /回到专题资料/ }).click();
    await page.locator(".library-page").waitFor();
  },
);
if (!quick) {
  await check("viewport and theme matrix, no page overflow", async () => {
    for (const [width, height] of [
      [1440, 900],
      [1280, 800],
      [768, 1024],
      [375, 812],
      [320, 740],
    ]) {
      await page.setViewportSize({ width, height });
      for (const dark of [false, true])
        for (const [name, url] of Object.entries(urls)) {
          await go(url);
          await page.evaluate(
            (dark) => document.documentElement.classList.toggle("dark", dark),
            dark,
          );
          await page.waitForTimeout(80);
          if (name === "practice") await draft(page).waitFor();
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${name} ${width} ${dark}`,
          );
          await snapshot(`${name}-${width}-${dark ? "dark" : "light"}`);
          if (name === "home" && width <= 375) {
            const cta = await page
              .getByRole("link", { name: /开始阅读|继续阅读/ })
              .boundingBox();
            assert.ok(cta.y + cta.height < height);
          }
        }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await go("");
    assert.equal(
      await page.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
      true,
    );
    await snapshot("reduced-motion");
    await page.setViewportSize({ width: 720, height: 450 });
    await go(urls.reader);
    await page.evaluate(() => (document.body.style.zoom = "2"));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await snapshot("zoom-200");
    await page.evaluate(() => (document.body.style.zoom = ""));
    const fallbackContext = await browser.newContext({
      viewport: { width: 375, height: 812 },
    });
    const fallbackPage = await fallbackContext.newPage();
    await fallbackPage.route("**/*woff2*", (r) => r.abort());
    await fallbackPage.goto(base);
    await fallbackPage.locator(".home-page").waitFor();
    assert.ok(
      await fallbackPage
        .getByRole("link", { name: /开始阅读|继续阅读/ })
        .isVisible(),
    );
    await snapshot("font-blocked", fallbackPage);
    await fallbackContext.close();
  });
  for (const [name, engine] of [
    ["firefox", firefox],
    ["webkit", webkit],
  ])
    await check(
      name + " core navigation, search, math and practice",
      async () => {
        const b = await engine.launch();
        manifest[name] = b.version();
        const p = await b.newPage({ viewport: { width: 375, height: 812 } });
        const browserErrors = [];
        p.on("pageerror", (e) => browserErrors.push(e.message));
        p.on("console", (message) => {
          if (message.type() === "error" && /Hydration/i.test(message.text()))
            browserErrors.push(message.text());
        });
        try {
          await p.goto(base);
          await p.getByRole("link", { name: /开始阅读/ }).click();
          await p.locator(".route-page").waitFor();
          await p.goto(base + urls.reader);
          await p.locator("mjx-container").first().waitFor();
          await p.locator(".DocSearch-Button").click();
          await p.locator("#localsearch-input").fill("RAG");
          await p.locator(".VPLocalSearchBox .result").first().waitFor();
          await p.keyboard.press("Escape");
          await p.goto(base + urls.practice);
          await draft(p).waitFor();
          await draft(p).fill(name + " 草稿");
          await p.getByRole("button", { name: "下一题 →" }).click();
          await p.getByRole("button", { name: "← 上一题" }).click();
          await expectDraft(p, name + " 草稿");
          await p
            .getByRole("button", { name: "我答完了，对照解析 ↗" })
            .click();
          await p.locator(".answer-panel").waitFor();
          await snapshot(name + "-practice", p);
          assert.deepEqual(browserErrors, []);
        } finally {
          await b.close();
        }
      },
    );
}
await check("browser has no uncaught errors", async () =>
  assert.deepEqual(errors, []),
);
await context.tracing.stop({ path: path.join(out, "trace.zip") });
await fs.writeFile(
  path.join(out, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
await fs.writeFile(
  path.join(out, "results.json"),
  JSON.stringify(results, null, 2),
);
await browser.close();
console.log(out);
if (results.some((r) => r.status === "failed")) process.exitCode = 1;
