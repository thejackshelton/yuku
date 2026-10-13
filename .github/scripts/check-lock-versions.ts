import { readFileSync } from "node:fs";
import { join } from "node:path";

interface WorkspaceEntry {
  name?: string;
  version?: string;
}

interface BunLock {
  workspaces: Record<string, WorkspaceEntry>;
}

interface PackageManifest {
  name: string;
  version: string;
}

const root = join(import.meta.dir, "..", "..");

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8")) as T;

// bun.lock is JSON with trailing commas
const lockText = readFileSync(join(root, "bun.lock"), "utf8");
const lock = JSON.parse(lockText.replace(/,(\s*[}\]])/g, "$1")) as BunLock;

const stale: string[] = [];

for (const [directory, entry] of Object.entries(lock.workspaces)) {
  if (directory === "" || !entry.version) continue;
  const manifest = readJson<PackageManifest>(join(root, directory, "package.json"));
  if (entry.version !== manifest.version) {
    stale.push(
      `${manifest.name}: bun.lock has ${entry.version}, ` +
        `${directory}/package.json has ${manifest.version}`,
    );
  }
}

if (stale.length > 0) {
  console.error("bun.lock is out of sync with workspace package versions:\n");
  for (const line of stale) console.error(`  ${line}`);
  console.error(
    "\n`bun pm pack` resolves workspace deps from bun.lock (oven-sh/bun#20477)," +
      "\nso publishing with a stale lockfile pins dependencies to the previous release." +
      "\nFix: rm bun.lock && bun install, then commit the regenerated lockfile.",
  );
  process.exit(1);
}

const count = Object.keys(lock.workspaces).length - 1;
console.log(`bun.lock workspace versions match package.json (${count} packages)`);
