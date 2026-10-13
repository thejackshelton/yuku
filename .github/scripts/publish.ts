import { join } from "node:path";
import { $ } from "bun";

const directory = join(import.meta.dir, "..", "..", "packages", "yuku");

if (Bun.file(join(directory, "dist", "yuku.wasm")).size === 0) {
  console.error("packages/yuku/dist/yuku.wasm is missing, run `bun run build` first");
  process.exit(1);
}

const { version } = await Bun.file(join(directory, "package.json")).json();
const tag = /-([A-Za-z]+)/.exec(version)?.[1] ?? "latest";
await $`npm publish --access public --provenance --tag ${tag}`.cwd(directory);
