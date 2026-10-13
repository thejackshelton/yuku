import { expect, test } from "bun:test";
import { parse } from "yuku-parser";
import * as browser from "../../npm/yuku-parser/module/browser.js";

test("the browser entry loads the module", async () => {
  await browser.ready;
  const source = "const x: number = 1;";
  expect(parse(source, { lang: "ts", wasm: browser.yuku! })).toEqual(parse(source, { lang: "ts" }));
});
