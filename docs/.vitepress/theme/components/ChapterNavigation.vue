<script setup>
import { withBase } from "vitepress";
import { pagePath } from "../data/navigation.js";

const props = defineProps({ items: Array, current: String, numbered: Boolean });
defineEmits(["navigate"]);
const href = (url) => withBase(encodeURI(decodeURI(url)));
const active = (item) => item.children
  ? item.children.some(active)
  : pagePath(href(item.url)) === props.current;
</script>

<template>
  <template v-for="(item, index) in items" :key="item.url || item.title">
    <details v-if="item.children" class="chapter-group" :open="active(item)">
      <summary>{{ item.title }}</summary>
      <div class="chapter-children">
        <ChapterNavigation :items="item.children" :current="current" @navigate="$emit('navigate')" />
      </div>
    </details>
    <a v-else :href="href(item.url)" :aria-current="active(item) ? 'page' : undefined" @click="$emit('navigate')">
      <span v-if="numbered" class="rail-number">{{ String(index + 1).padStart(2, "0") }}</span>{{ item.title }}
    </a>
  </template>
</template>
