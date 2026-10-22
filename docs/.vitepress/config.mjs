import { MermaidMarkdown } from "vitepress-plugin-mermaid";
import { questionAssets } from "./theme/data/questions.js";

export default {
  title: "AI / Agent 面试复习库",
  description: "面向 AI 应用、Agent 与后端岗位的个人面试复习资料",
  lang: "zh-CN",
  base: "/agent-interview-prep/",
  head: [
    ["link", { rel: "icon", href: "/agent-interview-prep/favicon.svg" }],
    [
      "link",
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        crossorigin: "",
        href: "/agent-interview-prep/fonts/study-serif.woff2",
      },
    ],
  ],
  cleanUrls: true,
  scrollOffset: { selector: [".reader-tools", ".site-header"], padding: 24 },
  srcExclude: ["public/**"],
  lastUpdated: false,
  // Public-source snapshots contain hundreds of links to chapters not copied here.
  ignoreDeadLinks: true,
  transformHead({ page }) {
    if (page !== "404.md") return;
    return [
      [
        "script",
        {},
        `const base='/agent-interview-prep/';const path=location.pathname;if(path.startsWith(base)&&path!==base&&path.endsWith('/'))location.replace(path.slice(0,-1)+location.search+location.hash)`,
      ],
    ];
  },
  markdown: {
    math: true,
    include: { silent: true },
    config(md) {
      MermaidMarkdown(md);
      md.core.ruler.push("question-anchors", (state) => {
        state.tokens.forEach((token, index) => {
          const id =
            token.type === "inline" && token.content.match(/^(Q\d{3})【/)?.[1];
          if (!id) return;
          const item = state.tokens
            .slice(0, index)
            .findLast((t) => t.type === "list_item_open");
          item?.attrSet("id", id.toLowerCase());
        });
      });
    },
  },
  vite: {
    // Mermaid imports CommonJS fastdom from its ESM graph. Prebundle the boundary.
    optimizeDeps: {
      include: ["mermaid", "fastdom", "fastdom/extensions/fastdom-promised.js"],
    },
    plugins: [questionAssets()],
  },
  themeConfig: {
    siteTitle: "面试复习库",
    search: {
      provider: "local",
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: "搜索", buttonAriaLabel: "搜索文档" },
              modal: {
                noResultsText: "没有找到相关内容",
                resetButtonTitle: "清空搜索",
                backButtonTitle: "关闭搜索",
                footer: {
                  selectText: "选择",
                  navigateText: "切换",
                  closeText: "关闭",
                },
              },
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: "本页目录" },
    sidebarMenuLabel: "目录",
    returnToTopLabel: "回到顶部",
    docFooter: { prev: false, next: false },
    nav: [
      { text: "学习路线", link: "/reading-path" },
      { text: "资料库", link: "/library" },
      { text: "题库", link: "/byte-agent/question-bank" },
      { text: "项目笔记", link: "/notes/project-defense" },
    ],
    footer: {
      message: "个人学习资料。第三方内容版权属于原作者，详见资料索引。",
    },
  },
};
