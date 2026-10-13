import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "parser/index.ts",
    analyzer: "analyzer/index.ts",
    ast: "ast/index.ts",
    codegen: "codegen/index.ts",
    types: "types/index.ts",
    "module/browser": "core/module/browser.ts",
    "module/node": "core/module/node.ts",
    "module/workerd": "core/module/workerd.ts",
  },
  outDir: "dist",
  clean: true,
  format: "esm",
  platform: "neutral",
  target: "es2020",
  hash: false,
  treeshake: true,
  copy: [{ from: "core/yuku.wasm", to: "dist" }],
  deps: { neverBundle: [/^#/, "node:fs"] },
  outputOptions: { chunkFileNames: "shared/[name].js" },
});
