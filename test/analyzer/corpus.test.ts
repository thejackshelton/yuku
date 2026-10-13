// the semantic model of every corpus and project file holds each invariant

import { beforeAll, describe, expect, test } from "bun:test";
import { Analyzer, BindingFlags, type Module, type Scope } from "yuku/analyzer";
import type { Node, SourceType } from "yuku";
import { corpusAndProjectFiles, corpusPresent, forEachCorpusFile } from "../corpus";

const SAMPLE_MAX = 8;

const INVARIANTS = {
  crashed: "analysis never crashes",
  crossIndex: "scope and binding cross-indexes are symmetric",
  resolution: "every reference resolves to what lookup finds from its scope",
  nodeIdentity: "node-to-model lookups round-trip",
  scopeMatch: "the walked scope matches the binder's scope at every reference",
  parentMatch: "parentOf matches the walk's parent at every node",
  captures: "capturesOf matches an independent recomputation",
  records: "module records are well formed",
  determinism: "analysis is deterministic",
  ordering: "bindings and references are recorded in walk (source) order",
};

type Invariant = keyof typeof INVARIANTS;

const violations = {} as Record<Invariant, string[]>;
for (const invariant of Object.keys(INVARIANTS) as Invariant[]) violations[invariant] = [];
let analyzed = 0;

// resolution can differ from lookup for these
const POSITION_DEPENDENT =
  BindingFlags.TypeParameter | BindingFlags.Parameter | BindingFlags.FunctionScopedVariable;

const FUNCTION_TYPES = [
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
] as const;

function note(invariant: Invariant, detail: string): void {
  if (violations[invariant].length < SAMPLE_MAX) violations[invariant].push(detail);
}

function expectedCaptures(module: Module, fn: Node): Set<number> {
  const fnScope = module.scopes.find((scope) => scope.node === fn && scope.kind === "function");
  if (fnScope === undefined) return new Set();
  const within = (scope: Scope | null): boolean => {
    for (let current = scope; current; current = current.parent) {
      if (current === fnScope) return true;
    }
    return false;
  };
  const captured = new Set<number>();
  for (const reference of module.references) {
    if (reference.inTypePosition || reference.binding === null) continue;
    if (reference.node.start < fn.start || reference.node.end > fn.end) continue;
    if (within(reference.binding.scope)) continue;
    captured.add(reference.binding.id);
  }
  return captured;
}

function fingerprint(module: Module): string {
  return JSON.stringify([
    module.scopes.map((scope) => scope.kind),
    module.bindings.map((binding) => binding.flags),
    module.references.map((reference) => reference.binding?.id ?? -1),
  ]);
}

function outOfWalkOrder<T>(
  items: T[],
  walkOrder: Map<Node, number>,
  nodeOf: (item: T) => Node | undefined,
): T | null {
  let previous = -1;
  for (const item of items) {
    const node = nodeOf(item);
    if (node === undefined) continue;
    const at = walkOrder.get(node);
    if (at === undefined) continue;
    if (at < previous) return item;
    previous = at;
  }
  return null;
}

function check(path: string, source: string, sourceType: SourceType): void {
  let module: Module;
  try {
    module = new Analyzer().setFile(path, source, { sourceType });
    // a decode fault throws here, not later
    void module.ast;
    void module.scopes;
    void module.bindings;
    void module.references;
    void module.imports;
    void module.exports;
  } catch (error) {
    note("crashed", `${path}: ${(error as Error).message}`);
    return;
  }
  analyzed++;

  // each reference is unresolved or owned by one binding
  let ownedReferences = 0;
  for (const binding of module.bindings) {
    for (const reference of binding.references) {
      if (reference.binding !== binding) note("crossIndex", `${path}: ${binding.name} back-ref`);
    }
    ownedReferences += binding.references.length;
  }
  for (const scope of module.scopes) {
    for (const binding of scope.bindings) {
      if (binding.scope !== scope) note("crossIndex", `${path}: ${binding.name} scope back-ref`);
    }
  }
  const resolved = module.references.filter((reference) => reference.binding !== null).length;
  if (ownedReferences !== resolved) {
    note("crossIndex", `${path}: owned ${ownedReferences} != resolved ${resolved}`);
  }
  if (module.unresolvedReferences.length + resolved !== module.references.length) {
    note("crossIndex", `${path}: partition mismatch`);
  }

  for (const reference of module.references) {
    const { name, scope, space } = reference;
    const expected = module.lookup(name, { from: scope, space });
    if (expected === reference.binding || name === "arguments") continue;
    if (expected !== null && expected.has(POSITION_DEPENDENT)) continue;
    note("resolution", `${path}: ${name} resolves apart from lookup`);
  }

  for (const binding of module.bindings) {
    const declaration = binding.declarations[0];
    if (declaration === undefined) continue;
    const owner = module.bindingOf(declaration);
    if (owner !== binding) {
      const found = owner === null ? "null" : `#${owner.id}`;
      note("nodeIdentity", `${path}: bindingOf(decl ${binding.name}) is ${found}`);
    }
  }
  for (const reference of module.references) {
    if (module.referenceOf(reference.node) !== reference) {
      note("nodeIdentity", `${path}: referenceOf(${reference.name})`);
    }
    if (module.bindingOf(reference.node) !== reference.binding) {
      note("nodeIdentity", `${path}: bindingOf(ref ${reference.name})`);
    }
  }

  const walkOrder = new Map<Node, number>();
  module.walk({
    enter(node, ctx) {
      walkOrder.set(node, walkOrder.size);
      const reference = ctx.reference;
      if (reference !== null && ctx.scope !== reference.scope) {
        note(
          "scopeMatch",
          `${path}: ${reference.name} ctx ${ctx.scope.id} vs ref ${reference.scope.id}`,
        );
      }
      if (module.parentOf(node) !== (ctx.parent ?? null)) {
        note("parentMatch", `${path}: ${node.type} parentOf disagrees with ctx.parent`);
      }
    },
  });

  const reference = outOfWalkOrder(module.references, walkOrder, (r) => r.node);
  if (reference !== null) {
    note("ordering", `${path}: reference ${reference.name} out of walk order`);
  }
  const binding = outOfWalkOrder(module.bindings, walkOrder, (b) => b.declarations[0]);
  if (binding !== null) note("ordering", `${path}: binding ${binding.name} out of walk order`);

  for (const fn of module.findAll(FUNCTION_TYPES)) {
    let native: Set<number>;
    try {
      native = new Set(module.capturesOf(fn).map((c) => c.binding.id));
    } catch (error) {
      note("crashed", `${path}: capturesOf: ${(error as Error).message}`);
      continue;
    }
    const expected = expectedCaptures(module, fn);
    if (native.size !== expected.size || [...native].some((id) => !expected.has(id))) {
      note("captures", `${path}: ${fn.type} native=[${[...native]}] expected=[${[...expected]}]`);
    }
  }

  for (const record of module.imports) {
    if (record.local && (record.local.flags & BindingFlags.Import) === 0) {
      note("records", `${path}: import local '${record.local.name}' not flagged import`);
    }
  }
  for (const record of module.exports) {
    if (record.local && !module.bindings.includes(record.local)) {
      note("records", `${path}: export local not in bindings`);
    }
  }

  const again = new Analyzer().setFile(path, source, { sourceType });
  if (fingerprint(module) !== fingerprint(again)) note("determinism", `${path}: non-deterministic`);
}

describe.skipIf(!corpusPresent())("analyzer corpus invariants", () => {
  beforeAll(async () => {
    await forEachCorpusFile(corpusAndProjectFiles(), (file, source) =>
      check(file.path, source, file.sourceType),
    );
  }, 300_000);

  test("the corpus is non-empty", () => {
    expect(analyzed).toBeGreaterThan(1000);
  });

  for (const [invariant, name] of Object.entries(INVARIANTS) as [Invariant, string][]) {
    test(name, () => {
      expect(violations[invariant]).toEqual([]);
    });
  }
});
