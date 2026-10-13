import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yuku";

test("the inlined module parses as the shipped yuku.wasm does", () => {
  const bytes = readFileSync(new URL("../../packages/yuku/dist/yuku.wasm", import.meta.url));
  const wasm = new WebAssembly.Module(bytes);
  const source = "const x: number = 1;";
  expect(parse(source, { lang: "ts", wasm })).toEqual(parse(source, { lang: "ts" }));
});
