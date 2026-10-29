export const topics = [
  "大模型基础", "Agent 工程", "RAG 与检索", "评测与安全",
  "后端与系统设计", "机器学习基础", "深度学习基础", "笔试与企业认知",
];

export const sources = [
  { id: "llm-agent-interview-guide", title: "LLM Agent Guide", root: "/materials/llm-agent-interview-guide/", entry: "/materials/llm-agent-interview-guide/README", description: "按原目录阅读大模型基础、推理、微调、RAG 与 Agent。" },
  { id: "zero2agent", title: "Zero2Agent", root: "/materials/zero2agent/", entry: "/materials/zero2agent/README", description: "按原教程阅读 Agent 基础、工程面试与 DeepSeek Harness。" },
  { id: "hello-agents", title: "Hello Agents", root: "/materials/hello-agents/", entry: "/materials/hello-agents/Extra-Chapter/readme", description: "Hello Agents 的面试总结与补充章节。" },
  { id: "ai-agent-interview-guide", title: "AI Agent Interview Guide", root: "/materials/ai-agent-interview-guide/", entry: "/materials/ai-agent-interview-guide/README", description: "保留原题库的基础、框架、工具、记忆和工程分类。" },
  { id: "javaguide", title: "JavaGuide", root: "/materials/javaguide/", entry: "/materials/javaguide/README", description: "按 Java、AI、网络、操作系统、数据库与分布式等原有目录查阅。" },
  { id: "system-design-primer", title: "System Design Primer", root: "/materials/system-design-primer/", entry: "/materials/system-design-primer/README-zh-Hans", description: "系统设计方法与本站收录的设计案例。" },
  { id: "aye10032", title: "计算机基础 · Aye10032", root: "/materials/aye10032/", entry: "/materials/aye10032/", description: "按原有目录阅读计算机网络、操作系统、计算机组成原理与数据结构。" },
  { id: "personal", title: "个人笔记", root: "/notes/", description: "ML/DL 基础、岗位笔试、项目笔记与个人补充。" },
];

// Keep browser-encoded Chinese paths and content-loader URLs comparable.
export function pagePath(url) {
  return encodeURI(decodeURI(url.split(/[?#]/)[0])).replace(/\.html$/, "").replace(/\/index$/, "/");
}

export function sourceFor(url) {
  const current = pagePath(url);
  return sources.find((s) => current.startsWith(pagePath(s.root)));
}

export const collectionRoot = (page) => page.url.replace(/(?:README(?:-[^/]+)?|index)?$/i, "");
export const collectionLinks = (page, catalog) => page.links
  .filter((url) => pagePath(url).startsWith(pagePath(collectionRoot(page))))
  .map((url) => catalog.find((p) => p.url === url))
  .filter(Boolean);

export function collectionFor(url, catalog) {
  const current = pagePath(url);
  return catalog.filter((p) => p.collection && current.startsWith(pagePath(collectionRoot(p))))
    .filter((p) => collectionLinks(p, catalog).length)
    .sort((a, b) => collectionRoot(b).length - collectionRoot(a).length)[0];
}

export function chapterList(url, catalog) {
  const own = collectionFor(url, catalog);
  if (own) {
    const chapters = collectionLinks(own, catalog);
    const root = collectionRoot(own);
    // Keep unlisted siblings reachable, with the same list on every chapter.
    const siblings = catalog.filter((p) => p.url.startsWith(root) &&
      p.url !== own.url && !chapters.some((c) => c.url === p.url) &&
      p.url.slice(root.length).split("/").filter(Boolean).length === 1);
    return [own, ...chapters, ...siblings];
  }
  const source = sourceFor(url);
  return source ? catalog.filter((p) => p.url.startsWith(source.root)) : [];
}

export function chapterTree(chapters, groups) {
  const groupFor = new Map();
  for (const group of groups) {
    for (const url of group.links) {
      if (!groupFor.has(url)) groupFor.set(url, group);
    }
  }
  const nodes = [];
  const branches = new Map();
  for (const chapter of chapters) {
    const group = groupFor.get(chapter.url);
    if (!group) {
      nodes.push(chapter);
      continue;
    }
    if (!branches.has(group)) {
      const branch = { title: group.title, children: [] };
      branches.set(group, branch);
      nodes.push(branch);
    }
    branches.get(group).children.push(chapter);
  }
  return nodes;
}
