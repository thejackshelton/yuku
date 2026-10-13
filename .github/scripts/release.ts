import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const version = process.argv[2];
if (version === undefined || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(version)) {
  console.error("usage: bun run release:npm <version>, such as 0.20.0 or 0.20.0-beta.1");
  process.exit(1);
}

const root = join(import.meta.dir, "..", "..");
const manifestPath = join(root, "packages", "yuku", "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
writeFileSync(manifestPath, JSON.stringify({ ...manifest, version }, null, 2) + "\n");

$.cwd(root);
await $`bun install`;
await $`git add packages/yuku/package.json bun.lock`;
await $`git commit --message ${version}`;
await $`git tag --annotate --message ${version} v${version}`;
await $`git push --follow-tags`;
