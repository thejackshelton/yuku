# Changelog

What changed in each release of Yuku, newest first. Releases up to 0.14.0 are listed on [GitHub](https://github.com/yuku-toolchain/yuku/releases).

## 0.20.0

### Breaking

- Yuku now ships as one package, `yuku`, in place of `yuku-parser`, `yuku-analyzer`, `yuku-ast`, `yuku-codegen`, and `@yuku-toolchain/types`. Install `yuku` and import from `yuku`, `yuku/analyzer`, `yuku/ast`, `yuku/codegen`, and `yuku/types` (#225 by @arshad-yaseen)
- `yuku-core`, `@yuku-core/wasm`, and the `@yuku-core/binding-*` native packages are removed, since everything runs on the WebAssembly module inside `yuku` (#225 by @arshad-yaseen)
- Node.js 16.4 or newer is required, and browsers need WebAssembly SIMD, such as Safari 16.4 or newer (#225 by @arshad-yaseen)
- `yuku/types` no longer exports `Core` (#225 by @arshad-yaseen)
- Zig: `-Dparser-extension` is replaced by `-Ddialect`, the semantic traverser's `Ctx.init` and `SymbolTracker.init` take a mode, and `Ctx.parentOf` is removed (#225 by @thejackshelton and @arshad-yaseen)

### Changes

- Dialects let you add your own syntax to the parser in Zig, matched to files by extension and passed to `parse` and `analyze` through the `wasm` option (#225 by @thejackshelton and @arshad-yaseen)
- Yuku runs unchanged in Node.js, Bun, Deno, browsers, and Workers, with no setup before the first parse (#225 by @arshad-yaseen)
- Parsing is 13 to 22% faster (#225 by @arshad-yaseen)
- `semanticErrors` is 29 to 49% cheaper, since it skips the full semantic model (#225 by @arshad-yaseen)
- Repeated calls reuse memory, so batches that mix large and small files run much faster (#250, #225 by @arshad-yaseen)

## 0.19.0

### Breaking

- Using Yuku as a Zig package now needs Zig 0.17.0 or later, so upgrade Zig before you update (#242 by @arshad-yaseen)

### Changes

- `generate` in `yuku-codegen` prints any single node, such as an object property, not only a whole `Program` (#245 by @arshad-yaseen)
- `@yuku-core/wasm` parses an empty source correctly in runtimes like WebContainers, where it could read leftover bytes as input (#246 by @arshad-yaseen)

## 0.18.1

### Changes

- parser: join a surrogate pair in a string however it is written (#239 by @arshad-yaseen)
- parser: span a type predicate's type without its stripped parentheses (#239 by @arshad-yaseen)
- codegen: print every attached comment (#238 by @arshad-yaseen)
- codegen: strip an uninitialized `const` as ambient (#239 by @arshad-yaseen)
- codegen: reprint a hashbang verbatim (#239 by @arshad-yaseen)

## 0.18.0

### Breaking

- all: pass the core strings (#233 by @arshad-yaseen)
  - `Core.parse` and `Core.analyze` take a string. Decode UTF-8 bytes before passing them to a core. `parse` and `setFile` still accept bytes.

### Changes

- all: decode and walk trees of any depth (#228 by @arshad-yaseen)
- parser: attach comments at any depth (#233 by @arshad-yaseen)
- parser: reject `import` and `export` in a script or below the top level (#234 by @arshad-yaseen)
- parser: reject decorators on both sides of `export` (#234 by @arshad-yaseen)
- parser: decode entities in JSX text and attribute values (#234 by @arshad-yaseen)
- parser: report duplicate exports and redeclarations as TypeScript does (#234 by @arshad-yaseen)
- analyzer: merge `declare module "m"` augmentations into `m` (#234 by @arshad-yaseen)
- analyzer: resolve `ns` in `import x = ns.T` in the namespace space (#234 by @arshad-yaseen)
- analyzer: mark the members of a declare enum ambient (#233 by @arshad-yaseen)
- codegen: keep decorators before `export` (#234 by @arshad-yaseen)
- types: correct pattern unions and the `findAll` parameter

## 0.17.0

### Breaking

- all: pass the core explicitly and rename the engine to yuku-core (#227 by @arshad-yaseen)
  - `yuku-engine` is `yuku-core`, and `@yuku-engine/wasm` is `@yuku-core/wasm`.
  - `init()` is gone. Load the WebAssembly core with `load()` or `loadSync()` from `@yuku-core/wasm` and pass it as `core` to `parse`, `analyze`, or `new Analyzer`.
  - Installing `@yuku-core/wasm` no longer switches the packages to it, and a platform without a native build no longer falls back to it. Pass it in as `core` instead.

### Changes

- wasm: build the WebAssembly core for speed (#227 by @arshad-yaseen)

## 0.15.1

### Changes

- analyzer: memoize export resolution for each link
- analyzer: index nodes on the first node query

## 0.15.0

### Breaking

- all: tidy the analyzer API and share file options and diagnostics
  - `addFile` and `removeFile` are `setFile` and `deleteFile`.
  - `Symbol` and `SymbolFlags` are `Binding` and `BindingFlags`, and `symbols`, `symbolOf`, and `.symbol` are `bindings`, `bindingOf`, and `.binding`.
  - `module.resolve(name, scope, space)` is `module.lookup(name, { from, space })`.
  - `analyzer.definitionOf` and `analyzer.referencesOf` are `binding.definition()` and `binding.findReferences()`.
  - The `is*` kind predicates are gone, except `imp.isNamespace`. Compare `kind` instead.
  - A resolver returns `false` for a module outside the project. `null` means unresolved.
  - Link diagnostics have the shared diagnostic shape, with `path` in place of `module`.
  - An unknown `lang` or `sourceType` throws a `TypeError`.

### Changes

- all: resolve names, merges, and exports as tsc does (#223 by @arshad-yaseen)
- analyzer: probe module paths in TypeScript's order (#223 by @arshad-yaseen)
- analyzer: add `module.ancestors` (#223 by @arshad-yaseen)
- all: build decoder caches on demand (#223 by @arshad-yaseen)
- all: add a `path` option to `parse`, and `module.isCurrent`, `module.nodeAt`, and `module.resolveExport`
