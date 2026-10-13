import { TokenKind as tokenKind } from "../core/decode";
import { run, sourceText } from "../core/wasm";
import type {
  BaseNode,
  Comment,
  Diagnostic,
  FileOptions,
  Program,
  TokenKindMap,
  TokenList,
} from "../types";

export type * from "../types";
export { langFromPath, sourceTypeFromPath } from "../core/wasm";

export interface ParseOptions extends FileOptions {
  /**
   * The build of Yuku that parses, such as one with a dialect compiled in. See
   * https://yuku.fyi/parser/dialect/#javascript.
   * @default the module yuku ships
   */
  wasm?: WebAssembly.Module;
  /**
   * Keep `ParenthesizedExpression` nodes. When false, only the inner expression is kept.
   * @default true
   */
  preserveParens?: boolean;
  /**
   * Also report the early errors that need scopes, such as redeclarations.
   * @default false
   */
  semanticErrors?: boolean;
  /**
   * Also attach each comment to its node. See {@link BaseNode.comments}.
   * @default false
   */
  attachComments?: boolean;
  /**
   * Keep every token in {@link ParseResult.tokens}.
   * @default false
   */
  tokens?: boolean;
}

export interface ParseResult {
  program: Program;
  /** Every comment, in source order. */
  comments: Comment[];
  /** Every token, with {@link ParseOptions.tokens}. */
  tokens?: TokenList;
  diagnostics: Diagnostic[];
}

/** Every token kind by name, `tokens.kind(i) === TokenKind.Arrow`. */
export const TokenKind: TokenKindMap = tokenKind;
export type TokenKind = TokenKindMap[keyof TokenKindMap];

/** Parses JavaScript or TypeScript into an ESTree program. */
export function parse(source: string | Uint8Array, options: ParseOptions = {}): ParseResult {
  return run("parse", sourceText(source), options);
}
