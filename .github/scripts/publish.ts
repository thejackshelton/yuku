// publishes dependencies first, packed by bun so workspace versions resolve

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $, Glob } from "bun";

interface PackageManifest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
}

const root = join(import.meta.dir, "..", "..");

if (Bun.file(join(root, "npm/yuku-parser/yuku.wasm")).size === 0) {
  console.error("npm/yuku-parser/yuku.wasm is missing, run `bun run build` first");
  process.exit(1);
}

const packages = [...new Glob("npm/*/package.json").scanSync(root)].map((path) => ({
  directory: join(root, path, ".."),
  manifest: JSON.parse(readFileSync(join(root, path), "utf8")) as PackageManifest,
}));
const names = new Set(packages.map(({ manifest }) => manifest.name));
const version = packages[0]!.manifest.version;
const tag = /-([A-Za-z]+)/.exec(version)?.[1] ?? "latest";
const tarballs = mkdtempSync(join(tmpdir(), "yuku-publish-"));

const published = new Set<string>();
const awaits = (dependency: string) => names.has(dependency) && !published.has(dependency);
while (published.size < packages.length) {
  const ready = packages.filter(
    ({ manifest }) =>
      !published.has(manifest.name) && !Object.keys(manifest.dependencies ?? {}).some(awaits),
  );
  if (ready.length === 0) throw new Error("the packages depend on each other in a cycle");
  for (const { directory, manifest } of ready) {
    const tarball = join(tarballs, `${manifest.name.replace("/", "-")}.tgz`);
    await $`bun pm pack --filename ${tarball} --quiet`.cwd(directory);
    await $`npm publish ${tarball} --access public --provenance --tag ${tag}`;
    published.add(manifest.name);
  }
}
