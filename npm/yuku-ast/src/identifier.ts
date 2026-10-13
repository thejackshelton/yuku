const ID_START = /^[$_\p{ID_Start}]$/u;
const ID_CONTINUE = /^[$\u200C\u200D\p{ID_Continue}]$/u;
const IDENTIFIER_NAME = /^[$_\p{ID_Start}][$\u200C\u200D\p{ID_Continue}]*$/u;

const CODE_POINT_MAX = 0x10ffff;

/**
 * True if the code point `cp`, as from `codePointAt`, can start an
 * identifier: any `ID_Start` character, plus `$` and `_`.
 */
export function isIdentifierStart(cp: number): boolean {
  if (!Number.isInteger(cp) || cp < 0 || cp > CODE_POINT_MAX) return false;
  return ID_START.test(String.fromCodePoint(cp));
}

/**
 * True if the code point `cp` can follow the first character of an
 * identifier: any `ID_Continue` character, plus `$`, `_`, ZWNJ, and ZWJ.
 */
export function isIdentifierChar(cp: number): boolean {
  if (!Number.isInteger(cp) || cp < 0 || cp > CODE_POINT_MAX) return false;
  return ID_CONTINUE.test(String.fromCodePoint(cp));
}

/**
 * True if `name` is a valid ECMAScript `IdentifierName`. Reserved words
 * are identifier names, so `isIdentifierName("class")` is true, see
 * {@link isValidIdentifier}.
 */
export function isIdentifierName(name: string): boolean {
  return IDENTIFIER_NAME.test(name);
}

const keywords = new Set([
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "return",
  "switch",
  "throw",
  "try",
  "var",
  "const",
  "while",
  "with",
  "new",
  "this",
  "super",
  "class",
  "extends",
  "export",
  "import",
  "null",
  "true",
  "false",
  "in",
  "instanceof",
  "typeof",
  "void",
  "delete",
]);

const strictReservedWords = new Set([
  "implements",
  "interface",
  "let",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "yield",
]);

const strictBindOnlyReservedWords = new Set(["eval", "arguments"]);

/**
 * True if `word` is a reserved keyword of the core grammar. Does not
 * include `enum`, `await`, or the strict-mode-only words, see
 * {@link isReservedWord} and {@link isStrictReservedWord}.
 */
export function isKeyword(word: string): boolean {
  return keywords.has(word);
}

/**
 * True if `word` is unconditionally reserved: `enum` in any context,
 * and `await` when `inModule`.
 */
export function isReservedWord(word: string, inModule = false): boolean {
  return (inModule && word === "await") || word === "enum";
}

/**
 * True if `word` is reserved in strict mode: everything
 * {@link isReservedWord} covers, plus `let`, `static`, `yield`, and the
 * other strict-mode future reserved words.
 */
export function isStrictReservedWord(word: string, inModule = false): boolean {
  return isReservedWord(word, inModule) || strictReservedWords.has(word);
}

/** True for `eval` and `arguments`, reserved only as strict-mode binding targets. */
export function isStrictBindOnlyReservedWord(word: string): boolean {
  return strictBindOnlyReservedWords.has(word);
}

/**
 * True if `word` is reserved as a strict-mode binding target:
 * everything {@link isStrictReservedWord} covers, plus `eval` and
 * `arguments`.
 */
export function isStrictBindReservedWord(word: string, inModule = false): boolean {
  return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
}

/**
 * True if `name` can be used as an identifier binding: a valid
 * {@link isIdentifierName} that, when `reserved` is true (the default),
 * is neither a keyword nor a strict-mode reserved word.
 */
export function isValidIdentifier(name: string, reserved = true): boolean {
  if (reserved && (isKeyword(name) || isStrictReservedWord(name, true))) return false;
  return isIdentifierName(name);
}
