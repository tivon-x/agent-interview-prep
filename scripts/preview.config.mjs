import { defineConfig } from "vite";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import site from "../docs/.vitepress/config.mjs";

// VitePress preview compresses the large search index on every request.
// Vite's static preview keeps cold search usable and preserves the site's 404.
export default defineConfig({
  root: "docs",
  base: site.base,
  appType: "mpa",
  build: { outDir: ".vitepress/dist" },
  preview: { strictPort: true },
  plugins: [
    {
      name: "study-preview-404",
      configurePreviewServer(server) {
        const html = readFileSync(
          new URL("../docs/.vitepress/dist/404.html", import.meta.url),
        );
        return () =>
          server.middlewares.use((req, res, next) => {
            // Vite rewrites clean document URLs before its HTML middleware.
            const pathname = decodeURIComponent(
              new URL(req.url, "http://localhost").pathname,
            );
            const dist = fileURLToPath(
              new URL("../docs/.vitepress/dist/", import.meta.url),
            );
            if (pathname.endsWith(".html") && existsSync(join(dist, pathname)))
              return next();
            res.statusCode = 404;
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.end(html);
          });
      },
    },
  ],
});
