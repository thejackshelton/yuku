import { readFileSync } from "node:fs";

export const yuku: WebAssembly.Module = new WebAssembly.Module(
  readFileSync(new URL("../yuku.wasm", import.meta.url)),
);
export const ready: Promise<void> = Promise.resolve();
