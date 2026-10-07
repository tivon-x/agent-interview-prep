import DefaultTheme from "vitepress/theme-without-fonts";
import StudyLayout from "./StudyLayout.vue";
import { defineAsyncComponent } from "vue";
import "./custom.css";

export default {
  ...DefaultTheme,
  Layout: StudyLayout,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp(ctx);
    ctx.app.component(
      "Mermaid",
      defineAsyncComponent(() => import("./components/StudyMermaid.vue")),
    );
  },
};
