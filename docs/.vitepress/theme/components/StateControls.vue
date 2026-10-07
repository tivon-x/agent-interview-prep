<script setup>
import { ref } from "vue";
import { clearStudy, importStudy, study } from "../study-state.js";
const overwrite = ref(false);
const message = ref("");
const confirmDelete = ref(false);
function exportState() {
  const blob = new Blob([JSON.stringify(study.data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `study-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function importFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10000000) throw new Error("备份文件过大");
    importStudy(JSON.parse(await file.text()), overwrite.value);
    message.value = study.error || "已导入学习记录。";
  } catch (error) {
    message.value = `未导入：${error.message}。原记录保持不变。`;
  }
  event.target.value = "";
}
</script>
<template>
  <details class="state-controls">
    <summary>本地学习记录</summary>
    <p>草稿与阅读位置仅保存在此浏览器。清理浏览器数据前，请导出备份。</p>
    <p v-if="study.error" class="status-error" role="status">
      {{ study.error }}
    </p>
    <div class="state-actions">
      <button @click="exportState">导出备份</button
      ><label class="file-button"
        >导入备份<input
          type="file"
          accept="application/json,.json"
          aria-label="导入学习记录备份"
          @change="importFile" /></label
      ><button @click="confirmDelete = true">清除记录</button>
    </div>
    <label class="overwrite-label"
      ><input
        v-model="overwrite"
        type="checkbox"
      />导入时覆盖现有记录（默认只补充缺少的记录）</label
    >
    <p v-if="message" role="status">{{ message }}</p>
    <div v-if="confirmDelete" class="delete-confirm">
      <p>确认删除本站的阅读位置、草稿与自评？此操作无法撤销。</p>
      <button
        @click="
          clearStudy();
          confirmDelete = false;
        "
      >
        确认删除</button
      ><button @click="confirmDelete = false">取消</button>
    </div>
  </details>
</template>
