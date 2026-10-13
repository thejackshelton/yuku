import type {
  BaseNode,
  Comment,
  Diagnostic,
  FileOptions,
  Program,
  SourceLang,
  SourceType,
  TokenKindMap,
  TokenList,
} from "@yuku-toolchain/types";

export * from "@yuku-toolchain/types";

interface ParseOptions extends FileOptions {
  /**
   * The build of Yuku that parses, such as one with a dialect compiled in. See
   * https://yuku.fyi/parser/dialect/#javascript.
   * @default the module yuku-parser ships
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

interface ParseResult {
  program: Program;
  /** Every comment, in source order. */
  comments: Comment[];
  /** Every token, with {@link ParseOptions.tokens}. */
  tokens?: TokenList;
  diagnostics: Diagnostic[];
}

export function parse(source: string, options?: ParseOptions): ParseResult;

/** Every token kind by name, `tokens.kind(i) === TokenKind.Arrow`. */
export const TokenKind: TokenKindMap;
export type TokenKind = TokenKindMap[keyof TokenKindMap];

/**
 * Resolves once the WebAssembly is compiled. A browser compiles it after import, so it awaits
 * `ready` before the first parse. Node.js, Bun, Deno, and Workers compile it on import.
 */
export const ready: Promise<void>;

/** The `lang` a path implies: `"dts"`, `"tsx"`, `"ts"`, `"jsx"`, or `"js"`. */
export function langFromPath(path: string): SourceLang;

/** The `sourceType` a path implies: `"commonjs"` for `.cjs` and `.cts`, else `"module"`. */
export function sourceTypeFromPath(path: string): SourceType;

export type { ParseOptions, ParseResult };
