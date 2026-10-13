import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { analyze } from "yuku-analyzer";
import { walk } from "yuku-ast";
import { parse } from "yuku-parser";

// Yuku with src/parser/testing/dialect.zig compiled in, which test:dialect builds
const bytes = readFileSync(new URL("../../zig-out/dialect/bin/yuku.wasm", import.meta.url));
const wasm = new WebAssembly.Module(bytes);
const source = "each (item of items) { assert item |> f(%); }";

test("dialect nodes decode in the shapes their dialect declares", () => {
  const { program, diagnostics } = parse(source, { wasm, dialect: true });
  expect(diagnostics).toEqual([]);
  expect(program.body[0]).toMatchObject({
    type: "EachStatement",
    item: { type: "Identifier", name: "item" },
    list: { type: "Identifier", name: "items" },
    body: [
      {
        type: "AssertStatement",
        argument: {
          type: "PipelineExpression",
          operator: "|>",
          left: { type: "Identifier", name: "item" },
          right: { type: "CallExpression", arguments: [{ type: "TopicReference" }] },
        },
      },
    ],
  });
});

test("dialect nodes walk and analyze like standard ones", () => {
  const types: string[] = [];
  walk(parse(source, { wasm, dialect: true }).program, {
    enter(node) {
      types.push(node.type);
    },
  });
  expect(types).toEqual([
    "Program",
    "EachStatement",
    "Identifier",
    "Identifier",
    "AssertStatement",
    "PipelineExpression",
    "Identifier",
    "CallExpression",
    "Identifier",
    "TopicReference",
  ]);
  expect(analyze(source, { wasm, dialect: true }).diagnostics).toEqual([]);
});

test("a source that does not opt in parses as standard syntax", () => {
  expect(parse(source, { wasm }).diagnostics.length).toBeGreaterThan(0);
});
