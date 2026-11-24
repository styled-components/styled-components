import { GROUP_KIND, type GroupKind, type Order } from './Order';
import type { GroupedTag, Sheet } from './types';

/**
 * Server-side streaming flush bookkeeping attached to a server sheet's `Order`.
 * @internal
 */
export class StreamFlush {
  /** Server sheets: groups an edge or a contested pair touched after a flush. Emptied on every flush. @internal */
  edgeSeeds = new Set<number>();
  /** Server sheets: the rule text each group already sent in an earlier tag. @internal */
  flushed = new Map<number, string>();
  private globals = new Set<number>();
  private keyframes = new Set<number>();
  private order: Order;

  constructor(order: Order) {
    this.order = order;
  }

  /** @internal */
  clearGroup(group: number): void {
    this.flushed.delete(group);
  }

  /** @internal */
  floorAfter(at: number, group: number): number {
    if (this.flushed.size > 0 && !this.globals.has(group) && !this.keyframes.has(group)) {
      const { posList } = this.order;
      for (let i = posList.length - 1; i >= at; i--) {
        if (this.flushed.has(posList[i])) return i + 1;
      }
    }
    return at;
  }

  /** @internal */
  onEdge(seed: number): void {
    if (this.flushed.size > 0) this.edgeSeeds.add(seed);
  }

  /** @internal */
  recordFlush(tag: GroupedTag | undefined): void {
    if (tag !== undefined) {
      const { posList } = this.order;
      for (let i = 0; i < posList.length; i++) {
        const group = posList[i];
        const text = tag.getGroup(group);
        if (text !== '') this.flushed.set(group, (this.flushed.get(group) ?? '') + text);
      }
    }

    this.edgeSeeds.clear();
  }

  /** @internal */
  recordKind(group: number, kind: GroupKind): void {
    if (kind === GROUP_KIND.global) this.globals.add(group);
    else if (kind === GROUP_KIND.keyframes) this.keyframes.add(group);
  }

  /**
   * The flushed groups a tag must re-emit in full so every pair on an already visible element keeps
   * position order in the HTML: for each seed, the flushed groups after it that are related to it or
   * are globals, and everything after the earliest global in play.
   * @internal
   */
  reemitFor(groupSizes: Uint32Array): Set<number> | undefined {
    if (this.flushed.size === 0) return undefined;

    const { flushed, globals, keyframes, order } = this;
    const { posList } = order;
    const result = new Set<number>();
    const queue: number[] = [];
    const seen = new Set<number>();
    let earliestGlobal = Infinity;

    for (const seed of this.edgeSeeds) {
      if (!keyframes.has(seed)) queue.push(seed);
    }
    for (let i = 0; i < posList.length; i++) {
      const group = posList[i];
      if ((groupSizes[group] | 0) > 0 && !keyframes.has(group)) queue.push(group);
    }

    for (let group = queue.pop(); group !== undefined; group = queue.pop()) {
      if (seen.has(group)) continue;
      seen.add(group);

      const at = order.positionOf(group);
      if (globals.has(group) && at < earliestGlobal) earliestGlobal = at;

      const related = relatedTo(order, group);
      if (related !== undefined) {
        for (const candidate of related) {
          if (
            flushed.has(candidate) &&
            !keyframes.has(candidate) &&
            order.positionOf(candidate) > at &&
            !result.has(candidate)
          ) {
            result.add(candidate);
            queue.push(candidate);
          }
        }
      }

      if (globals.size > 0) {
        for (const candidate of globals) {
          if (
            flushed.has(candidate) &&
            order.positionOf(candidate) > at &&
            !result.has(candidate)
          ) {
            result.add(candidate);
            queue.push(candidate);
          }
        }
      }
    }

    if (earliestGlobal !== Infinity) {
      for (const candidate of flushed.keys()) {
        if (!keyframes.has(candidate) && order.positionOf(candidate) > earliestGlobal) {
          result.add(candidate);
        }
      }
    }

    return result;
  }

  /** @internal */
  reset(): void {
    this.edgeSeeds.clear();
    this.flushed.clear();
    this.globals.clear();
    this.keyframes.clear();
  }
}

/** The groups a flush must treat as sharing an element with `group`: joint closure of stored outers and contested partners. */
const relatedTo = (order: Order, group: number): Set<number> | undefined => {
  if (!order.outerMap.has(group) && order.contested.size === 0) return undefined;

  const related = new Set<number>();
  const queue = [group];
  const visited = new Set([group]);

  for (let head = 0; head < queue.length; head++) {
    const next = queue[head];
    const outers = order.outerMap.get(next);
    if (outers !== undefined) {
      for (const outer of outers.keys()) {
        if (!visited.has(outer)) {
          visited.add(outer);
          related.add(outer);
          queue.push(outer);
        }
      }
    }

    if (order.contested.size > 0) {
      for (const [a, b] of order.contested.values()) {
        const partner = a === next ? b : b === next ? a : -1;
        if (partner === -1 || visited.has(partner)) continue;

        visited.add(partner);
        related.add(partner);
        queue.push(partner);
      }
    }
  }

  return related;
};

/** Creates streaming flush bookkeeping bound to `order`. @internal */
export const createStreamFlush = (order: Order): StreamFlush => new StreamFlush(order);

/** Idempotently attaches streaming flush bookkeeping to a server sheet's `Order`. @internal */
export const attachStreamFlush = (sheet: Sheet): StreamFlush =>
  (sheet.order.streamFlush ??= new StreamFlush(sheet.order));
