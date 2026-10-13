import { ready, yuku } from "#module";

export { ready };

const LANGS = { js: 0, ts: 1, jsx: 2, tsx: 3, dts: 4 };
const SOURCE_TYPES = { script: 0, module: 1, commonjs: 2 };

// linear memory never shrinks, so a source needing far less (at most 64 bytes per character)
// gets a fresh instance
const MEMORY_BYTES_MAX = 128 * 1024 * 1024;

const encoder = new TextEncoder();
const utf8 = new TextDecoder();
const instances = new WeakMap();
const dialects = new WeakMap();

// the child keys yuku-ast walks a node type by, which a dialect's shapes extend
const childKeys =
  globalThis[Symbol.for("yuku.childKeys")] ||
  (globalThis[Symbol.for("yuku.childKeys")] = Object.create(null));

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

// runs the `parse` or `analyze` export and decodes its buffer
export function run(entry, source, options, decode) {
  const module = options.wasm ?? yuku;
  if (module === null) {
    throw new Error("yuku-parser: the WebAssembly has not loaded, `await ready` before parsing");
  }
  let exports = instances.get(module);
  if (
    exports === undefined ||
    (exports.memory.buffer.byteLength > MEMORY_BYTES_MAX && source.length * 64 < MEMORY_BYTES_MAX)
  ) {
    exports = new WebAssembly.Instance(module).exports;
    instances.set(module, exports);
  }
  const dialect = dialectOf(module, exports);

  const { memory, alloc, free } = exports;
  const capacity = source.length * 3 || 1;
  const pointer = alloc(capacity);
  const view = new Uint8Array(memory.buffer, pointer, capacity);
  const written = encoder.encodeInto(source, view).written;
  const result = exports[entry](pointer, written, flagsOf(options, dialect));
  free(pointer, capacity);
  if (result === 0) throw new Error("yuku-parser: out of memory");
  const size = new DataView(memory.buffer).getUint32(result, true);
  const buffer = memory.buffer.slice(result + 4, result + 4 + size);
  free(result, 4 + size);
  return decode(buffer, source, options.path || null, dialect?.shapes ?? null);
}

// the dialect a module has compiled in, `{ files, shapes }` or null
function dialectOf(module, exports) {
  let dialect = dialects.get(module);
  if (dialect !== undefined) return dialect;
  const pointer = exports.dialect();
  dialect = null;
  if (pointer !== 0) {
    const size = new DataView(exports.memory.buffer).getUint32(pointer, true);
    dialect = JSON.parse(utf8.decode(new Uint8Array(exports.memory.buffer, pointer + 4, size)));
    for (const shape of dialect.shapes) {
      const keys = childKeys[shape.type];
      if (keys === undefined) childKeys[shape.type] = shape.fields;
      else for (const field of shape.fields) if (!keys.includes(field)) keys.push(field);
    }
  }
  dialects.set(module, dialect);
  return dialect;
}

function flagsOf(options, dialect) {
  const path = options.path ?? "";
  const file = options.lang === undefined && dialect !== null ? fileOf(dialect, path) : undefined;
  const lang = LANGS[options.lang ?? file?.lang ?? langFromPath(path)];
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
  if (file !== undefined) flags |= 1 << 9;
  return flags;
}

// the dialect's kind of file at `path`, its first for a source with no path
function fileOf(dialect, path) {
  if (path === "") return dialect.files[0];
  return dialect.files.find((file) => path.endsWith(file.extension));
}
