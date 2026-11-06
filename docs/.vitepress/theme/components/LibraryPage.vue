<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter, withBase } from "vitepress";
import { data as catalog } from "../data/catalog.data.js";
import { sources, topics, collectionLinks, collectionRoot } from "../data/navigation.js";

const selected = ref("");
const topic = ref("");
const query = ref("");
const router = useRouter();
let previousAfter;
const currentSource = computed(() => sources.find((s) => s.id === selected.value));
const hasFilters = computed(() => Boolean(topic.value || query.value.trim()));
const browsingSources = computed(() => !currentSource.value && !hasFilters.value);
const sourceEntries = sources.map((source) => ({
  title: source.title,
  url: "/library?source=" + source.id,
  description: source.description,
}));
const filtered = computed(() => catalog.filter((p) =>
  (!currentSource.value || p.url.startsWith(currentSource.value.root)) &&
  (!topic.value || p.category === topic.value) &&
  (p.title + p.description + p.source).toLowerCase().includes(query.value.trim().toLowerCase()),
));
const sections = computed(() => {
  if (browsingSources.value) return [{ title: "资料来源", items: sourceEntries }];
  if (hasFilters.value) {
    return sources.map((source) => ({
      title: source.title,
      items: filtered.value.filter((p) => p.url.startsWith(source.root)),
    })).filter((section) => section.items.length);
  }
  const source = currentSource.value;
  // A source's original index provides the chapter order; topics only filter it.
  const directories = catalog.filter((p) => p.collection && p.url.startsWith(source.root));
  const linked = new Set(directories.flatMap((p) => collectionLinks(p, catalog).map((c) => c.url)));
  const topDirectories = directories.filter((p) => p.url !== source.entry && !directories.some((parent) =>
    parent.url !== p.url && collectionRoot(parent) !== source.root &&
    collectionRoot(p).startsWith(collectionRoot(parent)) &&
    collectionRoot(p).length > collectionRoot(parent).length,
  ));
  return [
    { title: "资料目录", items: topDirectories },
    { title: "独立文章", items: filtered.value.filter((p) => !p.collection && !linked.has(p.url)) },
  ].filter((section) => section.items.length);
});

function sync() {
  const params = new URLSearchParams(location.search);
  topic.value = topics.includes(params.get("topic")) ? params.get("topic") : "";
  selected.value = sources.some((s) => s.id === params.get("source"))
    ? params.get("source") : "";
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
      <h1>资料库</h1>
      <a class="text-link" :href="withBase('/reading-path')">学习路线 ↗</a>
    </header>
    <div class="library-workspace">
      <div class="library-content">
        <div class="filter-row">
          <label class="library-query" for="topic-filter">筛选资料
            <input id="topic-filter" type="search" :value="query" :placeholder="currentSource ? '在所选来源中搜索' : '搜索所有来源的标题和关键词'"
              @input="update(selected, topic, $event.target.value, true)" />
          </label>
          <label for="library-source">资料来源
            <select id="library-source" :value="selected" @change="update($event.target.value, topic, query)">
              <option value="">全部来源</option>
              <option v-for="source in sources" :key="source.id" :value="source.id">{{ source.title }}</option>
            </select>
          </label>
          <label for="source-topic">按专题筛选
            <select id="source-topic" :value="topic" @change="update(selected, $event.target.value, query)">
              <option value="">全部专题</option>
              <option v-for="item in topics" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <span role="status">{{ browsingSources ? sources.length + ' 个来源' : filtered.length + ' 篇资料' }}</span>
        </div>
        <div v-if="currentSource" class="library-topic-heading">
          <h2>{{ currentSource.title }}</h2>
          <a v-if="currentSource.entry" class="text-link" :href="withBase(currentSource.entry)">原资料总览 ↗</a>
        </div>
        <div v-if="!filtered.length" class="empty-state">
          <h3>没有找到匹配的章节。</h3>
          <p>{{ currentSource ? '当前只搜索所选来源。可以扩大范围或清空筛选。' : '换一个关键词，或清空筛选。' }}</p>
          <button v-if="currentSource" class="text-button" @click="update('', topic, query)">搜索全部来源</button>
          <button class="text-button" @click="update(selected, '', '')">清空筛选 ↗</button>
        </div>
        <section v-for="section in sections" :key="section.title" class="library-section">
          <div class="library-section-heading"><h3>{{ section.title }}</h3><span>{{ section.items.length }} 个入口</span></div>
          <div v-if="!browsingSources" class="library-row-labels" aria-hidden="true"><span>目录 / 文章</span><span>关注内容</span><span>来源</span></div>
          <div class="library-rows" :class="{ 'source-overview': browsingSources }">
            <a v-for="(item, i) in section.items" :key="item.url" :href="withBase(item.url)">
              <span class="row-number">{{ String(i + 1).padStart(2, '0') }}</span>
              <h4>{{ item.title }}</h4>
              <p>{{ item.description || (item.collection ? '按资料原有目录阅读。' : '打开文章，查看完整内容。') }}</p>
              <span v-if="item.source" class="source-label">{{ item.source }}</span><span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
        <div class="library-note"><a :href="withBase('/sources')">资料来源、版权与快照范围 ↗</a></div>
      </div>
    </div>
  </div>
</template>
