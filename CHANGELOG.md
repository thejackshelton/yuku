# Changelog

What changed in each release of Yuku, newest first. Releases up to 0.14.0 are listed on [GitHub](https://github.com/yuku-toolchain/yuku/releases).

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
