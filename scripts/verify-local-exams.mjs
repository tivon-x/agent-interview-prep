import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const base = (process.argv[2] || "http://127.0.0.1:4177/agent-interview-prep/").replace(/\/?$/, "/");
const file = path.resolve(process.argv[3] || "output/private/china-mobile-questions.json");
const original = JSON.parse(await fs.readFile(file, "utf8"));
assert.equal(original.papers.reduce((n, p) => n + p.questions.length, 0), 325);
const key = "agent-interview-prep:local-exams:v1";
const out = path.resolve("output/playwright/local-exam", new Date().toISOString().replace(/[:.]/g, "-"));
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const errors = [], checks = [];
page.on("pageerror", e => errors.push(e.message));
const widget = page.locator(".local-exams");
async function importReady(p) {
  await p.waitForFunction(() => {
    const input = document.querySelector('.local-exams input[type="file"]');
    return input && !input.disabled;
  });
}
async function upload(value) {
  await importReady(page);
  await widget.getByLabel("导入本地题目文件").setInputFiles({
    name: "questions.json", mimeType: "application/json", buffer: Buffer.from(typeof value === "string" ? value : JSON.stringify(value)),
  });
}
async function open(slug = "") {
  await page.goto(base + "notes/china-mobile/" + slug);
  await widget.waitFor();
}
async function select(paper, number) {
  await widget.getByLabel("选择试卷", { exact: true }).selectOption(paper);
  await widget.getByLabel("选择原题号", { exact: true }).selectOption(String(number));
  await page.waitForFunction(([p, n]) => document.querySelector(".exam-question-label")?.textContent.includes(`${p} 卷 · 原第 ${n} 题`), [paper, number]);
}
async function check(name, fn) { await fn(); checks.push(name); console.log("PASS " + name); }

try {
  await check("cold render keeps import disabled until its handler is ready", async () => {
    const c = await browser.newContext();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    await c.route(/\/assets\/LocalExamQuestions\.[^/]+\.js$/, async route => { await gate; await route.continue(); });
    const p = await c.newPage();
    try {
      await p.goto(base + "notes/china-mobile/", { waitUntil: "commit" });
      const input = p.getByLabel("导入本地题目文件");
      await input.waitFor({ state: "attached" });
      assert.equal(await input.isDisabled(), true);
      release();
      await importReady(p);
      await input.setInputFiles(file);
      await p.locator(".exam-question").waitFor();
    } finally { release(); await c.close(); }
  });
  await check("fresh browser has import controls and no original questions", async () => {
    await open();
    assert.equal(await widget.getByLabel("导入本地题目文件").count(), 1);
    assert.equal(await widget.locator(".exam-question").count(), 0);
    assert.ok(!(await page.content()).includes(original.papers[1].questions[0].stem));
  });
  await check("one local import exposes 325 questions and survives refresh", async () => {
    const sent = [];
    const listener = r => { if (r.method() !== "GET") sent.push(r.url()); };
    page.on("request", listener);
    await upload(original);
    await widget.locator(".exam-question").waitFor();
    assert.match(await widget.innerText(), /本页可练 325 题/);
    assert.equal(await widget.getByLabel("选择试卷", { exact: true }).locator("option").count(), 4);
    assert.deepEqual(sent, []);
    page.off("request", listener);
    await page.reload();
    await widget.locator(".exam-question").waitFor();
    assert.match(await widget.innerText(), /325 题/);
    assert.equal(await widget.locator(".exam-answer").count(), 0);
    await widget.getByRole("radio").first().check();
    await widget.getByRole("button", { name: "查看答案与解析", exact: true }).click();
    assert.equal(await widget.locator(".exam-answer").count(), 1);
    await widget.getByRole("button", { name: "下一题 →", exact: true }).click();
    assert.equal(await widget.locator(".exam-answer").count(), 0);
    assert.equal(await widget.locator("input[type=radio]:checked").count(), 0);
  });
  await check("replacing a valid bank clears old choices and revealed answers", async () => {
    await select("3403", 1);
    await widget.getByRole("radio").first().check();
    await widget.getByRole("button", { name: "查看答案与解析", exact: true }).click();
    const replacement = structuredClone(original);
    replacement.papers[0].questions[0].stem = "[再次导入验证] " + replacement.papers[0].questions[0].stem;
    await upload(replacement);
    assert.equal(await widget.locator(".exam-answer").count(), 0);
    assert.equal(await widget.locator("input[type=radio]:checked").count(), 0);
    await upload(original);
  });
  await check("all eight chapters restore the bank with the correct question scope", async () => {
    for (const [slug, count, options] of [
      ["", 325, 84], ["01-reasoning", 26, 26], ["02-quantitative", 30, 30],
      ["03-technology", 22, 22], ["04-culture", 41, 6],
      ["2045-review", 78, 78], ["3307-review", 88, 88], ["number-sequences", 37, 8],
    ]) {
      await open(slug);
      await widget.locator(".exam-question").waitFor();
      assert.match(await widget.innerText(), new RegExp(`本页可练 ${count} 题`));
      assert.equal(await widget.getByLabel("选择原题号", { exact: true }).locator("option").count(), options);
    }
    await select("3308", 12);
    assert.match(await widget.locator(".exam-stem").innerText(), /11\.10/);
    assert.equal(await widget.getByLabel("选择原题号", { exact: true }).locator("option").count(), 11);
  });
  await check("errata override website answers and ambiguous questions retain their original wording", async () => {
    await open();
    for (const [paper, number, expected] of [["3403", 17, "A"], ["3403", 30, "A"], ["2045", 95, "B"], ["2045", 97, "D"], ["3307", 81, "B"], ["3307", 88, "C"]]) {
      await select(paper, number);
      await widget.getByRole("button", { name: "查看答案与解析", exact: true }).click();
      assert.match(await widget.locator(".exam-answer").innerText(), new RegExp(`复核参考：${expected}`));
    }
    await select("2045", 38);
    assert.match(await widget.locator(".exam-stem").innerText(), /173/);
    assert.ok(!(await widget.locator(".exam-stem").innerText()).includes("113"));
    await widget.getByRole("radio").nth(1).check();
    await widget.getByRole("button", { name: "查看答案与解析", exact: true }).click();
    assert.match(await widget.locator(".exam-answer").innerText(), /暂不认定唯一答案/);
  });
  await check("bad and oversized imports never destroy the existing bank", async () => {
    const variants = ["{broken", { ...original, version: 99 }];
    const mutate = fn => { const v = structuredClone(original); fn(v); variants.push(v); };
    mutate(v => v.papers[0].questions.pop());
    mutate(v => v.papers[0].questions[1].number = 1);
    mutate(v => v.papers[0].questions[0].number = 51);
    mutate(v => v.papers[0].questions[0].options[0].label = "B");
    mutate(v => v.papers[1].id = "3403");
    variants.push(" ".repeat(2 * 1024 * 1024 + 1));
    const stem = await widget.locator(".exam-stem").innerText();
    for (const v of variants) {
      await upload(v);
      await widget.getByRole("alert").waitFor();
      assert.equal(await widget.locator(".exam-stem").innerText(), stem);
    }
    assert.equal(await page.evaluate(k => JSON.parse(localStorage.getItem(k)).papers.length, key), 4);
  });
  await check("imported strings stay plain text and unknown personal fields are discarded", async () => {
    const value = structuredClone(original);
    value.papers[0].questions[0].stem = '<img src="x" onerror="window.examInjected=true">';
    value.papers[0].questions[0].user_answer = "PRIVATE";
    await upload(value);
    await select("3403", 1);
    assert.match(await widget.locator(".exam-stem").innerText(), /<img/);
    assert.equal(await widget.locator(".exam-stem img").count(), 0);
    assert.equal(await page.evaluate(() => window.examInjected), undefined);
    assert.ok(!(await page.evaluate(k => localStorage.getItem(k), key)).includes("PRIVATE"));
    await upload(original);
  });
  await check("keyboard choices and desktop, phone and dark layouts remain usable", async () => {
    await select("3308", 1);
    await widget.getByRole("radio").first().focus();
    await page.keyboard.press("Space");
    assert.equal(await widget.locator("input[type=radio]:checked").count(), 1);
    for (const [width, height] of [[1440, 1000], [375, 812], [320, 720]]) {
      await page.setViewportSize({ width, height });
      await widget.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(out, `reader-${width}.png`), fullPage: false });
    }
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.screenshot({ path: path.join(out, "reader-dark.png") });
    await page.evaluate(() => document.documentElement.classList.remove("dark"));
  });
  await check("corrupt or unavailable storage allows recovery without changing other study data", async () => {
    for (const mode of ["corrupt", "denied", "quota"]) {
      const c = await browser.newContext();
      await c.addInitScript(({ key, mode }) => {
        if (mode === "corrupt") localStorage.setItem(key, "{bad");
        else {
          const method = mode === "denied" ? "getItem" : "setItem";
          const original = Storage.prototype[method];
          Storage.prototype[method] = function(k, ...args) {
            if (k === key) throw new DOMException("storage unavailable", mode === "quota" ? "QuotaExceededError" : "SecurityError");
            return original.call(this, k, ...args);
          };
        }
      }, { key, mode });
      const p = await c.newPage();
      await p.goto(base + "notes/china-mobile/");
      const w = p.locator(".local-exams");
      await importReady(p);
      await w.getByLabel("导入本地题目文件").setInputFiles(file);
      await w.locator(".exam-question").waitFor();
      assert.match(await w.innerText(), /325 题/);
      if (mode !== "corrupt") assert.match(await w.innerText(), /未能保存/);
      await c.close();
    }
  });
  assert.deepEqual(errors, []);
  await fs.writeFile(path.join(out, "report.json"), JSON.stringify({ base, checks, errors, papers: 4, questions: 325 }, null, 2));
  console.log("Artifacts: " + out);
} catch (e) {
  await page.screenshot({ path: path.join(out, "failure.png") });
  throw e;
} finally {
  await context.tracing.stop({ path: path.join(out, "trace.zip") });
  await browser.close();
}
