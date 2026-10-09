<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { withBase } from "vitepress";
import { data as catalog } from "../data/catalog.data.js";
const topics = [
  "大模型基础",
  "Agent 工程",
  "RAG 与检索",
  "评测与安全",
  "后端与系统设计",
  "机器学习基础",
  "深度学习基础",
];
const selected = ref(topics[0]);
const query = ref("");
const main = {
  机器学习基础: "/notes/ml-basics/",
  深度学习基础: "/notes/dl-basics/",
  大模型基础: "/materials/llm-agent-interview-guide/01-Foundation/",
  "Agent 工程": "/materials/zero2agent/learn-agent-interview/",
  "RAG 与检索": "/materials/llm-agent-interview-guide/04-RAG/",
  评测与安全: "/materials/llm-agent-interview-guide/06-Safety-Evaluation/",
  后端与系统设计: "/materials/system-design-primer/README-zh-Hans",
};
const descriptions = {
  机器学习基础: "从泛化与评估到经典算法，重点练 LR、GMM/EM 和树模型。",
  深度学习基础: "理解反向传播与训练过程，把优化器和 CNN 落实为计算题。",
  大模型基础: "理解输入如何变成输出，再看推理开销与训练取舍。",
  "Agent 工程": "把模型、工具与状态接起来，弄清一次任务如何可靠完成。",
  "RAG 与检索": "从文档处理到引用，让每一个回答都有可以回查的证据。",
  评测与安全: "先定义成功，再定位失败；把权限与边界放在执行之前。",
  后端与系统设计: "回到网络、存储与并发，为模型能力提供可靠的软件基础。",
};
const filtered = computed(() =>
  catalog.filter(
    (p) =>
      p.category === selected.value &&
      (p.url !== main[selected.value] || query.value.trim()) &&
      (p.title + p.description + p.source)
        .toLowerCase()
        .includes(query.value.trim().toLowerCase()),
  ),
);
const mainPage = computed(() =>
  catalog.find((p) => p.url === main[selected.value]),
);
const sections = computed(() => {
  const order = mainPage.value?.links || [];
  return [
    {
      title: "主线章节",
      items: filtered.value
        .filter((p) => !p.collection && order.includes(p.url))
        .sort((a, b) => order.indexOf(a.url) - order.indexOf(b.url)),
    },
    { title: "资料集入口", items: filtered.value.filter((p) => p.collection) },
    {
      title: "补充阅读",
      items: filtered.value.filter(
        (p) => !p.collection && !order.includes(p.url),
      ),
    },
  ].filter((s) => s.items.length);
});
function sync() {
  const params = new URLSearchParams(location.search);
  selected.value = topics.includes(params.get("topic"))
    ? params.get("topic")
    : topics[0];
  query.value = params.get("filter") || "";
}
function update(topic, filter) {
  selected.value = topic;
  query.value = filter;
  const url = new URL(location.href);
  url.searchParams.set("topic", topic);
  if (filter) url.searchParams.set("filter", filter);
  else url.searchParams.delete("filter");
  history.pushState({}, "", url);
}
onMounted(() => {
  sync();
  window.addEventListener("popstate", sync);
});
onUnmounted(() => window.removeEventListener("popstate", sync));
</script>
<template>
  <div class="library-page work-page">
    <header class="page-heading">
      <p class="eyebrow">THE LIBRARY / 专题资料</p>
      <h1>专题资料</h1>
      <p>先沿主线读懂一个专题，再用补充材料解决疑点。</p>
      <a class="text-link" :href="withBase('/reading-path')"
        >还没确定顺序？回到学习路线 ↗</a
      >
    </header>
    <div class="library-workspace">
      <nav class="topic-nav" aria-label="专题分类">
        <button
          v-for="(topic, i) in topics"
          :key="topic"
          :aria-pressed="selected === topic"
          @click="update(topic, '')"
        >
          <span>{{ String(i + 1).padStart(2, "0") }}</span
          ><span class="topic-name"
            ><template v-if="topic === '后端与系统设计'"
              >后端与<br class="topic-break" />系统设计</template
            ><template v-else>{{ topic }}</template></span
          ><span aria-hidden="true">↗</span>
        </button>
      </nav>
      <div class="library-content">
        <div class="library-topic-heading">
          <div>
            <p class="eyebrow">
              {{ String(topics.indexOf(selected) + 1).padStart(2, "0") }} /
              主线阅读
            </p>
            <h2>{{ selected }}</h2>
            <p>{{ descriptions[selected] }}</p>
          </div>
          <a class="primary-button" :href="withBase(main[selected])"
            >主线阅读 ↗</a
          >
        </div>
        <div class="filter-row">
          <label for="topic-filter"
            >筛选当前专题<input
              id="topic-filter"
              type="search"
              :value="query"
              placeholder="章节标题或资料来源"
              @input="update(selected, $event.target.value)" /></label
          ><span role="status">{{ filtered.length }} 篇资料</span>
        </div>
        <div v-if="!filtered.length" class="empty-state">
          <h3>没有找到匹配的章节。</h3>
          <p>换一个关键词，或回到这一专题的全部资料。</p>
          <button class="text-button" @click="update(selected, '')">
            清空筛选 ↗
          </button>
        </div>
        <section
          v-for="section in sections"
          v-else
          :key="section.title"
          class="library-section"
        >
          <div class="library-section-heading">
            <h3>{{ section.title }}</h3>
            <span>{{ section.items.length }} 篇</span>
          </div>
          <div class="library-row-labels" aria-hidden="true">
            <span>章节</span><span>关注内容</span><span>来源</span>
          </div>
          <div class="library-rows">
            <a
              v-for="(item, i) in section.items"
              :key="item.url"
              :href="withBase(item.url)"
              ><span class="row-number">{{
                String(i + 1).padStart(2, "0")
              }}</span>
              <h4>{{ item.title }}</h4>
              <p>
                {{
                  item.description ||
                  (item.collection
                    ? "按资料集的原有目录阅读。"
                    : "打开原文，查看完整解释与边界。")
                }}
              </p>
              <span class="source-label">{{ item.source }}</span>
              <span aria-hidden="true">↗</span></a
            >
          </div>
        </section>
        <div class="library-note">
          <span>让原理落到实践</span
          ><a
            :href="
              withBase(
                '/notes/project-defense#' +
                  (selected === 'RAG 与检索'
                    ? 'agentic-rag'
                    : selected === 'Agent 工程'
                      ? 'forge'
                      : 'deep-research'),
              )
            "
            >回看关联项目 ↗</a
          ><a :href="withBase('/sources')">核对资料来源与范围 ↗</a>
        </div>
      </div>
    </div>
  </div>
</template>
