import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { parse } from "yuku";
import { decodeBase64 } from "../../packages/yuku/core/base64";

const shipped = readFileSync(new URL("../../packages/yuku/dist/yuku.wasm", import.meta.url));

test("the inlined module parses as the shipped yuku.wasm does", () => {
  const wasm = new WebAssembly.Module(shipped);
  const source = "const x: number = 1;";
  expect(parse(source, { lang: "ts", wasm })).toEqual(parse(source, { lang: "ts" }));
});

// the fallback runs only without a native decoder, so it is held to Buffer on every length
// through 64 bytes, each padding among them, and on the module it inlines
test("the JavaScript base64 decoder matches Buffer", () => {
  for (let length = 0; length <= 64; length++) {
    const bytes = Buffer.from(Array.from({ length }, (_, i) => (i * 167 + length * 31) & 255));
    expect(Buffer.from(decodeBase64(bytes.toString("base64")))).toEqual(bytes);
  }
  expect(Buffer.from(decodeBase64(shipped.toString("base64")))).toEqual(shipped);
});

// WebContainers' encodeInto repeats its last count for an empty string, so both writers do that
// here and an empty source after a longer one must still parse empty
test("an empty source parses empty when the writer repeats its last count", () => {
  const encodeInto = TextEncoder.prototype.encodeInto;
  const write = Buffer.prototype.write;
  let encoded = { read: 0, written: 0 };
  let wrote = 0;
  TextEncoder.prototype.encodeInto = function (source, view) {
    if (source) encoded = encodeInto.call(this, source, view);
    return encoded;
  };
  Buffer.prototype.write = function (this: Buffer, ...args: Parameters<typeof write>) {
    if (args[0]) wrote = write.apply(this, args);
    return wrote;
  } as typeof write;
  try {
    expect(parse("const answer = 42;").program.body).toHaveLength(1);
    expect(parse("").program.body).toEqual([]);
    expect(parse("").diagnostics).toEqual([]);
  } finally {
    TextEncoder.prototype.encodeInto = encodeInto;
    Buffer.prototype.write = write;
  }
});
