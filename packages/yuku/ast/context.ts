import type { Node } from "../types";

/** @internal */
export interface Frame {
  i: number;
}

/**
 * The current position of a walk and the operations that change the tree. One object is reused,
 * so it is valid only during the visit that receives it.
 */
export class WalkContext<T extends Node = Node, S = unknown> {
  /** @internal */
  _ancestors: Node[] = [];
  /** @internal */
  _node: Node | null = null;
  /** @internal */
  _key: string | null = null;
  /** @internal */
  _list: Node[] | null = null;
  /** @internal */
  _frame: Frame | null = null;
  /** @internal */
  _skip = false;
  /** @internal */
  _stopped = false;
  /** @internal */
  _removed = false;
  /** @internal */
  _replacement: Node | null = null;
  /** State threaded through the walk, the third `walk` argument. */
  state!: S;

  /** The node being visited. */
  get node(): T {
    return this._node as T;
  }

  /** The node holding {@link node}, or null at the walk root. */
  get parent(): Node | null {
    return this._ancestors[this._ancestors.length - 1] ?? null;
  }

  /** The field on {@link parent} holding {@link node}, or null at the root. */
  get key(): string | null {
    return this._key;
  }

  /** Index within an array field, or null in a plain field. */
  get index(): number | null {
    return this._list === null ? null : this._frame!.i;
  }

  /** Ancestors from the walk root down to {@link parent}. */
  ancestors(): Node[] {
    return [...this._ancestors];
  }

  /** Do not descend into the current node's children. */
  skip(): void {
    this._skip = true;
  }

  /** Stop the walk entirely. */
  stop(): void {
    this._stopped = true;
  }

  /**
   * Replace the current node. The walk continues into the replacement's
   * children and `leave` fires for the replacement's type. A synthetic
   * node with `start === 0 && end === 0` inherits the original span,
   * for source maps. Throws at the walk root.
   */
  replace(node: Node): void {
    if (node === null || typeof node !== "object" || typeof node.type !== "string") {
      throw new TypeError("replace: expected an AST node");
    }
    if (this.parent === null) {
      throw new TypeError("replace: cannot replace the walk root");
    }
    if (node.start === 0 && node.end === 0) {
      node.start = this.node.start;
      node.end = this.node.end;
    }
    this._replacement = node;
  }

  /**
   * Remove the current node from its parent: spliced from array fields,
   * nulled in plain fields. Children are not walked and `leave` does
   * not fire. Throws at the walk root.
   */
  remove(): void {
    if (this.parent === null) {
      throw new TypeError("remove: cannot remove the walk root");
    }
    this._removed = true;
  }

  /** Insert a sibling before the current node, not visited. Array fields only. */
  insertBefore(node: Node): void {
    insertSibling(this, node, 0);
    this._frame!.i++;
  }

  /** Insert a sibling after the current node, visited by the walk. Array fields only. */
  insertAfter(node: Node): void {
    insertSibling(this, node, 1);
  }
}

function insertSibling(ctx: WalkContext, node: Node, offset: number): void {
  if (ctx._list === null) {
    throw new TypeError("insertBefore/insertAfter require a node in an array field");
  }
  ctx._list.splice(ctx._frame!.i + offset, 0, node);
}
