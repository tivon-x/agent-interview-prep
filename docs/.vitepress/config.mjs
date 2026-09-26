import { defineConfig } from 'vitepress'

const materials = '/materials/'
const llmGuide = `${materials}llm-agent-interview-guide/`

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
      '/materials/llm-agent-interview-guide/': [
        { text: '阅读路线', link: '/reading-path' },
        { text: '指南总览', link: `${llmGuide}README` },
        { text: '01 基础知识', link: `${llmGuide}01-Foundation/`, collapsed: true, items: [
          { text: 'Transformer', link: `${llmGuide}01-Foundation/01-Transformer` },
          { text: 'Tokenization', link: `${llmGuide}01-Foundation/02-Tokenization` },
          { text: 'Loss 与优化', link: `${llmGuide}01-Foundation/03-Loss-And-Optimization` },
        ] },
        { text: '02 推理优化', link: `${llmGuide}02-Inference/`, collapsed: true, items: [
          { text: 'KV Cache 与推理加速', link: `${llmGuide}02-Inference/01-KVCache-And-Acceleration` },
          { text: '解码策略', link: `${llmGuide}02-Inference/02-Decoding-Strategies` },
          { text: '量化与部署', link: `${llmGuide}02-Inference/03-Quantization-And-Deployment` },
        ] },
        { text: '03 微调与对齐', link: `${llmGuide}03-FineTuning/`, collapsed: true, items: [
          { text: 'PEFT', link: `${llmGuide}03-FineTuning/01-PEFT` },
          { text: '对齐训练', link: `${llmGuide}03-FineTuning/02-Alignment` },
          { text: '指令微调', link: `${llmGuide}03-FineTuning/03-Instruction-Tuning` },
        ] },
        { text: '04 RAG', link: `${llmGuide}04-RAG/`, collapsed: true, items: [
          { text: 'RAG 完整指南', link: `${llmGuide}04-RAG/01-RAG-Complete-Guide` },
        ] },
        { text: '05 Agent', link: `${llmGuide}05-Agent/`, collapsed: true, items: [
          { text: 'Agent 完整指南', link: `${llmGuide}05-Agent/01-Agent-Complete-Guide` },
        ] },
        { text: '06 安全与评估', link: `${llmGuide}06-Safety-Evaluation/`, collapsed: true, items: [
          { text: '安全与评估', link: `${llmGuide}06-Safety-Evaluation/01-Safety-And-Evaluation` },
        ] },
        { text: '07 前沿热点', link: `${llmGuide}07-HotTopics/`, collapsed: true, items: [
          { text: '2025–2026 前沿热点', link: `${llmGuide}07-HotTopics/01-Hot-Topics-2025-2026` },
        ] },
        { text: '08 手撕代码', link: `${llmGuide}08-Coding/`, collapsed: true, items: [
          { text: '大模型手撕代码题', link: `${llmGuide}08-Coding/01-Coding-Problems` },
        ] },
        { text: '09 系统设计', link: `${llmGuide}09-SystemDesign/`, collapsed: true, items: [
          { text: '大模型系统设计', link: `${llmGuide}09-SystemDesign/01-System-Design` },
        ] },
        { text: '10 大厂真题', link: `${llmGuide}10-RealQuestions/`, collapsed: true, items: [
          { text: '字节跳动面试题', link: `${llmGuide}10-RealQuestions/01-ByteDance-Questions` },
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
