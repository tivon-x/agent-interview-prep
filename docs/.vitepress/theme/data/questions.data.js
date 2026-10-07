import { loadQuestions, questionFiles } from "./questions.js";
export default {
  watch: questionFiles,
  async load() {
    return (await loadQuestions()).index;
  },
};
