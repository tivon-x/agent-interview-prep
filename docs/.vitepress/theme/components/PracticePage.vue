<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { withBase } from "vitepress";
import { data as index } from "../data/questions.data.js";
import { initStudy, saveAnswer, study } from "../study-state.js";
const selected = ref("Q001"),
  group = ref(""),
  difficulty = ref(""),
  type = ref("");
const draft = ref(""),
  rating = ref(null),
  question = ref(null),
  loading = ref(false),
  error = ref("");
const showHints = ref(false),
  showAnswer = ref(false),
  invalid = ref(false);
const heading = ref();
const cache = new Map();
let pendingSave,
  request = 0,
  savedId = "",
  dirty = false;
const filtered = computed(() =>
  index.items.filter(
    (q) =>
      (!group.value || q.group === group.value) &&
      (!difficulty.value || q.difficulty === difficulty.value) &&
      (!type.value || q.type === type.value),
  ),
);
const position = computed(() =>
  filtered.value.findIndex((q) => q.id === selected.value),
);
const summary = computed(() =>
  index.items.find((q) => q.id === selected.value),
);
const currentGroup = computed(() =>
  index.groups.find((g) => g.id === summary.value?.group),
);
function flush() {
  clearTimeout(pendingSave);
  if (savedId && dirty) {
    saveAnswer(savedId, draft.value, rating.value);
    dirty = false;
  }
}
function writeUrl(push = true) {
  const url = new URL(location.href);
  for (const [key, value] of [
    ["q", selected.value],
    ["topic", group.value],
    ["difficulty", difficulty.value],
    ["type", type.value],
  ]) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  history[push ? "pushState" : "replaceState"]({}, "", url);
}
async function load(id) {
  flush();
  savedId = "";
  selected.value = id;
  showHints.value = false;
  showAnswer.value = false;
  question.value = null;
  error.value = "";
  const generation = ++request;
  invalid.value = !index.items.some((q) => q.id === id);
  if (invalid.value) return;
  const record = study.data.questions[id];
  draft.value = record?.draft || "";
  rating.value = record?.rating || null;
  savedId = id;
  loading.value = true;
  try {
    const file = currentGroup.value.file;
    if (!cache.has(file)) {
      const response = await fetch(withBase("/" + file));
      if (!response.ok) throw new Error("题目内容暂时无法加载");
      const chunk = await response.json();
      if (
        !Array.isArray(chunk) ||
        !chunk.some((q) => q.id === id && typeof q.answer === "string")
      )
        throw new Error("题目数据不完整");
      cache.set(file, chunk);
    }
    if (generation === request)
      question.value = cache.get(file).find((q) => q.id === id);
  } catch (e) {
    if (generation === request) error.value = e.message;
  } finally {
    if (generation === request) loading.value = false;
  }
}
function sync() {
  const params = new URLSearchParams(location.search);
  group.value = index.groups.some((g) => g.id === params.get("topic"))
    ? params.get("topic")
    : "";
  difficulty.value = ["基础", "进阶", "困难"].includes(params.get("difficulty"))
    ? params.get("difficulty")
    : "";
  type.value = ["项目", "原理", "设计", "故障", "编码", "行为"].includes(
    params.get("type"),
  )
    ? params.get("type")
    : "";
  load(params.get("q") || "Q001");
}
async function navigate(id) {
  await load(id);
  writeUrl();
  await nextTick();
  heading.value?.focus({ preventScroll: true });
}
function changeFilter() {
  const next = filtered.value.some((q) => q.id === selected.value)
    ? selected.value
    : filtered.value[0]?.id;
  if (next) load(next);
  else {
    flush();
    savedId = "";
    question.value = null;
    request++;
    loading.value = false;
  }
  writeUrl();
}
function reset() {
  group.value = "";
  difficulty.value = "";
  type.value = "";
  changeFilter();
}
function schedule() {
  dirty = true;
  clearTimeout(pendingSave);
  pendingSave = setTimeout(flush, 250);
}
function mark(value) {
  rating.value = value;
  dirty = true;
  flush();
}
watch(
  () => study.data.questions,
  () => {
    if (!savedId) return;
    const record = study.data.questions[savedId];
    draft.value = record?.draft || "";
    rating.value = record?.rating || null;
  },
);
onMounted(() => {
  initStudy();
  sync();
  window.addEventListener("popstate", sync);
  window.addEventListener("pagehide", flush);
});
onUnmounted(() => {
  flush();
  request++;
  window.removeEventListener("popstate", sync);
  window.removeEventListener("pagehide", flush);
});
</script>
<template>
  <div class="practice-page work-page">
    <header class="practice-heading">
      <div>
        <p class="eyebrow">CLOSED BOOK / 闭卷练习</p>
        <h1>闭卷练习</h1>
      </div>
      <a class="text-link" :href="withBase('/byte-agent/question-bank')"
        >← 回题库浏览</a
      >
    </header>
    <div class="practice-filters">
      <label
        >专题<select v-model="group" @change="changeFilter">
          <option value="">全部专题</option>
          <option v-for="g in index.groups" :key="g.id" :value="g.id">
            {{ g.id }}. {{ g.label }}
          </option>
        </select></label
      ><label
        >难度<select v-model="difficulty" @change="changeFilter">
          <option value="">全部难度</option>
          <option>基础</option>
          <option>进阶</option>
          <option>困难</option>
        </select></label
      ><label
        >题型<select v-model="type" @change="changeFilter">
          <option value="">全部题型</option>
          <option
            v-for="t in ['项目', '原理', '设计', '故障', '编码', '行为']"
            :key="t"
          >
            {{ t }}
          </option>
        </select></label
      ><span class="question-count" role="status"
        >{{ filtered.length }} 题</span
      >
    </div>
    <section v-if="invalid" class="empty-state">
      <h2>没有这个题号。</h2>
      <p>题号 {{ selected }} 不在 Q001 至 Q360 范围内。</p>
      <a :href="withBase('/byte-agent/question-bank')">回题库选择题目 ↗</a>
    </section>
    <section v-else-if="!filtered.length" class="empty-state">
      <h2>这个组合还没有题目。</h2>
      <button class="text-button" @click="reset">重置筛选 ↗</button>
    </section>
    <div v-else class="practice-workspace">
      <div class="question-panel">
        <div class="question-meta">
          <span class="question-id">{{ selected }}</span
          ><span>{{ summary?.difficulty }}</span
          ><span>{{ summary?.type }}</span
          ><span>{{
            position < 0
              ? "不在当前筛选内"
              : `${position + 1} / ${filtered.length}`
          }}</span>
        </div>
        <p class="source-label">{{ currentGroup?.label }}</p>
        <h2
          v-if="question"
          ref="heading"
          tabindex="-1"
          class="question-title"
          v-html="question.question"
        />
        <h2 v-else class="question-title">{{ summary?.title }}</h2>
        <p v-if="loading" role="status">正在加载题目内容…</p>
        <div v-if="error" role="alert" class="status-error">
          {{ error }}<button @click="load(selected)">重新加载</button>
        </div>
        <template v-if="question"
          ><div class="answer-draft">
            <div class="draft-heading">
              <label for="answer-draft">用自己的话回答</label
              ><span
                >{{ draft.length }} 字 ·
                {{ study.error ? "未保存到浏览器" : "仅本地保存" }}</span
              >
            </div>
            <textarea
              @input="schedule"
              @blur="flush"
              id="answer-draft"
              v-model="draft"
              maxlength="200000"
              rows="5"
              placeholder="先给结论，再讲依据，最后说明边界。"
            />
            <p v-if="study.error" class="status-error" role="status">
              {{ study.error }} 可在页脚导出备份。
            </p>
          </div>
          <div class="reveal-controls">
            <button
              v-if="question.hints"
              :aria-expanded="showHints"
              @click="showHints = !showHints"
            >
              {{ showHints ? "收起提示" : "给我一点提示" }}
              <span>＋</span></button
            ><button
              class="primary-button"
              :aria-expanded="showAnswer"
              @click="showAnswer = !showAnswer"
            >
              {{ showAnswer ? "收起解析" : "我答完了，对照解析" }}
              <span>↗</span>
            </button>
          </div>
          <div
            v-if="showHints"
            class="hint-panel vp-doc"
            v-html="question.hints"
          />
          <section v-if="showAnswer" class="answer-panel">
            <p class="eyebrow">REFLECT / 对照与回读</p>
            <div class="vp-doc" v-html="question.answer" />
            <a
              class="text-link"
              :href="withBase('/byte-agent/analysis#' + question.anchor)"
              >在完整解析中阅读 ↗</a
            >
          </section>
          <fieldset class="self-rating">
            <legend>此刻能讲清吗？<span>个人自评</span></legend>
            <button
              v-for="value in ['尚未掌握', '需要复习', '能讲清楚']"
              :key="value"
              :aria-pressed="rating === value"
              @click="mark(value)"
            >
              {{ value }}
            </button>
          </fieldset></template
        >
        <nav class="question-pagination" aria-label="切换题目">
          <button
            :disabled="position <= 0"
            @click="navigate(filtered[position - 1].id)"
          >
            ← 上一题</button
          ><span>{{ selected }}</span
          ><button
            :disabled="position < 0 || position >= filtered.length - 1"
            @click="navigate(filtered[position + 1].id)"
          >
            下一题 →
          </button>
        </nav>
      </div>
      <aside class="practice-rail">
        <p class="eyebrow">A WAY TO ANSWER / 回答框架</p>
        <ol>
          <li>
            <span>01</span><strong>结论</strong>
            <p>先回答问题本身。</p>
          </li>
          <li>
            <span>02</span><strong>依据</strong>
            <p>给出机制、取舍或真实实现。</p>
          </li>
          <li>
            <span>03</span><strong>边界</strong>
            <p>说明失败条件与证据范围。</p>
          </li>
        </ol>
        <p class="rail-note">
          查看解析不会自动改变自评。<br />掌握程度由自己判断。
        </p>
        <a :href="withBase('/reading-path')">回到路线补读 ↗</a
        ><a :href="withBase('/notes/project-defense')">核对项目证据 ↗</a>
      </aside>
    </div>
  </div>
</template>
