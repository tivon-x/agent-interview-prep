<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useData } from "vitepress";
const props = defineProps({ graph: String });
const { isDark, frontmatter } = useData();
const container = ref(),
  svg = ref(""),
  error = ref("");
let observer,
  visible = false,
  generation = 0,
  destroyed = false;
async function render() {
  if (!visible || destroyed) return;
  const version = ++generation;
  try {
    const { default: mermaid } = await import("mermaid");
    if (version !== generation || destroyed) return;
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: isDark.value
        ? "dark"
        : frontmatter.value.mermaidTheme || "neutral",
      fontFamily: "Microsoft YaHei, sans-serif",
    });
    const { svg: result } = await mermaid.render(
      "study-" + crypto.randomUUID(),
      decodeURIComponent(props.graph),
    );
    if (version === generation && !destroyed) {
      svg.value = result;
      error.value = "";
    }
    await nextTick();
  } catch (e) {
    if (!destroyed) error.value = "图示无法绘制，可展开查看原始图示文本。";
  }
}
onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        visible = true;
        observer.disconnect();
        render();
      }
    },
    { rootMargin: "200px" },
  );
  observer.observe(container.value);
});
watch([isDark, () => props.graph], render);
onUnmounted(() => {
  destroyed = true;
  generation++;
  observer?.disconnect();
});
</script>
<template>
  <figure ref="container" class="study-diagram">
    <div v-if="svg" class="mermaid" v-html="svg" />
    <p v-else class="diagram-status" role="status">
      {{ error || "图示将在阅读到此处时加载。" }}
    </p>
    <details v-if="error">
      <summary>查看图示文本</summary>
      <pre>{{ decodeURIComponent(graph) }}</pre>
    </details>
  </figure>
</template>
