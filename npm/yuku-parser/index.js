import { decode } from "./decode.js";
import { run } from "./wasm.js";

export { langFromPath, ready, sourceTypeFromPath } from "./wasm.js";
export { TokenKind } from "./decode.js";

const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export function parse(source, options = {}) {
  const text = typeof source === "string" ? source : utf8.decode(source);
  return run("parse", text, options, decode);
}
