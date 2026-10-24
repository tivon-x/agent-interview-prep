<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { withBase } from "vitepress";
import { examStorageKey, maxExamBytes, examScopes, examCorrections, validateExamBank } from "../data/local-exams.js";

const props = defineProps({ scope: { type: String, default: "all" } });
const bank = ref(null), paperId = ref(""), number = ref(0);
const picked = ref(""), revealed = ref(false), busy = ref(false);
const error = ref(""), storageMessage = ref("");
const ready = ref(false);
const scope = computed(() => examScopes[props.scope] || examScopes.all);
const available = computed(() => (bank.value?.papers || []).filter(p => Object.hasOwn(scope.value, p.id)));
const questions = computed(() => {
  const list = available.value.find(p => p.id === paperId.value)?.questions || [];
  const numbers = scope.value[paperId.value];
  return numbers ? list.filter(q => numbers.includes(q.number)) : list;
});
const question = computed(() => questions.value.find(q => q.number === number.value));
const position = computed(() => questions.value.findIndex(q => q.number === number.value));
const correction = computed(() => examCorrections[`${paperId.value}-${number.value}`]);
const answer = computed(() => correction.value && Object.hasOwn(correction.value, "answer")
  ? correction.value.answer : question.value?.answer);
const count = computed(() => available.value.reduce((sum, p) => {
  const numbers = scope.value[p.id];
  return sum + p.questions.filter(q => !numbers || numbers.includes(q.number)).length;
}, 0));

watch([available, () => props.scope], () => {
  if (!available.value.some(p => p.id === paperId.value)) paperId.value = available.value[0]?.id || "";
}, { immediate: true });
watch(questions, () => {
  if (!questions.value.some(q => q.number === number.value)) number.value = questions.value[0]?.number || 0;
}, { immediate: true });
watch([bank, paperId, number, () => props.scope], () => { picked.value = ""; revealed.value = false; });

onMounted(() => {
  ready.value = true;
  try {
    const raw = localStorage.getItem(examStorageKey);
    if (raw) {
      if (raw.length > maxExamBytes) throw new Error("stored file too large");
      bank.value = validateExamBank(JSON.parse(raw));
    }
  } catch {
    storageMessage.value = "无法读取本地题目，请重新导入。已有学习记录不受影响。";
  }
});

async function importFile(event) {
  const input = event.target, file = input.files?.[0];
  if (!file || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    if (file.size > maxExamBytes) throw new Error("题目文件不能超过 2 MB。");
    const next = validateExamBank(JSON.parse(await file.text()));
    bank.value = next;
    try {
      const saved = JSON.stringify(next);
      localStorage.setItem(examStorageKey, saved);
      if (localStorage.getItem(examStorageKey) !== saved) throw new Error("storage readback failed");
      storageMessage.value = "已保存在当前浏览器，刷新或切换章节后可继续使用。";
    } catch {
      storageMessage.value = "题目已在本页打开，但浏览器未能保存。刷新后需要重新导入，请保留原文件。";
    }
  } catch (e) {
    error.value = e instanceof SyntaxError ? "文件不是有效的 JSON，原有题目仍保留。" : `${e.message} 原有题目仍保留。`;
  } finally {
    busy.value = false;
    input.value = "";
  }
}
function move(step) { number.value = questions.value[position.value + step].number; }
</script>

<template>
  <section class="local-exams" aria-label="本页原题练习">
    <div class="exam-topline">
      <div>
        <p class="exam-kicker">本页原题练习</p>
        <p class="exam-caption">{{ bank ? `本页可练 ${count} 题，沿用试卷原题号。` : '导入一次，在这里查看完整题干和选项。' }}</p>
      </div>
      <label class="file-button">
        {{ busy ? '正在读取' : !ready ? '正在准备' : bank ? '更换题目文件' : '导入题目文件' }}
        <input type="file" accept=".json,application/json" :disabled="busy || !ready" aria-label="导入本地题目文件" @change="importFile" />
      </label>
    </div>
    <p v-if="!bank" class="exam-help">选择本次整理的四套卷 JSON 文件。题目只保存在当前浏览器，不上传；换设备或清除浏览器数据后需要重新导入。</p>
    <p v-if="storageMessage" class="exam-caption" role="status">{{ storageMessage }}</p>
    <p v-if="error" class="exam-error" role="alert">{{ error }}</p>
    <template v-if="question">
      <div class="exam-selectors">
        <label>试卷
          <select v-model="paperId" aria-label="选择试卷">
            <option v-for="paper in available" :key="paper.id" :value="paper.id">{{ paper.id }} 卷</option>
          </select>
        </label>
        <label>原题号
          <select v-model="number" aria-label="选择原题号">
            <option v-for="q in questions" :key="q.number" :value="q.number">第 {{ q.number }} 题</option>
          </select>
        </label>
        <span class="exam-position">{{ position + 1 }} / {{ questions.length }}</span>
      </div>
      <article :key="`${paperId}-${number}`" class="exam-question">
        <p class="exam-question-label">{{ paperId }} 卷 · 原第 {{ number }} 题 <span v-if="correction">有复核说明</span></p>
        <p class="exam-stem">{{ question.stem }}</p>
        <fieldset class="exam-options">
          <legend class="sr-only">选择答案</legend>
          <label v-for="option in question.options" :key="option.label" :class="{ chosen: picked === option.label }">
            <input v-model="picked" type="radio" :name="`exam-${paperId}-${number}`" :value="option.label" />
            <span class="exam-letter">{{ option.label }}</span><span>{{ option.text }}</span>
          </label>
        </fieldset>
        <button class="text-button exam-reveal" type="button" :aria-expanded="revealed" aria-controls="local-exam-answer" @click="revealed = !revealed">{{ revealed ? '收起答案与解析' : '查看答案与解析' }}</button>
        <div v-if="revealed" id="local-exam-answer" class="exam-answer">
          <p v-if="picked">你的选择：{{ picked }}。{{ answer ? (picked === answer ? '与当前参考答案一致。' : '与当前参考答案不同，请比较推导。') : '本题有争议，暂不判对错。' }}</p>
          <template v-if="correction">
            <p><strong>{{ answer ? `复核参考：${answer}` : '暂不认定唯一答案' }}</strong><span class="exam-caption">（题库记录：{{ question.answer }}）</span></p>
            <p class="exam-analysis">{{ correction.text }}</p>
            <a :href="withBase(correction.link)">阅读复核说明</a>
          </template>
          <template v-else>
            <p><strong>题库答案：{{ question.answer }}</strong></p>
            <p class="exam-caption">以下为导入文件中的题库解析，未逐题独立核验；有冲突时以复习资料的复核说明为准。</p>
            <p class="exam-analysis">{{ question.analysis || '题库未提供文字解析。' }}</p>
          </template>
        </div>
      </article>
      <nav class="exam-pagination" aria-label="原题翻页">
        <button class="text-button" type="button" :disabled="position === 0" @click="move(-1)">← 上一题</button>
        <button class="text-button" type="button" :disabled="position === questions.length - 1" @click="move(1)">下一题 →</button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.local-exams { margin: 32px 0; padding: 24px 0; border-block: 1px solid var(--vp-c-divider); }
.exam-topline { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; }
.local-exams p { margin: 8px 0; }
.exam-kicker { font-weight: 600; color: var(--study-accent); }
.exam-caption, .exam-help, .exam-position { font-size: 13px; color: var(--vp-c-text-2); }
.exam-help { max-width: 64ch; }
.exam-error { color: var(--vp-c-danger-1, #a33b30); }
.exam-selectors { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; margin: 24px 0; }
.exam-selectors label { display: grid; gap: 6px; font-size: 13px; }
.exam-selectors select { min-height: 44px; min-width: 112px; padding: 6px 10px; border: 1px solid var(--vp-c-divider); border-radius: var(--radius-control); background: var(--vp-c-bg); color: var(--vp-c-text-1); }
.exam-position { margin-bottom: 12px; font-variant-numeric: tabular-nums; }
.exam-question-label { font-size: 13px; color: var(--vp-c-text-2); }
.exam-question-label span { margin-left: 8px; color: var(--study-accent); }
.exam-stem, .exam-analysis { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.85; }
.exam-options { padding: 0; margin: 20px 0 12px; border: 0; min-width: 0; }
.exam-options label { display: grid; grid-template-columns: 18px 20px minmax(0, 1fr); align-items: start; gap: 8px; padding: 12px 8px; border-bottom: 1px solid var(--vp-c-divider); cursor: pointer; font-size: 15px; line-height: 1.8; overflow-wrap: anywhere; white-space: pre-wrap; }
.exam-options label.chosen { background: var(--vp-c-brand-soft); }
.exam-options input { margin: 7px 0 0; accent-color: var(--study-accent); }
.exam-letter { font-weight: 600; }
.exam-reveal { min-height: 44px; }
.exam-answer { padding: 16px 0 8px; }
.exam-pagination { display: flex; justify-content: space-between; gap: 16px; margin-top: 20px; }
.exam-pagination button { min-height: 44px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
@media (max-width: 420px) {
  .exam-topline { align-items: start; }
  .exam-selectors { gap: 12px; }
  .exam-selectors select { min-width: 100px; }
}
</style>
