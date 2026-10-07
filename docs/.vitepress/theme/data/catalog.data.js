import { createContentLoader, createMarkdownRenderer } from "vitepress";
import path from "node:path";

export const categories = [
  "大模型基础",
  "Agent 工程",
  "RAG 与检索",
  "评测与安全",
  "后端与系统设计",
];
export function topic(url) {
  if (/javaguide\/docs\/(?!ai(?:\/|$))/.test(url)) return categories[4];
  if (/\b(rag|retrieval)\b/i.test(url)) return categories[2];
  if (/\b(safety|evaluation|eval|security)\b/i.test(url)) return categories[3];
  if (
    /\b(Foundation|Inference|FineTuning|llm-basis|training-and-data)\b/i.test(
      url,
    )
  )
    return categories[0];
  if (
    /javaguide\/docs\/(?!ai)|SystemDesign|system-design|backend|ai-infra/.test(
      url,
    )
  )
    return categories[4];
  return categories[1];
}
export function source(url) {
  const names = {
    "llm-agent-interview-guide": "LLM Agent Guide",
    zero2agent: "Zero2Agent",
    javaguide: "JavaGuide",
    "hello-agents": "Hello Agents",
    "ai-agent-interview-guide": "AI Agent Interview Guide",
    "system-design-primer": "System Design Primer",
  };
  return names[url.split("/")[2]] || "个人笔记";
}
export default createContentLoader(["materials/**/*.md", "notes/**/*.md"], {
  includeSrc: true,
  async transform(raw) {
    const markdown = await createMarkdownRenderer(path.resolve("docs"));
    const tokens = raw.map((p) => markdown.parse(p.src, {}));
    const pages = raw.map((p, i) => ({
      url: p.url.replace(/\.html$/, ""),
      title:
        p.frontmatter.title ||
        tokens[i]
          .find(
            (t, n) =>
              tokens[i][n - 1]?.type === "heading_open" &&
              tokens[i][n - 1].tag === "h1",
          )
          ?.content.replace(/[*`]/g, "") ||
        p.url.split("/").at(-1),
      category: topic(p.url),
      source: source(p.url),
      description:
        p.frontmatter.description?.slice(0, 100) ||
        tokens[i]
          .filter(
            (t, n) =>
              tokens[i][n - 1]?.type === "heading_open" &&
              tokens[i][n - 1].tag === "h2",
          )
          .map((t) =>
            t.content.replace(/^Q[：:.\s-]+/i, "").replace(/[*`]/g, ""),
          )
          .filter((t) => !/^(目录|参考|总结|Contents)/i.test(t))
          .slice(0, 2)
          .join(" · ")
          .slice(0, 90),
      collection: /\/(?:README(?:-[^/]+)?(?:\.html)?|index(?:\.html)?)?$/i.test(
        p.url,
      ),
      links: [],
    }));
    const known = new Set(pages.map((p) => p.url));
    raw.forEach((p, i) => {
      pages[i].links = tokens[i]
        .flatMap((t) => t.children || [])
        .filter((t) => t.type === "link_open")
        .flatMap((token) => {
          const link = token.attrGet("href");
          if (!link || /^(https?:|#|mailto:)/.test(link)) return [];
          let url = path.posix
            .resolve(
              p.url.endsWith("/") ? p.url : path.posix.dirname(p.url),
              link.split("#")[0],
            )
            .replace(/\.(md|html)$/, "")
            .replace(/\/index$/, "/");
          return known.has(url) && url !== pages[i].url ? [url] : [];
        })
        .filter((url, n, all) => all.indexOf(url) === n);
    });
    return pages;
  },
});
