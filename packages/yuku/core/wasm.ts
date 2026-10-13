import { ready as loaded, yuku } from "#module";
import type { ParseResult } from "../parser";
import type { SourceLang, SourceType } from "../types";
import { addChildKeys } from "./child-keys";
import { decode, type Decoded } from "./decode";

export interface RunOptions {
  path?: string;
  lang?: SourceLang;
  sourceType?: SourceType;
  wasm?: WebAssembly.Module;
  preserveParens?: boolean;
  semanticErrors?: boolean;
  attachComments?: boolean;
  tokens?: boolean;
}

export interface Shape {
  type: string;
  fields: string[];
  list: number;
  properties: Record<string, unknown>;
}

interface Dialect {
  files: { extension: string; lang: SourceLang }[];
  shapes: Shape[];
}

interface Exports {
  memory: WebAssembly.Memory;
  alloc(len: number): number;
  free(pointer: number, len: number): void;
  parse(pointer: number, len: number, flags: number): number;
  analyze(pointer: number, len: number, flags: number): number;
  dialect(): number;
}

/**
 * Resolves once the WebAssembly is compiled. A browser compiles it after import, so it awaits
 * `ready` before the first parse. Node.js, Bun, Deno, and Workers compile it on import.
 */
export const ready: Promise<void> = loaded;

const LANGS: Record<string, number> = { js: 0, ts: 1, jsx: 2, tsx: 3, dts: 4 };
const SOURCE_TYPES: Record<string, number> = { script: 0, module: 1, commonjs: 2 };

// memory never shrinks, so a source needing far less, at most 64 bytes a character, starts fresh
const MEMORY_BYTES_MAX = 128 * 1024 * 1024;

const encoder = new TextEncoder();
const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
const instances = new WeakMap<WebAssembly.Module, Exports>();
const dialects = new WeakMap<WebAssembly.Module, Dialect | null>();

/** The `lang` a path implies: `"dts"`, `"tsx"`, `"ts"`, `"jsx"`, or `"js"`. */
export function langFromPath(path: string): SourceLang {
  if (/\.d\.[cm]?ts$/.test(path)) return "dts";
  if (path.endsWith(".tsx")) return "tsx";
  if (/\.[cm]?ts$/.test(path)) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  return "js";
}

/** The `sourceType` a path implies: `"commonjs"` for `.cjs` and `.cts`, else `"module"`. */
export function sourceTypeFromPath(path: string): SourceType {
  return /\.c[jt]s$/.test(path) ? "commonjs" : "module";
}

export function sourceText(source: string | Uint8Array): string {
  return typeof source === "string" ? source : utf8.decode(source);
}

export function run(entry: "parse", source: string, options: RunOptions): ParseResult;
export function run(entry: "analyze", source: string, options: RunOptions): Decoded;
export function run(
  entry: "parse" | "analyze",
  source: string,
  options: RunOptions,
): ParseResult | Decoded {
  const module = options.wasm ?? yuku;
  if (module === null) {
    throw new Error("yuku: the WebAssembly has not loaded, `await ready` before parsing");
  }
  let exports = instances.get(module);
  if (
    exports === undefined ||
    (exports.memory.buffer.byteLength > MEMORY_BYTES_MAX && source.length * 64 < MEMORY_BYTES_MAX)
  ) {
    exports = new WebAssembly.Instance(module).exports as unknown as Exports;
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
  if (result === 0) throw new Error("yuku: out of memory");
  const size = new DataView(memory.buffer).getUint32(result, true);
  const buffer = memory.buffer.slice(result + 4, result + 4 + size);
  free(result, 4 + size);
  return decode(buffer, source, options.path || null, dialect?.shapes ?? null);
}

function dialectOf(module: WebAssembly.Module, exports: Exports): Dialect | null {
  let dialect = dialects.get(module);
  if (dialect !== undefined) return dialect;
  const pointer = exports.dialect();
  dialect = null;
  if (pointer !== 0) {
    const size = new DataView(exports.memory.buffer).getUint32(pointer, true);
    const json = utf8.decode(new Uint8Array(exports.memory.buffer, pointer + 4, size));
    dialect = JSON.parse(json) as Dialect;
    for (const shape of dialect.shapes) addChildKeys(shape.type, shape.fields);
  }
  dialects.set(module, dialect);
  return dialect;
}

function flagsOf(options: RunOptions, dialect: Dialect | null): number {
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

// a source with no path is the dialect's first kind of file
function fileOf(dialect: Dialect, path: string): Dialect["files"][number] | undefined {
  if (path === "") return dialect.files[0];
  return dialect.files.find((file) => path.endsWith(file.extension));
}
