<script setup>
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import {
  onContentUpdated,
  useData,
  useRoute,
  useRouter,
  withBase,
} from "vitepress";
import { VPNavBarSearch } from "vitepress/theme-without-fonts";
import { data as catalog } from "./data/catalog.data.js";
import { initStudy, study, saveStudy } from "./study-state.js";

const HomePage = defineAsyncComponent(
  () => import("./components/HomePage.vue"),
);
const LibraryPage = defineAsyncComponent(
  () => import("./components/LibraryPage.vue"),
);
const DocumentPage = defineAsyncComponent(
  () => import("./components/DocumentPage.vue"),
);
const PracticePage = defineAsyncComponent(
  () => import("./components/PracticePage.vue"),
);
const StateControls = defineAsyncComponent(
  () => import("./components/StateControls.vue"),
);
const { page, theme, isDark } = useData();
const route = useRoute();
const router = useRouter();
const mobileMenu = ref();
const chapterSheet = ref();
const outlineSheet = ref();
const headings = ref([]);
const current = ref("");
const themeReady = ref(false);
const kind = computed(() =>
  page.value.isNotFound
    ? "404"
    : {
        "index.md": "home",
        "library.md": "library",
        "reading-path.md": "route",
        "notes/project-defense.md": "project",
        "byte-agent/practice.md": "practice",
      }[page.value.relativePath] || "reader",
);
const href = (url) => withBase(encodeURI(decodeURI(url)));
const cleanPath = computed(() => route.path.replace(/\.html$/, ""));
const metadata = computed(() =>
  catalog.find((p) => href(p.url) === cleanPath.value),
);
function flatten(items) {
  return items.flatMap((i) => [
    ...(i.link ? [{ title: i.text, url: i.link }] : []),
    ...flatten(i.items || []),
  ]);
}
const chapters = computed(() => {
  const own = catalog
    .filter((p) => p.collection || p.links.length > 2)
    .filter((p) =>
      cleanPath.value.startsWith(
        href(p.url.replace(/(?:index|README)?(?:\.html)?$/, "")),
      ),
    )
    .sort((a, b) => b.url.length - a.url.length)
    .find((p) => p.links.includes(metadata.value?.url));
  if (own)
    return [
      { title: own.title, url: own.url },
      ...own.links
        .map((url) => catalog.find((p) => p.url === url))
        .filter(Boolean),
    ];
  const key = Object.keys(theme.value.sidebar || {})
    .sort((a, b) => b.length - a.length)
    .find((prefix) => cleanPath.value.startsWith(href(prefix)));
  return flatten(theme.value.sidebar?.[key] || []).filter(
    (p, n, all) => all.findIndex((i) => i.url === p.url) === n,
  );
});
const adjacent = computed(() => {
  const index = chapters.value.findIndex(
    (c) => href(c.url) === cleanPath.value,
  );
  return index < 0
    ? {}
    : { prev: chapters.value[index - 1], next: chapters.value[index + 1] };
});
const visibleOutline = computed(() => {
  let parent = "";
  return headings.value.filter((h) => {
    if (h.level === 2) parent = h.id;
    return (
      h.level === 2 ||
      parent === current.value ||
      headings.value.find((i) => i.id === current.value)?.parent === parent
    );
  });
});
let scrollTimer,
  restoring = false,
  historyNavigation = false,
  oldBefore,
  restoredPath = "";
function collect() {
  let parent = "";
  const nodes = [
    ...document.querySelectorAll(".reader-body h2[id], .reader-body h3[id]"),
  ];
  if (!nodes.length)
    nodes.push(...document.querySelectorAll(".reader-body h1[id]"));
  headings.value = nodes
    .filter((el) => !el.closest("[hidden], details:not([open])"))
    .map((el) => {
      const title = [...el.childNodes]
        .filter((n) => !n.classList?.contains("header-anchor"))
        .map((n) => n.textContent)
        .join("")
        .trim();
      if (el.tagName !== "H3") parent = el.id;
      return {
        id: el.id,
        title: title.replace(/^Q[:：]?\s*/, ""),
        level: el.tagName === "H3" ? 3 : 2,
        parent,
        el,
      };
    });
  updateCurrent();
}
function updateCurrent() {
  const index = headings.value.findLastIndex(
    (h) => h.el.getBoundingClientRect().top <= 150,
  );
  current.value = headings.value[Math.max(0, index)]?.id || "";
}
function remember() {
  if (kind.value !== "reader" || restoring || !study.ready) return;
  const anchor = headings.value.findLast(
    (h) => h.el.getBoundingClientRect().top <= 140,
  );
  study.data.reading[cleanPath.value] = {
    anchor: anchor?.id || "",
    offset: anchor ? -anchor.el.getBoundingClientRect().top : window.scrollY,
    updatedAt: Date.now(),
  };
  saveStudy();
}
function scroll() {
  updateCurrent();
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(remember, 400);
}
async function toggleFocus() {
  const anchor =
    headings.value.find((h) => h.el.getBoundingClientRect().top >= 80) ||
    headings.value.at(-1);
  const before = anchor?.el.getBoundingClientRect().top;
  study.data.focus = !study.data.focus;
  saveStudy();
  await nextTick();
  if (anchor)
    window.scrollBy(0, anchor.el.getBoundingClientRect().top - before);
}
function closeSheets() {
  for (const dialog of [
    mobileMenu.value,
    chapterSheet.value,
    outlineSheet.value,
  ])
    if (dialog?.open) dialog.close();
}
function search() {
  closeSheets();
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
  );
}
function pop() {
  historyNavigation = true;
  closeSheets();
}
function revealHash() {
  let id;
  try {
    id = decodeURIComponent(location.hash.slice(1));
  } catch {
    return;
  }
  const target = document.getElementById(id);
  const closed = target?.closest("details:not([open])");
  if (closed) {
    closed.open = true;
    requestAnimationFrame(() => target.scrollIntoView());
  }
}
watch(
  () => route.path,
  () => {
    closeSheets();
    headings.value = [];
    current.value = "";
    restoredPath = "";
  },
);
onContentUpdated(async () => {
  await nextTick();
  revealHash();
  collect();
  if (page.value.relativePath === "byte-agent/analysis.md") {
    for (const h of document.querySelectorAll(".reader-body h3[id]")) {
      const id = h.textContent.match(/Q\d{3}/)?.[0];
      if (!id || h.nextElementSibling?.classList.contains("answer-back"))
        continue;
      const links = document.createElement("p");
      links.className = "answer-back";
      for (const [label, url] of [
        ["闭卷练习此题", "/byte-agent/practice?q=" + id],
        ["回题库浏览", "/byte-agent/question-bank#" + id.toLowerCase()],
      ]) {
        const a = document.createElement("a");
        a.textContent = label;
        a.href = href(url);
        links.append(a);
      }
      h.after(links);
    }
  }
  if (kind.value !== "reader" || restoredPath === cleanPath.value) return;
  restoredPath = cleanPath.value;
  if (location.hash || historyNavigation) {
    historyNavigation = false;
    return;
  }
  const record = study.data.reading[cleanPath.value];
  if (record) {
    restoring = true;
    await document.fonts.ready;
    requestAnimationFrame(() => {
      const target = document.getElementById(record.anchor);
      window.scrollTo(
        0,
        target
          ? target.getBoundingClientRect().top + window.scrollY + record.offset
          : record.offset,
      );
      restoring = false;
    });
  }
});
onMounted(() => {
  themeReady.value = true;
  initStudy();
  collect();
  oldBefore = router.onBeforeRouteChange;
  router.onBeforeRouteChange = async (url) => {
    remember();
    return oldBefore?.(url);
  };
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("pagehide", remember);
  window.addEventListener("popstate", pop);
  window.addEventListener("hashchange", revealHash);
  document.addEventListener("toggle", collect, true);
});
onUnmounted(() => {
  clearTimeout(scrollTimer);
  window.removeEventListener("scroll", scroll);
  window.removeEventListener("pagehide", remember);
  window.removeEventListener("popstate", pop);
  window.removeEventListener("hashchange", revealHash);
  document.removeEventListener("toggle", collect, true);
  router.onBeforeRouteChange = oldBefore;
});
</script>

<template>
  <div
    class="study-layout"
    :class="[
      { 'focus-reading': study.data.focus && kind === 'reader' },
      'surface-' + kind,
    ]"
  >
    <a class="skip-link" href="#VPContent">跳到正文</a>
    <header class="site-header">
      <a class="site-brand" :href="href('/')" aria-label="面试复习库，返回首页"
        ><svg viewBox="0 0 28 32" aria-hidden="true">
          <path d="M5 3v26M14 3v26M23 3v26M5 7h18M5 16h18M5 25h18" />
          <circle cx="14" cy="16" r="3" /></svg
        ><span>面试复习库<small>THE STUDY EDITION</small></span></a
      >
      <nav class="desktop-nav" aria-label="主导航">
        <a
          v-for="item in theme.nav"
          :key="item.link"
          :href="href(item.link)"
          :aria-current="
            cleanPath.startsWith(href(item.link)) ? 'page' : undefined
          "
          >{{ item.text }}</a
        >
      </nav>
      <div class="header-tools">
        <VPNavBarSearch /><button
          class="theme-toggle icon-button"
          :aria-label="themeReady && isDark ? '切换浅色主题' : '切换深色主题'"
          @click="isDark = !isDark"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              class="theme-moon"
              d="M20 14a8 8 0 0 1-10-10A8 8 0 1 0 20 14Z"
            />
            <g class="theme-sun">
              <circle cx="12" cy="12" r="4" />
              <path
                d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"
              />
            </g>
          </svg></button
        ><button
          class="mobile-menu icon-button"
          aria-label="打开导航"
          @click="mobileMenu.showModal()"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 16h16" />
          </svg>
        </button>
      </div>
    </header>
    <main id="VPContent" tabindex="-1">
      <HomePage v-if="kind === 'home'" />
      <LibraryPage v-else-if="kind === 'library'" />
      <PracticePage v-else-if="kind === 'practice'" />
      <DocumentPage
        v-else-if="kind === 'route' || kind === 'project'"
        :kind="kind"
      />
      <section v-else-if="kind === '404'" class="not-found work-page">
        <p class="eyebrow">404 / 路线之外</p>
        <h1>这一页，<br />还没有被写下。</h1>
        <p>页面不存在，或资料快照未收录该章节。</p>
        <a class="primary-button" :href="href('/library')"
          >回到专题资料 <span>↗</span></a
        ><button class="text-button" @click="search">搜索文档</button
        ><a :href="href('/')">回首页</a
        ><a :href="href('/sources')">查看来源与快照范围</a>
      </section>
      <div v-else class="reader-frame VPDoc">
        <aside class="chapter-rail" aria-label="章节导航">
          <a class="rail-back" :href="href('/library')">← 专题资料</a>
          <nav>
            <a
              v-for="(chapter, index) in chapters"
              :key="chapter.url"
              :href="href(chapter.url)"
              :aria-current="href(chapter.url) === cleanPath ? 'page' : undefined"
            ><span class="rail-number">{{ String(index + 1).padStart(2, "0") }}</span>{{ chapter.title }}</a>
          </nav>
          <a class="rail-source" :href="href('/sources')">资料出处与快照范围 ↗</a>
        </aside>
        <div class="reader-column">
          <div class="reader-tools">
            <a :href="href('/library')"
              >{{ metadata?.category || "学习资料" }} /
              {{ metadata?.source || "个人复习" }}</a
            >
            <div class="reader-actions">
              <div class="reader-navigation">
                <button
                  class="text-button chapter-trigger"
                  aria-haspopup="dialog"
                  aria-controls="chapter-navigation"
                  @click="chapterSheet.showModal()"
                >章节导航</button>
                <button
                  class="text-button outline-trigger"
                  aria-haspopup="dialog"
                  aria-controls="page-outline"
                  @click="outlineSheet.showModal()"
                >本页目录</button>
              </div>
              <button
                class="text-button"
                :aria-pressed="study.data.focus"
                @click="toggleFocus"
              >
                {{ study.data.focus ? "退出专注" : "专注阅读" }}
                <span aria-hidden="true">{{
                  study.data.focus ? "↙" : "↗"
                }}</span>
              </button>
            </div>
          </div>
          <div
            v-if="page.relativePath === 'byte-agent/question-bank.md'"
            class="practice-entry"
          >
            <span>360 道题 · 21 个专题 · 个人自测</span
            ><a
              class="primary-button"
              :href="href('/byte-agent/practice?q=Q001')"
              >进入闭卷练习 ↗</a
            >
          </div>
          <Content class="vp-doc reader-body" />
          <nav class="reader-pagination" aria-label="相邻章节">
            <a v-if="adjacent.prev" :href="href(adjacent.prev.url)"
              ><small>← 上一章</small>{{ adjacent.prev.title }}</a
            ><a v-if="adjacent.next" :href="href(adjacent.next.url)"
              ><small>下一章 →</small>{{ adjacent.next.title }}</a
            >
          </nav>
          <div class="reading-return">
            <a :href="href('/reading-path')">← 回到学习路线</a
            ><a :href="href('/notes/project-defense')">联系自己的项目 ↗</a>
          </div>
        </div>
        <aside class="outline-rail" aria-label="本页目录">
          <p class="eyebrow">本页目录</p>
          <nav>
            <a
              v-for="heading in visibleOutline"
              :key="heading.id"
              :href="'#' + heading.id"
              :class="{ subheading: heading.level === 3 }"
              :aria-current="current === heading.id ? 'location' : undefined"
            >{{ heading.title }}</a>
          </nav>
        </aside>
      </div>
    </main>
    <footer class="site-footer">
      <div>
        <a class="footer-brand" :href="href('/')">面试复习库</a>
        <p>从理解，到自己的表达。</p>
      </div>
      <div class="footer-links">
        <a :href="href('/sources')">资料来源与版权</a
        ><a :href="href('/reading-path')">学习路线</a
        ><button class="text-button" @click="search">搜索文档</button>
      </div>
      <StateControls />
      <p class="footer-note">个人学习资料 · 第三方内容版权属于原作者</p>
    </footer>
    <dialog ref="mobileMenu" class="navigation-sheet">
      <div class="sheet-heading">
        <span>导航</span
        ><button
          class="icon-button"
          aria-label="关闭导航"
          @click="mobileMenu.close()"
        >
          ×
        </button>
      </div>
      <nav>
        <a
          v-for="item in theme.nav"
          :key="item.link"
          :href="href(item.link)"
          @click="mobileMenu.close()"
          >{{ item.text }} ↗</a
        ><a :href="href('/sources')" @click="mobileMenu.close()">资料来源</a>
      </nav>
      <button class="text-button" @click="search">搜索文档</button>
    </dialog>
    <dialog id="chapter-navigation" ref="chapterSheet" class="navigation-sheet reader-sheet chapter-sheet" aria-labelledby="chapter-sheet-title">
      <div class="sheet-heading">
        <span id="chapter-sheet-title">章节导航</span
        ><button
          class="icon-button"
          aria-label="关闭章节导航"
          @click="chapterSheet.close()"
        >
          ×
        </button>
      </div>
      <nav>
        <a
          v-for="chapter in chapters"
          :key="chapter.url"
          :href="href(chapter.url)"
          :aria-current="href(chapter.url) === cleanPath ? 'page' : undefined"
          @click="chapterSheet.close()"
          >{{ chapter.title }}</a
        >
      </nav>
    </dialog>
    <dialog id="page-outline" ref="outlineSheet" class="navigation-sheet reader-sheet outline-sheet" aria-labelledby="outline-sheet-title">
      <div class="sheet-heading">
        <span id="outline-sheet-title">本页目录</span
        ><button
          class="icon-button"
          aria-label="关闭本页目录"
          @click="outlineSheet.close()"
        >
          ×
        </button>
      </div>
      <nav>
        <a
          v-for="heading in visibleOutline"
          :key="heading.id"
          :href="'#' + heading.id"
          :class="{ subheading: heading.level === 3 }"
          :aria-current="current === heading.id ? 'location' : undefined"
          @click="outlineSheet.close()"
          >{{ heading.title }}</a
        >
      </nav>
    </dialog>
  </div>
</template>
