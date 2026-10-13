import type { Node, NodeOfType, NodeType } from "../types";
import { ALIAS_GROUPS, type AliasMap, type AliasName } from "./aliases";
import { type Frame, WalkContext } from "./context";
import { CHILD_KEYS } from "./generated";

/** A visitor function for one node type or alias. */
export type WalkHandler<T extends Node = Node, S = unknown> = (
  node: T,
  ctx: WalkContext<T, S>,
) => void;

/** Enter and leave hooks for one node type or alias. */
export interface WalkHooks<T extends Node = Node, S = unknown> {
  enter?: WalkHandler<T, S>;
  leave?: WalkHandler<T, S>;
}

type Visitor<T extends Node, S> = WalkHandler<T, S> | WalkHooks<T, S>;

/**
 * Handlers keyed by node `type`, by alias (`Expression`, `Function`,
 * ...), or the universal `enter` / `leave`. A bare function is an enter
 * handler. Per node the order is universal `enter`, alias enters in
 * visitor key order, the typed enter, children, then the mirror for
 * leave.
 */
export type Visitors<S = unknown> = {
  [K in NodeType]?: Visitor<NodeOfType<K>, S>;
} & {
  [A in AliasName]?: Visitor<AliasMap[A], S>;
} & {
  enter?: WalkHandler<Node, S>;
  leave?: WalkHandler<Node, S>;
};

/** An async visitor function for one node type or alias. */
export type AsyncWalkHandler<T extends Node = Node, S = unknown> = (
  node: T,
  ctx: WalkContext<T, S>,
) => void | Promise<void>;

/** Enter and leave hooks for one node type or alias in an async walk. */
export interface AsyncWalkHooks<T extends Node = Node, S = unknown> {
  enter?: AsyncWalkHandler<T, S>;
  leave?: AsyncWalkHandler<T, S>;
}

/** {@link Visitors} whose handlers may return promises. */
export type AsyncVisitors<S = unknown> = {
  [K in NodeType]?: AsyncWalkHandler<NodeOfType<K>, S> | AsyncWalkHooks<NodeOfType<K>, S>;
} & {
  [A in AliasName]?: AsyncWalkHandler<AliasMap[A], S> | AsyncWalkHooks<AliasMap[A], S>;
} & {
  enter?: AsyncWalkHandler<Node, S>;
  leave?: AsyncWalkHandler<Node, S>;
};

interface Handlers {
  enter: WalkHandler[];
  leave: WalkHandler[];
}

interface Dispatch {
  enter: WalkHandler | null;
  leave: WalkHandler | null;
  typed: Map<string, Handlers>;
}

function createDispatch(visitors: Visitors<never> | AsyncVisitors<never>): Dispatch {
  let enter: WalkHandler | null = null;
  let leave: WalkHandler | null = null;
  const typed = new Map<string, Handlers>();

  // leaves run in reverse registration order, so aliases enter before the
  // typed handler and leave after it
  const add = (type: string, handler: unknown): void => {
    const hooks = (typeof handler === "function" ? { enter: handler } : handler) as WalkHooks;
    let entry = typed.get(type);
    if (entry === undefined) {
      entry = { enter: [], leave: [] };
      typed.set(type, entry);
    }
    if (hooks.enter) entry.enter.push(hooks.enter);
    if (hooks.leave) entry.leave.unshift(hooks.leave);
  };

  for (const [name, value] of Object.entries(visitors)) {
    if (value == null) continue;
    if (name === "enter") enter = value as WalkHandler;
    else if (name === "leave") leave = value as WalkHandler;
    else if (name in ALIAS_GROUPS) {
      for (const type of ALIAS_GROUPS[name as AliasName]) add(type, value);
    }
  }
  for (const [name, value] of Object.entries(visitors)) {
    if (value == null || name === "enter" || name === "leave" || name in ALIAS_GROUPS) continue;
    add(name, value);
  }

  return { enter, leave, typed };
}

/**
 * Walk an AST depth-first, dispatching to typed visitors and mutating
 * in place. Returns the root.
 */
export function walk<T extends Node, S = unknown>(root: T, visitors: Visitors<S>, state?: S): T {
  _walk(root, visitors, state, new WalkContext());
  return root;
}

/**
 * The async counterpart of {@link walk}, with every handler awaited
 * before the walk moves on. Resolves to the root.
 */
export async function walkAsync<T extends Node, S = unknown>(
  root: T,
  visitors: AsyncVisitors<S>,
  state?: S,
): Promise<T> {
  await _walkAsync(root, visitors, state, new WalkContext());
  return root;
}

type AnyNode = Node & Record<string, unknown>;

function position(
  ctx: WalkContext,
  node: Node,
  key: string | null,
  list: Node[] | null,
  frame: Frame | null,
): void {
  ctx._node = node;
  ctx._key = key;
  ctx._list = list;
  ctx._frame = frame;
}

function applyReplace(
  ctx: WalkContext,
  parent: Node | null,
  key: string | null,
  list: Node[] | null,
  frame: Frame | null,
): Node {
  const next = ctx._replacement!;
  ctx._replacement = null;
  if (list !== null) list[frame!.i] = next;
  else (parent as AnyNode)[key!] = next;
  return next;
}

function applyRemove(
  ctx: WalkContext,
  parent: Node | null,
  key: string | null,
  list: Node[] | null,
  frame: Frame | null,
): void {
  ctx._removed = false;
  if (list !== null) {
    list.splice(frame!.i, 1);
    frame!.i--;
  } else {
    (parent as AnyNode)[key!] = null;
  }
}

/** @internal */
export function _walk(
  root: Node,
  visitors: Visitors<never> | AsyncVisitors<never>,
  state: unknown,
  ctx: WalkContext,
): void {
  const dispatch = createDispatch(visitors);
  ctx.state = state;
  const ancestors = ctx._ancestors;

  (function visit(
    node: Node,
    key: string | null,
    list: Node[] | null,
    frame: Frame | null,
  ): boolean {
    let typed = dispatch.typed.get(node.type);
    const parent = ctx.parent;

    position(ctx, node, key, list, frame);
    if (dispatch.enter !== null) {
      dispatch.enter(node, ctx);
      if (ctx._stopped) return false;
    }
    if (typed !== undefined) {
      for (const handler of typed.enter) {
        handler(node, ctx);
        if (ctx._stopped) return false;
      }
    }
    if (ctx._removed) {
      applyRemove(ctx, parent, key, list, frame);
      return true;
    }
    if (ctx._replacement !== null) {
      node = applyReplace(ctx, parent, key, list, frame);
      typed = dispatch.typed.get(node.type);
    }

    const skipped = ctx._skip;
    ctx._skip = false;
    if (!skipped) {
      const keys = CHILD_KEYS[node.type];
      if (keys !== undefined && keys.length > 0) {
        ancestors.push(node);
        for (let k = 0; k < keys.length; k++) {
          const field = keys[k]!;
          const value = (node as AnyNode)[field];
          if (value === null || typeof value !== "object") continue;
          if (Array.isArray(value)) {
            const childFrame = { i: 0 };
            for (; childFrame.i < value.length; childFrame.i++) {
              const item = value[childFrame.i] as Node | null;
              // pattern element holes are null
              if (item !== null && !visit(item, field, value as Node[], childFrame)) return false;
            }
          } else if (!visit(value as Node, field, null, null)) {
            return false;
          }
        }
        ancestors.pop();
      }
    }

    position(ctx, node, key, list, frame);
    if (typed !== undefined) {
      for (const handler of typed.leave) {
        handler(node, ctx);
        if (ctx._stopped) return false;
      }
    }
    if (dispatch.leave !== null) {
      dispatch.leave(node, ctx);
      if (ctx._stopped) return false;
    }
    if (ctx._removed) applyRemove(ctx, parent, key, list, frame);
    else if (ctx._replacement !== null) applyReplace(ctx, parent, key, list, frame);

    return true;
  })(root, null, null, null);
}

// twin of _walk with every handler awaited, keep the two in lockstep
/** @internal */
export async function _walkAsync(
  root: Node,
  visitors: AsyncVisitors<never>,
  state: unknown,
  ctx: WalkContext,
): Promise<void> {
  const dispatch = createDispatch(visitors);
  ctx.state = state;
  const ancestors = ctx._ancestors;

  await (async function visit(
    node: Node,
    key: string | null,
    list: Node[] | null,
    frame: Frame | null,
  ): Promise<boolean> {
    let typed = dispatch.typed.get(node.type);
    const parent = ctx.parent;

    position(ctx, node, key, list, frame);
    if (dispatch.enter !== null) {
      await dispatch.enter(node, ctx);
      if (ctx._stopped) return false;
    }
    if (typed !== undefined) {
      for (const handler of typed.enter) {
        await handler(node, ctx);
        if (ctx._stopped) return false;
      }
    }
    if (ctx._removed) {
      applyRemove(ctx, parent, key, list, frame);
      return true;
    }
    if (ctx._replacement !== null) {
      node = applyReplace(ctx, parent, key, list, frame);
      typed = dispatch.typed.get(node.type);
    }

    const skipped = ctx._skip;
    ctx._skip = false;
    if (!skipped) {
      const keys = CHILD_KEYS[node.type];
      if (keys !== undefined && keys.length > 0) {
        ancestors.push(node);
        for (let k = 0; k < keys.length; k++) {
          const field = keys[k]!;
          const value = (node as AnyNode)[field];
          if (value === null || typeof value !== "object") continue;
          if (Array.isArray(value)) {
            const childFrame = { i: 0 };
            for (; childFrame.i < value.length; childFrame.i++) {
              const item = value[childFrame.i] as Node | null;
              // pattern element holes are null
              if (item !== null && !(await visit(item, field, value as Node[], childFrame))) {
                return false;
              }
            }
          } else if (!(await visit(value as Node, field, null, null))) {
            return false;
          }
        }
        ancestors.pop();
      }
    }

    position(ctx, node, key, list, frame);
    if (typed !== undefined) {
      for (const handler of typed.leave) {
        await handler(node, ctx);
        if (ctx._stopped) return false;
      }
    }
    if (dispatch.leave !== null) {
      await dispatch.leave(node, ctx);
      if (ctx._stopped) return false;
    }
    if (ctx._removed) applyRemove(ctx, parent, key, list, frame);
    else if (ctx._replacement !== null) applyReplace(ctx, parent, key, list, frame);

    return true;
  })(root, null, null, null);
}
