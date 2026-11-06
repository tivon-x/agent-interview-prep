<script setup>
import { computed, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { latestAnsweredQuestion, study } from "../study-state.js";
import { data as catalog } from "../data/catalog.data.js";
import { pagePath } from "../data/navigation.js";

const ready = ref(false);
onMounted(() => { ready.value = true; });

const active = catalog.filter((page) => page.preparation?.active);
const latest = computed(() =>
  ready.value
    ? Object.entries(study.data.reading)
        .filter(([url]) => catalog.some((p) => pagePath(withBase(p.url)) === pagePath(url)))
        .sort((a, b) => b[1].updatedAt - a[1].updatedAt)[0]
    : undefined,
);
const continueTitle = computed(
  () => catalog.find((p) => latest.value && pagePath(withBase(p.url)) === pagePath(latest.value[0]))?.title,
);
const resumeQuestion = computed(() => ready.value ? latestAnsweredQuestion() : undefined);
</script>

<template>
  <div class="home-page work-page">
    <section class="home-hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="edition-dot"></span> 个人面试与笔试准备</p>
        <h1 id="home-title">把原理<em>读懂，</em><br />把项目<em>讲清。</em></h1>
        <div class="home-actions">
          <a
            class="primary-button"
            :href="latest
              ? latest[0] + (latest[1].anchor ? '#' + latest[1].anchor : '')
              : withBase('/reading-path')"
          >{{ latest ? "继续阅读" : "开始阅读" }} <span aria-hidden="true">↗</span></a>
          <a class="text-link" :href="withBase('/byte-agent/practice?q=' + (resumeQuestion || 'Q001'))">
            {{ resumeQuestion ? "继续练习 · " + resumeQuestion : "开始闭卷练习" }} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <p v-if="continueTitle" class="continue-note">{{ continueTitle }}</p>
      </div>
      <section class="learning-outline" aria-labelledby="active-preparations">
        <div class="outline-heading">
          <h2 id="active-preparations">正在准备</h2>
          <a class="text-link" :href="withBase('/preparations')">全部岗位专项 <span aria-hidden="true">↗</span></a>
        </div>
        <ul v-if="active.length" class="preparation-list">
          <li v-for="entry in active" :key="entry.url">
            <a :href="withBase(entry.url)">
              <div>
                <strong>{{ entry.preparation.company }}</strong>
                <p>{{ entry.preparation.role }}</p>
              </div>
              <span class="preparation-stage">{{ entry.preparation.stage }}</span>
              <span class="outline-arrow" aria-hidden="true">↗</span>
            </a>
          </li>
        </ul>
        <p v-else class="preparation-empty">暂无标记为正在准备的岗位。以往的面试和笔试资料可在专项里查到。</p>
      </section>
    </section>
    <nav class="home-shortcuts" aria-label="通用复习">
      <a :href="withBase('/reading-path')"><strong>学习路线</strong><span>按顺序复习基础与工程</span><span aria-hidden="true">↗</span></a>
      <a :href="withBase('/library')"><strong>资料库</strong><span>按来源浏览，按专题筛选</span><span aria-hidden="true">↗</span></a>
      <a :href="withBase('/notes/project-defense')"><strong>项目笔记</strong><span>梳理实现、取舍与证据</span><span aria-hidden="true">↗</span></a>
    </nav>
  </div>
</template>
