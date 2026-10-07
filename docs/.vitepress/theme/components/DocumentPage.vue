<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { onContentUpdated, withBase } from "vitepress";
const props = defineProps({ kind: String });
const view = ref(props.kind === "route" ? "full" : "agentic-rag");
const body = ref();
const historic = ref(false);
const stations = ref([
  { label: "模型基础", id: "_1-大模型与-agent-基础" },
  { label: "工程实践", id: "_2-rag-与-agent-工程" },
  { label: "评测与设计", id: "_3-评测、安全与系统设计" },
  { label: "后端系统", id: "_4-后端与数据平台" },
  { label: "个人证据", id: "_5-个人补充与项目证据" },
]);
const principles = ref([]);
const projects = [
  {
    id: "agentic-rag",
    title: "Agentic RAG",
    purpose: "从论文库中找到证据，再生成可回查的回答。",
    steps: [
      ["文档与分块", "论文分块"],
      ["检索与重排", "检索与重排"],
      ["证据与失败", "证据和失败处理"],
      ["评测与边界", "评测结论与当前边界"],
    ],
  },
  {
    id: "deep-research",
    title: "Deep Research",
    purpose: "让多名研究 Agent 协作，并交付有依据的报告。",
    steps: [
      ["研究流程", "一次研究如何完成"],
      ["任务与权限", "task-board-与任务权限"],
      ["完成的证据", "完成-需要什么证据"],
      ["预算与恢复", "预算、中断和评测边界"],
    ],
  },
  {
    id: "forge",
    title: "Forge",
    purpose: "让编码 Agent 连续使用工具，保留可追溯的会话。",
    steps: [
      ["模型循环", "一次编码请求怎样流转"],
      ["工具边界", "工具定义与执行边界"],
      ["会话与恢复", "会话、压缩和恢复不是一回事"],
      ["能力与限制", "能讲到什么程度"],
    ],
  },
];
const currentProject = computed(
  () => projects.find((p) => p.id === view.value) || projects[0],
);
const projectLinks = computed(() =>
  currentProject.value.steps.map(([label, id]) => ({ label, id })),
);
function applyView() {
  if (!body.value) return;
  body.value.querySelectorAll("[data-study-section]").forEach((section) => {
    section.hidden = section.dataset.studySection !== view.value;
  });
  body.value.querySelectorAll("[data-study-section=full] h3").forEach((h) => {
    const text = [...h.childNodes].find((n) => n.nodeType === 3);
    if (text) text.textContent = text.textContent.replace(/^\d+\.\s*/, "");
  });
  stations.value = [
    ...body.value.querySelectorAll("[data-study-section=full] h3[id]"),
  ]
    .slice(0, 5)
    .map((h, i) => ({ id: h.id, label: stations.value[i].label }));
  const section = body.value.querySelector(
    `[data-study-section="${view.value}"]`,
  );
  principles.value = [...(section?.querySelectorAll("a[href]") || [])]
    .filter((a) => a.getAttribute("href").includes("/materials/"))
    .filter((a, i, all) => all.findIndex((b) => b.href === a.href) === i)
    .slice(0, 5)
    .map((a) => ({ title: a.textContent, href: a.getAttribute("href") }));
}
function sync() {
  const query = new URLSearchParams(location.search).get("view");
  const values =
    props.kind === "route" ? ["full", "schedule"] : projects.map((p) => p.id);
  view.value = values.includes(query) ? query : values[0];
  if (location.hash) {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      return;
    }
    const target = document.getElementById(id);
    const section = target?.closest("[data-study-section]");
    if (section) view.value = section.dataset.studySection;
    applyView();
    if (target) requestAnimationFrame(() => target.scrollIntoView());
  } else applyView();
}
async function choose(value) {
  view.value = value;
  const url = new URL(location.href);
  url.searchParams.set("view", value);
  url.hash = "";
  history.pushState({}, "", url);
  await nextTick();
  applyView();
}
onMounted(() => {
  const date = new Date();
  historic.value = date < new Date(2026, 9, 1) || date >= new Date(2026, 9, 15);
  sync();
  window.addEventListener("popstate", sync);
  window.addEventListener("hashchange", sync);
});
onContentUpdated(async () => {
  await nextTick();
  sync();
});
watch(
  () => props.kind,
  async (kind) => {
    view.value = kind === "route" ? "full" : "agentic-rag";
    await nextTick();
    sync();
  },
);
onUnmounted(() => {
  window.removeEventListener("popstate", sync);
  window.removeEventListener("hashchange", sync);
});
</script>
<template>
  <div
    class="document-page work-page"
    :class="kind + '-page'"
    :data-view="view"
  >
    <header class="page-heading">
      <p class="eyebrow">
        {{
          kind === "route" ? "THE PATH / 学习路线" : "FIELD NOTES / 项目笔记"
        }}
      </p>
      <h1>{{ kind === "route" ? "学习路线" : "项目笔记" }}</h1>
      <p>
        {{
          kind === "route"
            ? "资料、实践与表达，各有顺序，也允许回头。"
            : "从一次请求出发，沿实现、取舍与证据往下追。"
        }}
      </p>
    </header>
    <div class="document-tabs" aria-label="视图切换">
      <template v-if="kind === 'route'"
        ><button :aria-pressed="view === 'full'" @click="choose('full')">
          完整路线 <span>01—05</span></button
        ><button
          :aria-pressed="view === 'schedule'"
          @click="choose('schedule')"
        >
          近期安排 <span>2026.10</span>
        </button></template
      ><template v-else
        ><button
          v-for="project in projects"
          :key="project.id"
          :aria-pressed="view === project.id"
          @click="choose(project.id)"
        >
          {{ project.title }}
        </button></template
      >
    </div>
    <nav
      v-if="kind === 'route' && view === 'full'"
      class="route-stations"
      aria-label="五组阅读路线"
    >
      <a
        v-for="(station, i) in stations"
        :key="station.id"
        :href="'#' + station.id"
        ><span class="station-dot"></span
        ><small>{{ String(i + 1).padStart(2, "0") }}</small
        ><strong>{{ station.label }}</strong></a
      >
    </nav>
    <p v-if="kind === 'route' && view === 'schedule'" class="schedule-note">
      {{ historic ? "历史安排" : "固定日期安排" }} · 2026 年 10 月 1 日至 14
      日。学习顺序长期有效，安排保留休息与交接时间。
    </p>
    <div class="document-workspace">
      <div class="document-main">
        <section
          v-if="kind === 'project'"
          class="project-flow"
          aria-label="项目关键环节"
        >
          <template v-for="project in projects" :key="project.id"
            ><template v-if="view === project.id"
              ><div class="flow-intro">
                <h2>{{ project.title }}</h2>
                <p>{{ project.purpose }}</p>
              </div>
              <div class="flow-steps">
                <a
                  v-for="(step, i) in projectLinks"
                  :key="step.label"
                  :href="'#' + step.id"
                  ><span>{{ String(i + 1).padStart(2, "0") }}</span
                  ><strong>{{ step.label }}</strong
                  ><span aria-hidden="true">↘</span></a
                >
              </div>
              <p class="flow-boundary">
                选择一个环节，回查实现、取舍与证据。
              </p></template
            ></template
          >
        </section>
        <div ref="body" class="document-body"><Content class="vp-doc" /></div>
      </div>
      <aside class="document-rail" v-if="kind === 'project' || view === 'full'">
        <template v-if="kind === 'route'">
          <p class="eyebrow">读完之后 / 合上资料</p>
          <h2>给理解留一次检验。</h2>
          <ol>
            <li>它解决什么问题？</li>
            <li>为什么这样设计？</li>
            <li>什么情况下会失败？</li>
          </ol>
          <p>
            每次深入一个主材料，其他资料用于回查疑点。没讲清的主题，下一次接着读。
          </p>
          <a :href="withBase('/byte-agent/practice?q=Q001')"
            >用题目检验理解 ↗</a
          >
        </template>
        <template v-else>
          <p class="eyebrow">追问 / 回到原理</p>
          <h2>把取舍讲清。</h2>
          <nav aria-label="关联原理与面试题">
            <a v-for="link in principles" :key="link.href" :href="link.href"
              >{{ link.title }} ↗</a
            >
          </nav>
          <p>
            沿“问题 → 流程 → 取舍 → 失败处理 →
            证据”复述。每个结论都回查对应正文。
          </p>
        </template>
      </aside>
    </div>
    <div class="document-return">
      <a :href="withBase('/library')">← 浏览专题资料</a
      ><a :href="withBase('/byte-agent/practice?q=Q001')"
        >合上资料，练习表达 ↗</a
      >
    </div>
  </div>
</template>
