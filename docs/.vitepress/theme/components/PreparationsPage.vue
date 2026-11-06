<script setup>
import { withBase } from "vitepress";
import { data as catalog } from "../data/catalog.data.js";

const companies = new Map();
for (const page of catalog.filter((page) => page.preparation)) {
  const { company } = page.preparation;
  if (!companies.has(company)) companies.set(company, []);
  companies.get(company).push(page);
}
</script>

<template>
  <div class="preparations-page work-page">
    <header class="page-heading">
      <h1>岗位专项</h1>
      <p>按公司和岗位找面试、笔试与复盘资料。</p>
    </header>
    <section v-for="[company, entries] in companies" :key="company" class="preparation-group">
      <h2>{{ company }}</h2>
      <ul class="preparation-list">
        <li v-for="entry in entries" :key="entry.url">
          <a :href="withBase(entry.url)">
            <div>
              <strong>{{ entry.preparation.role }}</strong>
              <p v-if="entry.description">{{ entry.description }}</p>
            </div>
            <span class="preparation-stage">{{ entry.preparation.stage }}<span v-if="entry.preparation.active"> · 正在准备</span></span>
            <span class="outline-arrow" aria-hidden="true">→</span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>
