<script setup>
import { computed, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { study } from "../study-state.js";
import { data as catalog } from "../data/catalog.data.js";
const ready = ref(false);
onMounted(() => {
  ready.value = true;
});
const latest = computed(() =>
  ready.value
    ? Object.entries(study.data.reading)
        .filter(([url]) => catalog.some((p) => withBase(p.url) === url))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]
    : undefined,
);
const continueTitle = computed(
  () => catalog.find((p) => withBase(p.url) === latest.value?.[0])?.title,
);
const stages = [
  {
    n: "01",
    title: "建立理解",
    text: "从 Transformer 到 Agent Loop，先把机制读懂，再把知识串起来。",
    link: "/reading-path",
    label: "沿路线阅读",
    note: "原理 · 工程 · 系统",
  },
  {
    n: "02",
    title: "留下证据",
    text: "回到真实项目，核对设计取舍、失败处理与可讲的边界。",
    link: "/notes/project-defense",
    label: "回看个人项目",
    note: "RAG · Research · Forge",
  },
  {
    n: "03",
    title: "说出自己的话",
    text: "闭卷作答，再对照解析。看过不等于掌握，能讲清才有意义。",
    link: "/byte-agent/practice?q=Q001",
    label: "进入闭卷练习",
    note: "360 题 · 个人自测",
  },
];
const topics = [
  "大模型基础",
  "Agent 工程",
  "RAG 与检索",
  "评测与安全",
  "后端与系统设计",
];
const href = withBase;
</script>
<template>
  <div class="home-page work-page">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow">
          <span class="edition-dot"></span> 2027 校招 / AI & AGENT ENGINEERING
        </p>
        <h1 id="home-title">
          把原理<em>读懂，</em><br />把项目<em>讲清。</em>
        </h1>
        <p class="hero-intro">
          一份可以反复读、认真想、闭卷练的学习手册。<br
            class="desktop-break"
          />让零散的知识，长成自己的判断。
        </p>
        <a
          class="primary-button"
          :href="
            latest
              ? latest[0] + (latest[1].anchor ? '#' + latest[1].anchor : '')
              : href('/reading-path')
          "
          >{{ latest ? "继续阅读" : "开始阅读" }}
          <span aria-hidden="true">↗</span></a
        >
        <p class="hero-scope"><span>5 个专题</span><span>3 个个人项目</span><span>360 道自测题</span></p>
        <p class="continue-note">
          {{ continueTitle || "从基础出发，沿着知识线索向前。" }}
        </p>
      </div>
      <nav class="learning-outline" aria-label="学习线索">
        <div class="outline-heading">
          <p class="eyebrow">学习线索</p>
          <span>从理解到表达</span>
        </div>
        <a class="outline-step" :href="href('/library?topic=' + encodeURIComponent('大模型基础'))">
          <span class="outline-number">01</span>
          <div><small>理解机制</small><strong>大模型基础</strong><p>Transformer · 推理 · 对齐</p></div>
          <span class="outline-arrow" aria-hidden="true">↗</span>
        </a>
        <a class="outline-step" :href="href('/library?topic=' + encodeURIComponent('Agent 工程'))">
          <span class="outline-number">02</span>
          <div><small>连接能力</small><strong>Agent 与 RAG</strong><p>模型循环 · 工具调用 · 检索</p></div>
          <span class="outline-arrow" aria-hidden="true">↗</span>
        </a>
        <a class="outline-step" :href="href('/notes/project-defense')">
          <span class="outline-number">03</span>
          <div><small>回到实践</small><strong>取舍与证据</strong><p>真实项目 · 失败处理 · 能力边界</p></div>
          <span class="outline-arrow" aria-hidden="true">↗</span>
        </a>
        <a class="outline-step outline-practice" :href="href('/byte-agent/practice?q=Q001')">
          <span class="outline-number">04</span>
          <div><small>形成表达</small><strong>合上资料，再回答</strong><p>360 道题，检验自己的理解</p></div>
          <span class="outline-arrow" aria-hidden="true">↗</span>
        </a>
      </nav>
    </section>
    <section class="learning-stages" aria-label="学习方法">
      <a
        v-for="stage in stages"
        :key="stage.n"
        :href="href(stage.link)"
        class="stage-row"
        ><span class="stage-number">{{ stage.n }}</span>
        <div>
          <span class="stage-note">{{ stage.note }}</span>
          <h3>{{ stage.title }}</h3>
          <p>{{ stage.text }}</p>
        </div>
        <span class="stage-action"
          >{{ stage.label }} <span aria-hidden="true">↗</span></span
        ></a
      >
    </section>
    <section class="home-library">
      <div class="section-heading">
        <p class="eyebrow">THE LIBRARY / 专题资料</p>
        <h2>一份有顺序的<br />知识目录。</h2>
        <a class="text-link" :href="href('/library')">浏览全部资料 ↗</a>
      </div>
      <div class="topic-list">
        <a
          v-for="(topic, i) in topics"
          :key="topic"
          :href="href('/library?topic=' + encodeURIComponent(topic))"
          ><span>{{ String(i + 1).padStart(2, "0") }}</span>
          <h3>{{ topic }}</h3>
          <span aria-hidden="true">↗</span></a
        >
      </div>
    </section>
    <section class="home-projects">
      <p class="eyebrow">FROM MY WORK / 个人项目</p>
      <div class="project-intro">
        <h2>原理需要一个<br /><em>真实的落点。</em></h2>
        <p>
          从一次请求出发，沿实际实现往下追。<br />知道怎么做，也知道证据允许讲到哪里。
        </p>
      </div>
      <div class="project-link-list">
        <a :href="href('/notes/project-defense#agentic-rag')"
          ><span>01</span><strong>Agentic RAG</strong>
          <p>从论文证据到有来源的回答</p>
          <span>↗</span></a
        ><a :href="href('/notes/project-defense#deep-research')"
          ><span>02</span><strong>Deep Research</strong>
          <p>从任务协作到可验收的报告</p>
          <span>↗</span></a
        ><a :href="href('/notes/project-defense#forge')"
          ><span>03</span><strong>Forge</strong>
          <p>从模型循环到可控的工具执行</p>
          <span>↗</span></a
        >
      </div>
    </section>
  </div>
</template>
