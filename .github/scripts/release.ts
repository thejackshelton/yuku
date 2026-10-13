// sets every package version, then commits, tags, and pushes, which starts the publish workflow

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $, Glob } from "bun";

const version = process.argv[2];
if (version === undefined || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error("usage: bun run release:npm <version>, such as 0.20.0 or 0.20.0-beta.1");
  process.exit(1);
}

const root = join(import.meta.dir, "..", "..");
for (const path of new Glob("npm/*/package.json").scanSync(root)) {
  const file = join(root, path);
  const manifest = JSON.parse(readFileSync(file, "utf8"));
  writeFileSync(file, JSON.stringify({ ...manifest, version }, null, 2) + "\n");
}

$.cwd(root);
await $`bun install`;
await $`git add npm bun.lock`;
await $`git commit --message ${version}`;
await $`git tag --annotate --message ${version} v${version}`;
await $`git push --follow-tags`;
