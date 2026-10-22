<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, withBase } from "vitepress";
import { data as catalog } from "../data/catalog.data.js";
import { sources, topics, collectionLinks, collectionRoot } from "../data/navigation.js";

const selected = ref(sources[0].id);
const topic = ref("");
const query = ref("");
const router = useRouter();
let previousAfter;
const currentSource = computed(() => sources.find((s) => s.id === selected.value));
const filtered = computed(() => catalog.filter((p) =>
  (!currentSource.value || p.url.startsWith(currentSource.value.root)) &&
  (!topic.value || p.category === topic.value) &&
  (p.title + p.description + p.source).toLowerCase().includes(query.value.trim().toLowerCase()),
));
const sections = computed(() => sources.filter((s) => !selected.value || s.id === selected.value).flatMap((source) => {
  const pages = filtered.value.filter((p) => p.url.startsWith(source.root));
  // A source's original index provides the chapter order; topics only filter it.
  const directories = catalog.filter((p) => p.collection && p.url.startsWith(source.root));
  const linked = new Set(directories.flatMap((p) => collectionLinks(p, catalog).map((c) => c.url)));
  const topDirectories = directories.filter((p) => p.url !== source.entry && !directories.some((parent) =>
    parent.url !== p.url && collectionRoot(parent) !== source.root &&
    collectionRoot(p).startsWith(collectionRoot(parent)) &&
    collectionRoot(p).length > collectionRoot(parent).length,
  ));
  const searching = topic.value || query.value.trim();
  if (searching || !selected.value) return [{ title: source.title, items: pages }];
  return [
    { title: "资料目录", items: topDirectories },
    { title: "独立文章", items: pages.filter((p) => !p.collection && !linked.has(p.url)) },
  ];
}).filter((section) => section.items.length));

function sync() {
  const params = new URLSearchParams(location.search);
  topic.value = topics.includes(params.get("topic")) ? params.get("topic") : "";
  selected.value = sources.some((s) => s.id === params.get("source"))
    ? params.get("source") : topic.value || params.get("source") === "all" ? "" : sources[0].id;
  query.value = params.get("filter") || "";
}
function update(source, nextTopic, filter, replace = false) {
  selected.value = source;
  topic.value = nextTopic;
  query.value = filter;
  const url = new URL(location.href);
  url.searchParams.set("source", source || "all");
  for (const [key, value] of [["topic", nextTopic], ["filter", filter]]) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history[replace ? "replaceState" : "pushState"]({}, "", url);
}
onMounted(() => {
  sync();
  previousAfter = router.onAfterRouteChange;
  const after = previousAfter ?? router.onAfterRouteChanged;
  router.onAfterRouteChange = async (url) => {
    await after?.(url);
    sync();
  };
  window.addEventListener("popstate", sync);
});
onUnmounted(() => {
  router.onAfterRouteChange = previousAfter;
  window.removeEventListener("popstate", sync);
});
</script>

<template>
  <div class="library-page work-page">
    <header class="page-heading">
      <p class="eyebrow">THE LIBRARY / 资料库</p>
      <h1>资料库</h1>
      <p>先选资料来源，再沿原有目录阅读。专题用于筛选，不改变资料归属。</p>
      <a class="text-link" :href="withBase('/reading-path')">查看建议阅读顺序 ↗</a>
    </header>
    <div class="library-workspace">
      <nav class="topic-nav" aria-label="资料来源">
        <button v-for="(source, i) in sources" :key="source.id" :aria-pressed="selected === source.id"
          @click="update(source.id, '', '')">
          <span>{{ String(i + 1).padStart(2, '0') }}</span>
          <span class="topic-name">{{ source.title }}</span><span aria-hidden="true">↗</span>
        </button>
      </nav>
      <div class="library-content">
        <div class="library-topic-heading">
          <div>
            <h2>{{ currentSource?.title || '全部来源' }}</h2>
            <p>{{ currentSource?.description || '按来源查看符合筛选条件的资料。' }}</p>
          </div>
          <a v-if="currentSource?.entry" class="primary-button" :href="withBase(currentSource.entry)">原资料总览 ↗</a>
        </div>
        <div class="filter-row">
          <label for="topic-filter">筛选资料<input id="topic-filter" type="search" :value="query"
            placeholder="章节标题或关键词" @input="update(selected, topic, $event.target.value, true)" /></label>
          <span role="status">{{ filtered.length }} 篇资料</span>
        </div>
        <div class="source-filters">
          <label for="source-topic">按专题筛选</label>
          <select id="source-topic" :value="topic" @change="update(selected, $event.target.value, query)">
            <option value="">全部专题</option><option v-for="item in topics" :key="item" :value="item">{{ item }}</option>
          </select>
          <button class="text-button" @click="update('', topic, query)">全部来源</button>
        </div>
        <div v-if="!filtered.length" class="empty-state">
          <h3>没有找到匹配的章节。</h3><p>换一个关键词，或清空筛选。</p>
          <button class="text-button" @click="update(selected, '', '')">清空筛选 ↗</button>
        </div>
        <section v-for="section in sections" :key="section.title" class="library-section">
          <div class="library-section-heading"><h3>{{ section.title }}</h3><span>{{ section.items.length }} 个入口</span></div>
          <div class="library-row-labels" aria-hidden="true"><span>目录 / 文章</span><span>关注内容</span><span>来源</span></div>
          <div class="library-rows">
            <a v-for="(item, i) in section.items" :key="item.url" :href="withBase(item.url)">
              <span class="row-number">{{ String(i + 1).padStart(2, '0') }}</span>
              <h4>{{ item.title }}</h4>
              <p>{{ item.description || (item.collection ? '按资料原有目录阅读。' : '打开文章，查看完整内容。') }}</p>
              <span class="source-label">{{ item.source }}</span><span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <div class="library-note"><a :href="withBase('/sources')">资料来源、版权与快照范围 ↗</a></div>
      </div>
    </div>
  </div>
</template>
