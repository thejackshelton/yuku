import { ready, yuku } from "#module";

export { ready };

const LANGS = { js: 0, ts: 1, jsx: 2, tsx: 3, dts: 4 };
const SOURCE_TYPES = { script: 0, module: 1, commonjs: 2 };

// linear memory never shrinks, so a source needing far less (at most 64 bytes per character)
// gets a fresh instance
const MEMORY_BYTES_MAX = 128 * 1024 * 1024;

const encoder = new TextEncoder();
const instances = new WeakMap();

export function langFromPath(path) {
  if (/\.d\.[cm]?ts$/.test(path)) return "dts";
  if (path.endsWith(".tsx")) return "tsx";
  if (/\.[cm]?ts$/.test(path)) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  return "js";
}

export function sourceTypeFromPath(path) {
  return /\.c[jt]s$/.test(path) ? "commonjs" : "module";
}

// runs the `parse` or `analyze` export, returning the buffer its decoder reads
export function run(entry, source, options) {
  const module = options.wasm ?? yuku;
  if (module === null) {
    throw new Error("yuku-parser: the WebAssembly has not loaded, `await ready` before parsing");
  }
  const flags = flagsOf(options);
  let exports = instances.get(module);
  if (
    exports === undefined ||
    (exports.memory.buffer.byteLength > MEMORY_BYTES_MAX && source.length * 64 < MEMORY_BYTES_MAX)
  ) {
    exports = new WebAssembly.Instance(module).exports;
    instances.set(module, exports);
  }

  const { memory, alloc, free } = exports;
  const capacity = source.length * 3 || 1;
  const pointer = alloc(capacity);
  const view = new Uint8Array(memory.buffer, pointer, capacity);
  const result = exports[entry](pointer, encoder.encodeInto(source, view).written, flags);
  free(pointer, capacity);
  if (result === 0) throw new Error("yuku-parser: out of memory");
  const size = new DataView(memory.buffer).getUint32(result, true);
  const buffer = memory.buffer.slice(result + 4, result + 4 + size);
  free(result, 4 + size);
  return buffer;
}

function flagsOf(options) {
  const path = options.path ?? "";
  const lang = LANGS[options.lang ?? langFromPath(path)];
  if (lang === undefined) {
    throw new TypeError('`lang` must be "js", "jsx", "ts", "tsx", or "dts"');
  }
  const sourceType = SOURCE_TYPES[options.sourceType ?? sourceTypeFromPath(path)];
  if (sourceType === undefined) {
    throw new TypeError('`sourceType` must be "module", "script", or "commonjs"');
  }
  let flags = sourceType | (lang << 2);
  if (options.preserveParens !== false) flags |= 1 << 5;
  if (options.semanticErrors) flags |= 1 << 6;
  if (options.attachComments) flags |= 1 << 7;
  if (options.tokens) flags |= 1 << 8;
  if (options.dialect) flags |= 1 << 9;
  return flags;
}
