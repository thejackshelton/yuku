import { BindingFlags as bindingFlags } from "../core/decode";
import type { FileOptions } from "../types";
import { Analyzer, type AnalyzerOptions, type ParseOptions } from "./analyzer";
import type { BindingFlagMap, Module } from "./module";

export { Analyzer };
export type { AnalyzerOptions, SetFileOptions } from "./analyzer";
export type {
  AsyncSemanticVisitors,
  AsyncSemanticWalkHandler,
  AsyncSemanticWalkHooks,
  Binding,
  Capture,
  Definition,
  Export,
  ExportKind,
  Import,
  ImportKind,
  Module,
  ModuleFlags,
  Reference,
  Scope,
  ScopeKind,
  SemanticVisitors,
  SemanticWalkContext,
  SemanticWalkHandler,
  SemanticWalkHooks,
  Space,
} from "./module";

export interface AnalyzeOptions extends FileOptions, ParseOptions, Pick<AnalyzerOptions, "wasm"> {}

/** Kinds and modifiers of a {@link Binding}, tested with `has` and `hasAll`. */
export const BindingFlags: BindingFlagMap = bindingFlags;

/** Analyzes one file. */
export function analyze(source: string | Uint8Array, options: AnalyzeOptions = {}): Module {
  const { path = "", wasm, ...rest } = options;
  return new Analyzer({ wasm }).setFile(path, source, rest);
}
