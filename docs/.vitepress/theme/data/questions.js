import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { createMarkdownRenderer } from "vitepress";

const root = path.resolve("docs");
export const questionFiles = [
  "byte-agent/question-bank.md",
  "byte-agent/analysis.md",
].map((f) => path.join(root, f));
let cached;
export async function loadQuestions() {
  const [bank, answers] = await Promise.all(
    questionFiles.map((f) => fs.readFile(f, "utf8")),
  );
  const hash = crypto
    .createHash("sha256")
    .update(bank + answers)
    .digest("hex")
    .slice(0, 12);
  if (cached?.hash === hash) return cached;
  const md = await createMarkdownRenderer(
    root,
    { math: true, include: { silent: true } },
    "/agent-interview-prep/",
  );
  const analysis = new Map();
  for (const m of answers.matchAll(
    /^### (Q\d{3}) (.+)\r?\n([\s\S]*?)(?=^### Q\d{3} |^## |$(?![\s\S]))/gm,
  )) {
    if (analysis.has(m[1])) throw new Error(`analysis.md: duplicate ${m[1]}`);
    analysis.set(m[1], {
      anchor: md.render(`### ${m[1]} ${m[2]}`).match(/id="([^"]+)"/)[1],
      html: md.render(m[3]),
      text: m[3],
    });
  }
  let group = "";
  const groups = new Map();
  const ids = new Set();
  const parts = bank.split(/(?=^### [A-U]\. |^- Q\d{3}【)/m);
  for (const part of parts) {
    const heading = part.match(/^### ([A-U])\. (.+)/);
    if (heading) {
      group = heading[1];
      groups.set(group, {
        label: heading[2].replace(/（\d+ 题）/, ""),
        items: [],
      });
      continue;
    }
    const m = part.match(
      /^- (Q\d{3})【([^｜]+)｜([^｜]+)｜([^】]+)】(.+)\r?\n?([\s\S]*)/,
    );
    if (!m) continue;
    if (
      !groups.has(group) ||
      ids.has(m[1]) ||
      !analysis.has(m[1]) ||
      !m[5].trim()
    )
      throw new Error(`question-bank.md: invalid or missing pair ${m[1]}`);
    ids.add(m[1]);
    // Stop at the next non-question section, retaining all nested hint lines.
    const hints = m[6].split(/^## /m)[0].trim().replace(/^  /gm, "");
    groups
      .get(group)
      .items.push({
        id: m[1],
        group,
        difficulty: m[2],
        type: m[3],
        relation: m[4],
        title: m[5],
        question: md.renderInline(m[5]),
        hints: md.render(hints),
        answer: analysis.get(m[1]).html,
        anchor: analysis.get(m[1]).anchor,
      });
  }
  const expected = Array.from(
    { length: 360 },
    (_, i) => `Q${String(i + 1).padStart(3, "0")}`,
  );
  if (
    analysis.size !== 360 ||
    ids.size !== 360 ||
    expected.some((id) => !ids.has(id))
  )
    throw new Error("360 unique questions and answers are required");
  const chunks = [...groups].map(([id, g]) => ({
    id,
    label: g.label,
    file: `assets/questions-${id}-${hash}.json`,
    items: g.items,
  }));
  cached = {
    hash,
    chunks,
    index: {
      groups: chunks.map(({ id, label, file }) => ({ id, label, file })),
      items: chunks.flatMap((g) =>
        g.items.map(({ question, hints, answer, ...summary }) => summary),
      ),
    },
  };
  return cached;
}
export function questionAssets() {
  return {
    name: "study-question-assets",
    async generateBundle() {
      for (const chunk of (await loadQuestions()).chunks)
        this.emitFile({
          type: "asset",
          fileName: chunk.file,
          source: JSON.stringify(chunk.items),
        });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.includes("/assets/questions-")) return next();
        try {
          const chunk = (await loadQuestions()).chunks.find((c) =>
            req.url.split("?")[0].endsWith("/" + c.file),
          );
          if (!chunk) return next();
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(chunk.items));
        } catch (error) {
          res.statusCode = 500;
          res.end(error.message);
        }
      });
    },
  };
}
