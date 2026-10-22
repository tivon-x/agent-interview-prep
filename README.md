# AI / Agent 面试复习库

个人面试复习项目，面向 AI 应用开发、Agent 工程、RAG、数据平台与 Python 后端岗位。站点使用 VitePress，复习顺序是先按[资料阅读路线](docs/reading-path.md)读完站内资料和个人笔记，再闭卷做 360 道题，最后对照解析。

- `docs/materials/`：从公开资料截取的一次性快照，保留来源与许可证。
- `docs/notes/`：自己维护的 ML/DL 基础、笔试计算与编程、前沿技术、项目深挖和后端复习内容。
- ML/DL 从 [机器学习六章](docs/notes/ml-basics/index.md)和[深度学习六章](docs/notes/dl-basics/index.md)开始，再做[笔试专项](docs/notes/ml-dl-practice/index.md)。
- `docs/byte-agent/`：资料读完后的 360 题题库与解析。
- `.local-sources/`：仅本地参考、不进入 GitHub 的资料。

## 本地预览

```powershell
npm ci
npm run dev
```

## 构建检查

```powershell
npm run build
npm run preview
```

第三方资料是精选快照，部分原站章节未收录，快照中的相关链接可能需要回原站查看。

资料库以资料来源为主入口，沿资料原有目录进入章节；专题仅用于筛选。文章目录和相邻章节共用同一份目录数据，返回资料库时保留来源。

导航回归可在构建并启动预览后运行 `npm run verify:navigation`；截图、检查结果与浏览器 trace 保存在 `output/playwright/navigation/`。

本站用于个人学习。第三方资料的版权属于原作者，具体来源见[资料索引](docs/sources.md)。
