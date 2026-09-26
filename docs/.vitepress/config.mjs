import { defineConfig } from 'vitepress'

const materials = '/materials/'

export default defineConfig({
  title: 'AI / Agent 面试复习库',
  description: '面向 AI 应用、Agent 与后端岗位的个人面试复习资料',
  lang: 'zh-CN',
  base: '/agent-interview-prep/',
  head: [['link', { rel: 'icon', href: '/agent-interview-prep/favicon.svg' }]],
  cleanUrls: true,
  lastUpdated: false,
  // Public-source snapshots contain hundreds of links to chapters not copied here.
  ignoreDeadLinks: true,
  transformHead({ page }) {
    if (page !== '404.md') return
    return [['script', {}, `const base='/agent-interview-prep/';const path=location.pathname;if(path.startsWith(base)&&path!==base&&path.endsWith('/'))location.replace(path.slice(0,-1)+location.search+location.hash)`]]
  },
  markdown: {
    math: true,
    include: { silent: true },
  },
  themeConfig: {
    siteTitle: '面试复习库',
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '没有找到相关内容',
                resetButtonTitle: '清空搜索',
                backButtonTitle: '关闭搜索',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },
    outline: { level: [2, 3], label: '本页目录' },
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    docFooter: { prev: false, next: false },
    nav: [
      { text: '首页', link: '/' },
      { text: '① 读资料', link: '/reading-path' },
      { text: '② 做 360 题', link: '/byte-agent/question-bank' },
      { text: '③ 看解析', link: '/byte-agent/analysis' },
      { text: '资料来源', link: '/sources' },
    ],
    sidebar: {
      '/byte-agent/': [
        { text: '第一阶段', items: [
          { text: '资料阅读路线', link: '/reading-path' },
        ] },
        { text: '第二阶段 · 360 题', items: [
          { text: '360 题题库', link: '/byte-agent/question-bank' },
        ] },
        { text: '第三阶段 · 对照解析', items: [
          { text: '逐题解析', link: '/byte-agent/analysis' },
          { text: '冲刺安排', link: '/byte-agent/review-plan' },
        ] },
      ],
      '/notes/': [
        { text: '资料阅读', items: [
          { text: '阅读路线', link: '/reading-path' },
          { text: '项目深挖', link: '/notes/project-defense' },
          { text: '前沿技术', link: '/notes/frontier' },
          { text: '后端检查表', link: '/notes/backend-checklist' },
        ] },
      ],
      '/materials/': [
        { text: '从这里开始', items: [
          { text: '资料阅读路线', link: '/reading-path' },
        ] },
        { text: 'AI / Agent 资料', items: [
          { text: 'LLM Agent Guide', link: `${materials}llm-agent-interview-guide/README` },
          { text: 'Agent 基础', link: `${materials}zero2agent/learn-agent-basic/` },
          { text: 'Agent 工程面试', link: `${materials}zero2agent/learn-agent-interview/` },
          { text: 'Agent Harness', link: `${materials}zero2agent/learn-deepseek-harness/` },
          { text: 'Hello Agents 真题', link: `${materials}hello-agents/Extra-Chapter/Extra01-面试问题总结` },
          { text: 'AI Agent 分类题库', link: `${materials}ai-agent-interview-guide/docs/01-面试八股文/README` },
        ] },
        { text: '后端 / 系统设计', items: [
          { text: 'JavaGuide AI', link: `${materials}javaguide/docs/ai/README` },
          { text: '网络', link: `${materials}javaguide/docs/cs-basics/network/README` },
          { text: '操作系统', link: `${materials}javaguide/docs/cs-basics/operating-system/README` },
          { text: 'MySQL', link: `${materials}javaguide/docs/database/mysql/README` },
          { text: 'Redis', link: `${materials}javaguide/docs/database/redis/README` },
          { text: '分布式', link: `${materials}javaguide/docs/distributed-system/README` },
          { text: 'System Design Primer', link: `${materials}system-design-primer/README-zh-Hans` },
        ] },
      ],
    },
    footer: {
      message: '个人学习资料。第三方内容版权属于原作者，详见资料索引。',
    },
  },
})
