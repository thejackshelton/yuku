import { Analyzer } from "./analyzer.js";

export { Analyzer };
export { BindingFlags } from "./decode.js";
export { ready } from "yuku-parser/wasm";

export function analyze(source, options = {}) {
  const { path = "", wasm, ...rest } = options;
  return new Analyzer({ wasm }).setFile(path, source, rest);
}
