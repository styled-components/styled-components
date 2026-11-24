import { GLOBAL_ID_PREFIX, KEYFRAMES_ID_PREFIX } from '../constants';
import { warnOnce } from '../utils/warnOnce';
import {
  baseGroupOf,
  extGroupsOf,
  hasExtensions,
  idForGroup,
  labelForGroup,
} from './GroupIDAllocator';
import type { StreamFlush } from './serverOrder';

/** Sort tier of a group: a lower value sorts first. */
export const TIER = {
  client: 3,
  clientGlobal: 1,
  server: 2,
  serverGlobal: 0,
} as const;

export type Tier = (typeof TIER)[keyof typeof TIER];

/** What a group holds: a component's rules, a global style's, or keyframes. */
export const GROUP_KIND = {
  component: 0,
  global: 1,
  keyframes: 2,
} as const;

export type GroupKind = (typeof GROUP_KIND)[keyof typeof GROUP_KIND];

/**
 * Overrides a group's default key (client tier, its group number as seq): `server` puts it in the
 * server component graph's tier, `seq` is its definition order in that graph.
 */
export type Placement = { seq?: number | undefined; server?: boolean | undefined };

/** The placement of a group with no definition order of its own in the server graph. */
export const SERVER_PLACEMENT: Placement = { server: true };

/** What `learn` did with an edge: stored it, or left it out because the pair is settled, refused or contested. */
export type LearnResult = 'contested' | 'refused' | 'settled' | 'stored';

/**
 * Called around every move so the tag can take rules out of their old offsets and put them back at the new ones.
 * @internal
 */
export interface MoveListener {
  /** @internal */
  afterMove(groups: readonly number[]): void;
  /** @internal */
  beforeMove(groups: readonly number[]): void;
}

const KEY_STRIDE = 2 ** 32;

/** One number sorting by tier, then seq. */
export const makeKey = (tier: Tier, seq: number): number => tier * KEY_STRIDE + seq;

/** The definition order a server-tier key carries, or undefined for a client-tier key. */
export const serverSeqOf = (key: number): number | undefined => {
  const tier = Math.floor(key / KEY_STRIDE);

  return tier === TIER.server || tier === TIER.serverGlobal ? key - tier * KEY_STRIDE : undefined;
};

/** The kind of group an id names. */
export const kindOfId = (id: string): GroupKind =>
  id.startsWith(GLOBAL_ID_PREFIX)
    ? GROUP_KIND.global
    : id.startsWith(KEYFRAMES_ID_PREFIX)
      ? GROUP_KIND.keyframes
      : GROUP_KIND.component;

/** The sort key of a group of `kind`: globals and keyframes take their graph's global tier. */
export const keyFor = (kind: GroupKind, group: number, placement?: Placement): number => {
  const server = placement !== undefined && placement.server === true;
  const tier =
    kind === GROUP_KIND.component
      ? server
        ? TIER.server
        : TIER.client
      : server
        ? TIER.serverGlobal
        : TIER.clientGlobal;

  return makeKey(tier, placement?.seq ?? group);
};

const pairKey = (a: number, b: number) => (a < b ? a + ',' + b : b + ',' + a);

const nameOf = (group: number) => labelForGroup(group) ?? idForGroup(group) ?? String(group);

/** The names of the cascade layers a top-level rule declares, or none when it is not an `@layer` rule. */
const layerNamesOf = (rule: string): string[] => {
  if (!/^@layer(?![\w\\-]|[^\x00-\x7f])/i.test(rule)) return [];

  let end = rule.length;
  const block = rule.indexOf('{');
  const statement = rule.indexOf(';');
  if (block !== -1) end = block;
  if (statement !== -1 && statement < end) end = statement;

  const names: string[] = [];
  const parts = rule.slice(6, end).split(',');
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i].trim();
    if (name !== '') names.push(name);
  }
  return names;
};

/** Development only: remember the layer names a rule declares, to warn when a move reorders them. @internal */
export const noteLayers = (order: Order, group: number, rule: string): void => {
  if (!__DEV__) return;

  const names = layerNamesOf(rule);
  if (names.length === 0) return;

  const layers = order.layerGroups ?? (order.layerGroups = new Map());
  for (const name of names) {
    const groups = layers.get(name);
    if (groups) groups.add(group);
    else layers.set(name, new Set([group]));
  }
};

/** Development only: layer names by the position of the first group naming each. */
const layerOrder = (order: Order): string[] | undefined => {
  const layers = order.layerGroups;
  if (layers === undefined || layers.size < 2) return undefined;

  const firstAt: Array<[name: string, at: number]> = [];
  for (const [name, groups] of layers) {
    let first = Infinity;
    for (const group of groups) {
      const at = order.positionOf(group);
      if (at !== -1 && at < first) first = at;
    }
    firstAt.push([name, first]);
  }

  return firstAt.sort((a, b) => a[1] - b[1]).map(entry => entry[0]);
};

const reindex = (order: Order, from: number): void => {
  const { posList, posMap } = order;
  for (let i = from; i < posList.length; i++) posMap.set(posList[i], i);
};

const insertAt = (order: Order, group: number, at: number): void => {
  if (at === order.posList.length) {
    order.posMap.set(group, at);
    order.posList.push(group);
    return;
  }

  order.posList.splice(at, 0, group);
  reindex(order, at);
};

/**
 * Right after the positioned group with the greatest position among those whose key is not larger
 * (a tie keeps arrival order); a flushed server sheet adds a floor for components.
 */
const insertByKey = (order: Order, group: number): void => {
  const { posList } = order;
  const key = order.keyOf(group);
  let at = 0;

  for (let i = posList.length - 1; i >= 0; i--) {
    if (order.keyOf(posList[i]) <= key) {
      at = i + 1;
      break;
    }
  }

  if (order.streamFlush !== undefined) at = order.streamFlush.floorAfter(at, group);

  insertAt(order, group, at);
};

/**
 * True when `to` is `from` or one of its transitive outers; with `pinnedOnly`, through chain edges
 * alone; with `withContested`, also following contested pairs from first member to second.
 */
const reaches = (
  order: Order,
  from: number,
  to: number,
  pinnedOnly: boolean,
  withContested = false
): boolean => {
  if (from === to) return true;
  if (!order.outerMap.has(from) && (!withContested || order.contested.size === 0)) return false;

  const seen = new Set([from]);
  const stack = [from];

  for (let group = stack.pop(); group !== undefined; group = stack.pop()) {
    const outers = order.outerMap.get(group);
    if (outers !== undefined) {
      for (const [outer, pin] of outers) {
        if (!pinnedOnly || pin) {
          if (outer === to) return true;
          if (!seen.has(outer)) {
            seen.add(outer);
            stack.push(outer);
          }
        }
      }
    }

    if (withContested && order.contested.size > 0) {
      for (const [first, second] of order.contested.values()) {
        if (first === group) {
          if (second === to) return true;
          if (!seen.has(second)) {
            seen.add(second);
            stack.push(second);
          }
        }
      }
    }
  }

  return false;
};

/** Every group reachable from `group` along stored `outerMap` edges (excluding `group` itself unless cyclic). */
const transitiveOuters = (order: Order, group: number): Set<number> => {
  const result = new Set<number>();
  const stack = [group];

  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    const outers = order.outerMap.get(next);
    if (outers === undefined) continue;

    for (const outer of outers.keys()) {
      if (!result.has(outer)) {
        result.add(outer);
        stack.push(outer);
      }
    }
  }

  return result;
};

/** `outer` after `inner` would put `after` after `before` by a path: `before` reaches `inner` and `outer` reaches `after`. */
const runsThrough = (
  order: Order,
  before: number,
  after: number,
  outer: number,
  inner: number,
  withContested: boolean
): boolean =>
  reaches(order, before, inner, false, withContested) &&
  reaches(order, outer, after, false, withContested);

/** True when the new edge would order a contested pair through stored edges, or reverse one through a contested chain. */
const ordersContested = (order: Order, outer: number, inner: number): boolean => {
  for (const [x, y] of order.contested.values()) {
    if (
      runsThrough(order, x, y, outer, inner, false) ||
      runsThrough(order, y, x, outer, inner, true)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * A contest move or full block takes `start`, its transitive outers, and the second member of every
 * contested pair whose first member is carried, closed under both, among groups at or before `limit`.
 */
const carried = (order: Order, start: number, limit: number): Set<number> => {
  const set = new Set([start]);
  const stack = [start];

  for (let group = stack.pop(); group !== undefined; group = stack.pop()) {
    const outers = order.outerMap.get(group);
    if (outers !== undefined) {
      for (const candidate of outers.keys()) {
        if (!set.has(candidate) && order.positionOf(candidate) <= limit) {
          set.add(candidate);
          stack.push(candidate);
        }
      }
    }
    if (order.contested.size > 0) {
      for (const [a, b] of order.contested.values()) {
        if (a === group && !set.has(b) && order.positionOf(b) <= limit) {
          set.add(b);
          stack.push(b);
        }
      }
    }
  }

  return set;
};

/** True when moving `moving` past `target` would carry a contested pair's first member past its second. */
const breaksContested = (order: Order, moving: Set<number>, target: number): boolean => {
  const limit = order.positionOf(target);

  for (const [first, second] of order.contested.values()) {
    if (
      moving.has(first) &&
      !moving.has(second) &&
      order.positionOf(first) < order.positionOf(second) &&
      order.positionOf(second) <= limit
    ) {
      return true;
    }
  }

  return false;
};

/** Moves `moving` (kept in their current relative order) to just after `target`, or to the end when `target` is null. */
const moveAfter = (order: Order, moving: Set<number>, target: number | null): void => {
  const { posList } = order;
  const groups: number[] = [];
  const rest: number[] = [];

  for (let i = 0; i < posList.length; i++) {
    const candidate = posList[i];
    if (moving.has(candidate)) groups.push(candidate);
    else rest.push(candidate);
  }

  const layersBefore = __DEV__ ? layerOrder(order) : undefined;

  order.moveListener?.beforeMove(groups);

  const at = target === null ? rest.length : rest.indexOf(target) + 1;
  rest.splice(at, 0, ...groups);
  order.posList = rest;
  reindex(order, 0);

  order.moveListener?.afterMove(groups);

  if (__DEV__ && layersBefore !== undefined) {
    const layersAfter = layerOrder(order);
    if (layersAfter !== undefined && layersAfter.join() !== layersBefore.join()) {
      warnOnce(
        'order-layer-moved',
        `Reordering components changed the order of the cascade layers ${layersAfter.map(name => `"${name}"`).join(', ')}. Declare the order up front in a global style, for example "@layer ${layersAfter.join(', ')};", so it does not depend on component order.`
      );
    }
  }
};

const refuse = (order: Order, outer: number, inner: number): LearnResult => {
  order.refused.add(outer + '>' + inner);

  if (__DEV__) {
    warnOnce(
      'order-refused-edge',
      `"${nameOf(outer)}" wraps "${nameOf(inner)}" here, but their order is already fixed, so "${nameOf(outer)}" stays where it is. Raise the specificity of the one that should win.`,
      outer + '>' + inner
    );
  }

  return 'refused';
};

/** Members in key order, keeping every pinned path and every earlier contested pair among them fixed. */
const contestOrder = (order: Order, members: Set<number>): number[] => {
  const left = [...members].sort((a, b) => order.keyOf(a) - order.keyOf(b));
  const sorted: number[] = [];

  const mustPrecede = (before: number, after: number) => {
    if (reaches(order, before, after, true)) return true;

    const pair = order.contested.get(pairKey(before, after));
    return pair !== undefined && pair[0] === before;
  };

  while (left.length > 0) {
    const index = left.findIndex(
      group => !left.some(other => other !== group && mustPrecede(other, group))
    );
    sorted.push(...left.splice(index, 1));
  }

  return sorted;
};

const storeEdge = (order: Order, outer: number, inner: number, pinned: boolean): void => {
  const stored = order.outerMap.get(inner);
  if (stored) stored.set(outer, pinned);
  else order.outerMap.set(inner, new Map([[outer, pinned]]));
  order.streamFlush?.onEdge(inner);
};

/** A cycle was closed: contest every pair of its members no pin orders, honoring `inner -> outer` first when pinned. */
const contestCycle = (order: Order, outer: number, inner: number, pinned: boolean): void => {
  const members = new Set<number>();
  const forward = transitiveOuters(order, outer);
  forward.add(outer);
  for (const group of forward) {
    if (reaches(order, group, inner, false)) members.add(group);
  }
  members.add(inner);

  for (const group of members) {
    const outers = order.outerMap.get(group);
    if (outers === undefined) continue;

    for (const [other, pin] of outers) {
      if (!pin && members.has(other)) outers.delete(other);
    }
  }

  if (pinned) storeEdge(order, outer, inner, true);

  const sorted = contestOrder(order, members);
  const fresh: Array<readonly [number, number]> = pinned ? [[inner, outer]] : [];

  for (let s = 0; s < sorted.length; s++) {
    for (let t = s + 1; t < sorted.length; t++) {
      const first = sorted[s];
      const second = sorted[t];
      const key = pairKey(first, second);

      if (order.contested.has(key) || reaches(order, first, second, true)) {
        continue;
      }

      const pair = [first, second] as const;
      order.contested.set(key, pair);
      fresh.push(pair);

      order.streamFlush?.onEdge(first);

      if (__DEV__) {
        warnOnce(
          'order-contested-pair',
          `Components "${nameOf(first)}" and "${nameOf(second)}" wrap each other in different places, so their order falls back to definition order: "${nameOf(second)}" sits after "${nameOf(first)}" and overrides it wherever both style one element. Raise the specificity of the one that should win.`,
          key
        );
      }
    }
  }

  for (const [first, second] of fresh) {
    if (order.positionOf(second) < order.positionOf(first)) {
      pinExtensions(order, second, true);
      const firstPos = order.positionOf(first);
      if (order.positionOf(second) < firstPos) {
        const moving = carried(order, second, firstPos);
        if (!moving.has(first)) moveAfter(order, moving, first);
      }
    }
  }
};

/** True when `(outer, inner)` is already settled, upgrading an existing learned edge when `pinned` is true. */
const alreadySettled = (order: Order, outer: number, inner: number, pinned: boolean): boolean => {
  if (pinned) {
    const outers = order.outerMap.get(inner);
    if (outers?.has(outer)) {
      outers.set(outer, true);
      return true;
    }
  }
  return order.isSettled(outer, inner);
};

const learnEdge = (order: Order, outer: number, inner: number, pinned: boolean): LearnResult => {
  if (outer === inner) return 'settled';
  if (alreadySettled(order, outer, inner, pinned)) return 'settled';

  pinExtensions(order, outer, order.contested.size > 0);
  if (alreadySettled(order, outer, inner, pinned)) return 'settled';

  if (order.contested.size > 0) {
    if (hasExtensions()) {
      for (const [x, y] of order.contested.values()) {
        if (order.posMap.has(x)) pinExtensions(order, x, true);
        if (order.posMap.has(y)) pinExtensions(order, y, true);
      }
      if (alreadySettled(order, outer, inner, pinned)) return 'settled';
    }
    if (ordersContested(order, outer, inner)) return refuse(order, outer, inner);
  }

  if (order.outerMap.size > 0 && reaches(order, outer, inner, false)) {
    if (reaches(order, outer, inner, true)) return refuse(order, outer, inner);

    contestCycle(order, outer, inner, pinned);
    return pinned ? 'stored' : 'contested';
  }

  if (!order.posMap.has(inner)) insertByKey(order, inner);

  const innerPos = order.positionOf(inner);
  if (!order.posMap.has(outer)) {
    const at =
      order.streamFlush !== undefined
        ? order.streamFlush.floorAfter(innerPos + 1, outer)
        : innerPos + 1;
    insertAt(order, outer, at);
  } else if (order.positionOf(outer) < innerPos) {
    const moving = new Set([outer]);
    for (const group of transitiveOuters(order, outer)) {
      if (order.positionOf(group) <= innerPos) moving.add(group);
    }
    if (order.contested.size > 0 && breaksContested(order, moving, inner)) {
      return refuse(order, outer, inner);
    }

    moveAfter(order, moving, inner);
  }

  storeEdge(order, outer, inner, pinned);

  return 'stored';
};

/** Groups currently mid-pin on the call stack, preventing re-entry from `pinExtensions` or cyclic `registerBase`. */
const pinning = new Set<number>();

/** Learn a chain level's pin to its base, base first, before any other edge touches the level. */
const pinsFirst = (order: Order, group: number): void => {
  const base = baseGroupOf(group);
  if (base === undefined || order.pinned.get(group) === base || pinning.has(group)) return;

  pinning.add(group);
  try {
    pinsFirst(order, base);
    learnEdge(order, group, base, true);
    if (order.outerMap.get(base)?.get(group) === true) order.pinned.set(group, base);
  } finally {
    pinning.delete(group);
  }
};

/** Materialize a chain level's pin to its base in `order`, base first. @internal */
export const pinGroup = (order: Order, group: number): void => pinsFirst(order, group);

/** Materialize pinned edges for every positioned extension reachable from `root` before checking or moving `root`. */
const pinExtensions = (order: Order, root: number, withContested = false): void => {
  if (
    !hasExtensions() ||
    (extGroupsOf(root) === undefined &&
      !order.outerMap.has(root) &&
      (!withContested || order.contested.size === 0))
  ) {
    return;
  }

  const visited = new Set([root]);
  const queue = [root];

  for (let head = 0; head < queue.length; head++) {
    const curr = queue[head];
    const exts = extGroupsOf(curr);
    if (exts !== undefined) {
      for (const ext of exts) {
        if (order.posMap.has(ext) && order.pinned.get(ext) !== curr) {
          pinsFirst(order, ext);
        }
        if (!visited.has(ext)) {
          visited.add(ext);
          queue.push(ext);
        }
      }
    }

    const outers = order.outerMap.get(curr);
    if (outers !== undefined) {
      for (const outer of outers.keys()) {
        if (!visited.has(outer)) {
          visited.add(outer);
          queue.push(outer);
        }
      }
    }

    if (withContested && order.contested.size > 0) {
      for (const [a, b] of order.contested.values()) {
        if (a === curr && !visited.has(b)) {
          visited.add(b);
          queue.push(b);
        }
      }
    }
  }
};

/**
 * One sheet's output order: the groups in position order, the key each sorts by, and the edges
 * ("outer after inner") that override keys. Group numbers are local identifiers; only positions
 * decide output order.
 * @internal
 */
export class Order {
  /** Contested pairs, each stored as `[first, second]` in contest order. @internal */
  readonly contested: Map<string, readonly [number, number]> = new Map();

  /** @internal */
  keyMap: Map<number, number> = new Map();

  /** @internal */
  layerGroups: Map<string, Set<number>> | undefined;

  /** Told about every move so a tag can follow it. @internal */
  moveListener: MoveListener | undefined;

  /** Stored edges: inner group to its outers, each flagged pinned (chain) or learned (tree scan). @internal */
  readonly outerMap: Map<number, Map<number, boolean>> = new Map();

  /** @internal */
  pinned: Map<number, number> = new Map();

  /** The groups in output order. @internal */
  posList: number[] = [];

  /** @internal */
  posMap: Map<number, number> = new Map();

  /** @internal */
  refused: Set<string> = new Set();

  /** True once the first rehydration ran, so later adoption is late adoption. @internal */
  rehydrated = false;

  /** Server sheets: streaming flush bookkeeping, undefined for browser sheets. @internal */
  streamFlush: StreamFlush | undefined;

  /** Forgets every group, edge and flush; the listener stays. @internal */
  reset(): void {
    this.streamFlush?.reset();
    this.posList = [];
    this.rehydrated = false;
    this.outerMap.clear();
    this.contested.clear();
    this.keyMap.clear();
    if (__DEV__) this.layerGroups = undefined;
    this.pinned.clear();
    this.posMap.clear();
    this.refused.clear();
  }

  /** True when `group` has a place in the output. @internal */
  hasGroup(group: number): boolean {
    return this.posMap.has(group);
  }

  /** True once a key arrived with the group's rules. @internal */
  hasKey(group: number): boolean {
    return this.keyMap.has(group);
  }

  /** The group's key, or the client-tier key of its number until one arrived. @internal */
  keyOf(group: number): number {
    return this.keyMap.get(group) ?? makeKey(TIER.client, group);
  }

  /** The group's index in `posList`, or -1. @internal */
  positionOf(group: number): number {
    return this.posMap.get(group) ?? -1;
  }

  /** True when the edge is stored or refused, or the pair is contested: nothing is left to learn. @internal */
  isSettled(outer: number, inner: number): boolean {
    if (this.outerMap.get(inner)?.has(outer)) return true;
    if (this.refused.size === 0 && this.contested.size === 0) return false;

    return this.refused.has(outer + '>' + inner) || this.contested.has(pairKey(outer, inner));
  }

  /**
   * A group's rules arrive. Records the key when none is known yet (a shared id keeps its first),
   * and positions the group by key unless an edge already did. A chain level's pin to its base is
   * learned first, so the group sits right after the base whatever its key.
   * @internal
   */
  place(group: number, key: number, kind: GroupKind): void {
    if (!this.keyMap.has(group)) {
      this.keyMap.set(group, key);
      this.streamFlush?.recordKind(group, kind);
    }

    if (this.posMap.has(group)) return;

    pinsFirst(this, group);
    if (!this.posMap.has(group)) insertByKey(this, group);
  }

  /**
   * Adopt a group from a server tag block. An unpositioned group is appended (first rehydration, or
   * a component in late adoption) or placed by key (a global or keyframes group in late adoption); a
   * full block moves a positioned component group, with its carry set, to the end.
   * @internal
   */
  adoptGroup(
    group: number,
    key: number,
    kind: GroupKind,
    options: { full: boolean; late: boolean }
  ): void {
    if (!this.keyMap.has(group)) {
      this.keyMap.set(group, key);
      this.streamFlush?.recordKind(group, kind);
    }

    if (!this.posMap.has(group)) {
      if (options.late && kind !== GROUP_KIND.component) insertByKey(this, group);
      else insertAt(this, group, this.posList.length);
      return;
    }

    if (options.full && kind === GROUP_KIND.component) this.moveToEnd(group);
  }

  /**
   * Learn that `outer` must sit after `inner` (a wrapper after the component it wraps). Settled pairs
   * change nothing. A cycle contests the pair instead of storing the edge (docs/react.md "Cycles").
   * @internal
   */
  learn(outer: number, inner: number): LearnResult {
    if (outer === inner) return 'settled';

    pinsFirst(this, outer);
    pinsFirst(this, inner);

    return learnEdge(this, outer, inner, false);
  }

  /** Moves the group and its carry set to the end of the positions, or appends an unpositioned group. @internal */
  moveToEnd(group: number): void {
    if (!this.posMap.has(group)) {
      insertAt(this, group, this.posList.length);
      return;
    }

    pinExtensions(this, group, true);
    moveAfter(this, carried(this, group, Infinity), null);
  }
}

/** A copy that shares no state with `order`; listener, streaming, and rehydration state are not copied. @internal */
export const cloneOrder = (order: Order): Order => {
  const copy = new Order();

  copy.posList = order.posList.slice();
  copy.rehydrated = false;
  copy.posMap = new Map(order.posMap);
  copy.keyMap = new Map(order.keyMap);
  copy.pinned = new Map(order.pinned);
  copy.refused = new Set(order.refused);

  for (const [inner, outers] of order.outerMap) copy.outerMap.set(inner, new Map(outers));
  for (const [key, pair] of order.contested) copy.contested.set(key, pair);
  if (__DEV__ && order.layerGroups !== undefined) {
    copy.layerGroups = new Map();
    for (const [name, groups] of order.layerGroups) copy.layerGroups.set(name, new Set(groups));
  }

  return copy;
};
