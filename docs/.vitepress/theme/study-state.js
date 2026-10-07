import { reactive } from "vue";

export const storageKey = "agent-interview-prep:study:v1";
const empty = () => ({ version: 1, focus: false, reading: {}, questions: {} });
export const study = reactive({ data: empty(), error: "", ready: false });
let writable = true;
export function validateState(value) {
  if (
    !value ||
    value.version !== 1 ||
    typeof value.focus !== "boolean" ||
    !value.reading ||
    typeof value.reading !== "object" ||
    !value.questions ||
    typeof value.questions !== "object" ||
    Array.isArray(value.reading) ||
    Array.isArray(value.questions)
  )
    throw new Error("备份格式或版本不正确");
  const clean = empty();
  clean.focus = value.focus;
  for (const [url, record] of Object.entries(value.reading)) {
    if (
      !url.startsWith("/agent-interview-prep/") ||
      /[?#]/.test(url) ||
      !record ||
      typeof record.anchor !== "string" ||
      !Number.isFinite(record.offset) ||
      record.offset < -1000 ||
      !Number.isFinite(record.updatedAt)
    )
      throw new Error("阅读记录格式不正确");
    clean.reading[url] = {
      anchor: record.anchor,
      offset: record.offset,
      updatedAt: record.updatedAt,
    };
  }
  for (const [id, record] of Object.entries(value.questions)) {
    if (
      !/^Q\d{3}$/.test(id) ||
      Number(id.slice(1)) < 1 ||
      Number(id.slice(1)) > 360 ||
      !record ||
      typeof record.draft !== "string" ||
      record.draft.length > 200000 ||
      ![null, "尚未掌握", "需要复习", "能讲清楚"].includes(record.rating) ||
      !Number.isFinite(record.updatedAt)
    )
      throw new Error("题目记录格式不正确");
    clean.questions[id] = {
      draft: record.draft,
      rating: record.rating,
      updatedAt: record.updatedAt,
    };
  }
  return clean;
}
export function initStudy() {
  if (study.ready) return;
  study.ready = true;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) study.data = validateState(JSON.parse(raw));
  } catch {
    writable = false;
    study.error =
      "无法读取学习记录。当前输入仍保留在此页面，请导出备份后再恢复存储。";
  }
}
export function saveStudy(merge = true) {
  if (!study.ready) return false;
  try {
    if (!writable) throw new Error("storage disabled");
    const remote = localStorage.getItem(storageKey);
    if (remote && merge) {
      const latest = validateState(JSON.parse(remote));
      for (const collection of ["reading", "questions"]) {
        for (const [id, record] of Object.entries(latest[collection])) {
          if (
            !study.data[collection][id] ||
            record.updatedAt > study.data[collection][id].updatedAt
          )
            study.data[collection][id] = record;
        }
      }
    }
    localStorage.setItem(storageKey, JSON.stringify(study.data));
    study.error = "";
    return true;
  } catch {
    study.error = "记录未保存到浏览器。当前输入仍在，请导出备份。";
    return false;
  }
}
export function saveAnswer(id, draft, rating = null) {
  study.data.questions[id] = { draft, rating, updatedAt: Date.now() };
  saveStudy();
}
export function importStudy(value, overwrite) {
  const valid = validateState(value);
  study.data = {
    version: 1,
    focus: overwrite ? valid.focus : study.data.focus,
    reading: overwrite
      ? valid.reading
      : { ...valid.reading, ...study.data.reading },
    questions: overwrite
      ? valid.questions
      : { ...valid.questions, ...study.data.questions },
  };
  saveStudy(false);
}
export function clearStudy() {
  try {
    localStorage.removeItem(storageKey);
    writable = true;
    study.data = empty();
    study.error = "";
  } catch {
    study.error = "浏览器阻止了删除，原记录仍保留。";
  }
}
