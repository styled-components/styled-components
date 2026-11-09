import { GLOBAL_ID_PREFIX, KEYFRAMES_ID_PREFIX } from '../constants';
import { warnOnce } from '../utils/warnOnce';
import { baseGroupOf, idForGroup, labelForGroup } from './GroupIDAllocator';

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

/** Called around every move so the tag can take rules out of their old offsets and put them back at the new ones. */
export interface MoveListener {
  afterMove(groups: readonly number[]): void;
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
  if (!rule.startsWith('@layer')) return [];

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

/**
 * One sheet's output order: the groups in position order, the key each sorts by, and the edges
 * ("outer after inner") that override keys. Group numbers are local identifiers; only positions
 * decide output order.
 */
export class Order {
  /** Server sheets: groups an edge or a contested pair related after both were flushed. Emptied on every flush. */
  edgeSeeds: Set<number> = new Set();

  /** Server sheets: the rule text each group already sent in an earlier tag. */
  flushed: Map<number, string> = new Map();

  /** Told about every move so a tag can follow it. */
  listener: MoveListener | undefined;

  /** The groups in output order. */
  positions: number[] = [];

  /** True once the first rehydration ran, so later adoption is late adoption. */
  rehydrated = false;

  /** Stored edges: inner group to its outers, each flagged pinned (chain) or learned (tree scan). */
  readonly outers: Map<number, Map<number, boolean>> = new Map();

  /** Contested pairs, each stored as `[first, second]` in contest order. */
  readonly contested: Map<string, readonly [number, number]> = new Map();

  private globals: Set<number> = new Set();
  private keyframes: Set<number> = new Set();
  private keys: Map<number, number> = new Map();
  private layerGroups: Map<string, Set<number>> | undefined;
  private pinned: Set<number> = new Set();
  private pos: Map<number, number> = new Map();
  private refused: Set<string> = new Set();

  /** A copy that shares no state with this order; the listener is not copied. */
  clone(): Order {
    const copy = new Order();

    copy.positions = this.positions.slice();
    copy.rehydrated = this.rehydrated;
    copy.pos = new Map(this.pos);
    copy.keys = new Map(this.keys);
    copy.globals = new Set(this.globals);
    copy.keyframes = new Set(this.keyframes);
    copy.pinned = new Set(this.pinned);
    copy.refused = new Set(this.refused);

    for (const [inner, outers] of this.outers) copy.outers.set(inner, new Map(outers));
    for (const [key, pair] of this.contested) copy.contested.set(key, pair);
    if (__DEV__ && this.layerGroups !== undefined) {
      copy.layerGroups = new Map();
      for (const [name, groups] of this.layerGroups) copy.layerGroups.set(name, new Set(groups));
    }

    return copy;
  }

  /** Forgets every group, edge and flush; the listener stays. */
  reset(): void {
    this.edgeSeeds.clear();
    this.flushed.clear();
    this.positions = [];
    this.rehydrated = false;
    this.outers.clear();
    this.contested.clear();
    this.globals.clear();
    this.keyframes.clear();
    this.keys.clear();
    this.layerGroups = undefined;
    this.pinned.clear();
    this.pos.clear();
    this.refused.clear();
  }

  /** True when `group` has a place in the output. */
  has(group: number): boolean {
    return this.pos.has(group);
  }

  /** True once a key arrived with the group's rules. */
  hasKey(group: number): boolean {
    return this.keys.has(group);
  }

  /** True for a global style group (never keyframes), which a flush re-emits as a block of its own. */
  isGlobal(group: number): boolean {
    return this.globals.has(group);
  }

  /** The group's key, or the client-tier key of its number until one arrived. */
  keyOf(group: number): number {
    return this.keys.get(group) ?? makeKey(TIER.client, group);
  }

  /** The group's index in `positions`, or -1. */
  positionOf(group: number): number {
    return this.pos.get(group) ?? -1;
  }

  /** True when the edge is stored or refused, or the pair is contested: nothing is left to learn. */
  isSettled(outer: number, inner: number): boolean {
    if (this.outers.get(inner)?.has(outer)) return true;
    if (this.refused.size === 0 && this.contested.size === 0) return false;

    return this.refused.has(outer + '>' + inner) || this.contested.has(pairKey(outer, inner));
  }

  /**
   * A group's rules arrive. Records the key when none is known yet (a shared id keeps its first),
   * and positions the group by key unless an edge already did. A chain level's pin to its base is
   * learned first, so the group sits right after the base whatever its key.
   */
  place(group: number, key: number, kind: GroupKind): void {
    if (!this.keys.has(group)) {
      this.keys.set(group, key);
      this.recordKind(group, kind);
    }

    if (this.pos.has(group)) return;

    this.pinsFirst(group);
    if (!this.pos.has(group)) this.insertByKey(group);
  }

  /**
   * Adopt a group from a server tag block. An unpositioned group is appended (first rehydration, or
   * a component in late adoption) or placed by key (a global or keyframes group in late adoption); a
   * full block moves a positioned group, with its carry set, to the end.
   */
  adopt(
    group: number,
    key: number,
    kind: GroupKind,
    options: { full: boolean; late: boolean }
  ): void {
    if (!this.keys.has(group)) {
      this.keys.set(group, key);
      this.recordKind(group, kind);
    }

    if (!this.pos.has(group)) {
      if (options.late && kind !== GROUP_KIND.component) this.insertByKey(group);
      else this.insertAt(group, this.positions.length);
      return;
    }

    if (options.full) this.moveToEnd(group);
  }

  /**
   * Learn that `outer` must sit after `inner` (a wrapper after the component it wraps). Settled pairs
   * change nothing. A cycle contests the pair instead of storing the edge (docs/react.md "Cycles").
   */
  learn(outer: number, inner: number): LearnResult {
    if (outer === inner) return 'settled';

    this.pinsFirst(outer);
    this.pinsFirst(inner);

    return this.learnEdge(outer, inner, false);
  }

  /** Moves the group and its carry set to the end of the positions, or appends an unpositioned group. */
  moveToEnd(group: number): void {
    if (!this.pos.has(group)) {
      this.insertAt(group, this.positions.length);
      return;
    }

    this.moveAfter(this.carried(group, Infinity), null);
  }

  /**
   * The flushed groups a tag must re-emit in full so every pair on an already visible element keeps
   * position order in the HTML: for each seed, the flushed groups after it that are related to it or
   * are globals, and everything after the earliest global in play.
   */
  reemitSet(seeds: Iterable<number>): Set<number> {
    const result = new Set<number>();
    const queue: number[] = [];
    const seen = new Set<number>();
    let earliestGlobal = Infinity;

    for (const seed of seeds) {
      if (!this.keyframes.has(seed)) queue.push(seed);
    }

    for (let group = queue.pop(); group !== undefined; group = queue.pop()) {
      if (seen.has(group)) continue;
      seen.add(group);

      const at = this.positionOf(group);
      if (this.globals.has(group) && at < earliestGlobal) earliestGlobal = at;

      const related = this.relatedTo(group);
      for (const candidate of this.flushed.keys()) {
        if (this.keyframes.has(candidate) || this.positionOf(candidate) <= at) continue;
        if (!related.has(candidate) && !this.globals.has(candidate)) continue;

        result.add(candidate);
        queue.push(candidate);
      }
    }

    if (earliestGlobal !== Infinity) {
      for (const candidate of this.flushed.keys()) {
        if (!this.keyframes.has(candidate) && this.positionOf(candidate) > earliestGlobal) {
          result.add(candidate);
        }
      }
    }

    return result;
  }

  /** Development only: remember the layer names a rule declares, to warn when a move reorders them. */
  noteLayers(group: number, rule: string): void {
    if (!__DEV__) return;

    const names = layerNamesOf(rule);
    if (names.length === 0) return;

    const layers = this.layerGroups ?? (this.layerGroups = new Map());
    for (const name of names) {
      const groups = layers.get(name);
      if (groups) groups.add(group);
      else layers.set(name, new Set([group]));
    }
  }

  private recordKind(group: number, kind: GroupKind) {
    if (kind === GROUP_KIND.global) this.globals.add(group);
    else if (kind === GROUP_KIND.keyframes) this.keyframes.add(group);
  }

  private reindex(from: number) {
    const { positions, pos } = this;
    for (let i = from; i < positions.length; i++) pos.set(positions[i], i);
  }

  private insertAt(group: number, at: number) {
    if (at === this.positions.length) {
      this.pos.set(group, at);
      this.positions.push(group);
      return;
    }

    this.positions.splice(at, 0, group);
    this.reindex(at);
  }

  /**
   * Right after the positioned group with the greatest position among those whose key is not larger
   * (a tie keeps arrival order); a flushed server sheet adds a floor for components.
   */
  private insertByKey(group: number) {
    const { positions } = this;
    const key = this.keyOf(group);
    let at = 0;

    for (let i = positions.length - 1; i >= 0; i--) {
      if (this.keyOf(positions[i]) <= key) {
        at = i + 1;
        break;
      }
    }

    if (this.flushed.size > 0 && !this.globals.has(group) && !this.keyframes.has(group)) {
      for (let i = positions.length - 1; i >= at; i--) {
        if (this.flushed.has(positions[i])) {
          at = i + 1;
          break;
        }
      }
    }

    this.insertAt(group, at);
  }

  /** Learn a chain level's pin to its base, base first, before any other edge touches the level. */
  private pinsFirst(group: number) {
    const base = baseGroupOf(group);
    if (base === undefined || this.pinned.has(group)) return;

    this.pinned.add(group);
    this.pinsFirst(base);
    this.learnEdge(group, base, true);
  }

  private learnEdge(outer: number, inner: number, pinned: boolean): LearnResult {
    if (this.isSettled(outer, inner)) return 'settled';

    const hasContested = !pinned && this.contested.size > 0;
    if (hasContested && this.ordersContested(outer, inner)) return this.refuse(outer, inner);

    if (this.outers.size > 0 && this.reaches(outer, inner, false)) {
      if (this.reaches(outer, inner, true)) return this.refuse(outer, inner);

      this.contestCycle(outer, inner);
      return 'contested';
    }

    if (!this.pos.has(inner)) this.insertByKey(inner);

    if (!this.pos.has(outer)) {
      this.insertAt(outer, this.positionOf(inner) + 1);
    } else if (this.positionOf(outer) < this.positionOf(inner)) {
      const moving = this.moveSet(outer, inner);
      if (hasContested && this.breaksContested(moving, inner)) return this.refuse(outer, inner);

      this.moveAfter(moving, inner);
    }

    const stored = this.outers.get(inner);
    if (stored) stored.set(outer, pinned);
    else this.outers.set(inner, new Map([[outer, pinned]]));

    if (this.flushed.size > 0 && this.flushed.has(outer) && this.flushed.has(inner)) {
      this.edgeSeeds.add(inner);
    }

    return 'stored';
  }

  private refuse(outer: number, inner: number): LearnResult {
    this.refused.add(outer + '>' + inner);

    if (__DEV__) {
      warnOnce(
        'order-refused-edge',
        `"${nameOf(outer)}" wraps "${nameOf(inner)}" here, but their order is already fixed, so "${nameOf(outer)}" stays where it is. Raise the specificity of the one that should win.`,
        outer + '>' + inner
      );
    }

    return 'refused';
  }

  /** True when `to` is `from` or one of its transitive outers; with `pinnedOnly`, through chain edges alone. */
  private reaches(from: number, to: number, pinnedOnly: boolean): boolean {
    const seen = new Set([from]);
    const stack = [from];

    for (let group = stack.pop(); group !== undefined; group = stack.pop()) {
      if (group === to) return true;

      const outers = this.outers.get(group);
      if (outers === undefined) continue;

      for (const [outer, pin] of outers) {
        if ((!pinnedOnly || pin) && !seen.has(outer)) {
          seen.add(outer);
          stack.push(outer);
        }
      }
    }

    return false;
  }

  private transitiveOuters(group: number): Set<number> {
    const result = new Set<number>();
    const stack = [group];

    for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
      const outers = this.outers.get(next);
      if (outers === undefined) continue;

      for (const outer of outers.keys()) {
        if (!result.has(outer)) {
          result.add(outer);
          stack.push(outer);
        }
      }
    }

    return result;
  }

  /** The groups a flush must treat as sharing an element with `group`: its transitive outers and its contested partners and theirs. */
  private relatedTo(group: number): Set<number> {
    const related = this.transitiveOuters(group);
    if (this.contested.size === 0) return related;

    const stack = [group];
    const visited = new Set([group]);
    for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
      for (const [a, b] of this.contested.values()) {
        const partner = a === next ? b : b === next ? a : undefined;
        if (partner === undefined || visited.has(partner)) continue;

        visited.add(partner);
        related.add(partner);
        stack.push(partner);
      }
    }

    return related;
  }

  /** True when the new edge would order a contested pair, directly or through stored edges. */
  private ordersContested(outer: number, inner: number): boolean {
    for (const [x, y] of this.contested.values()) {
      if (this.runsThrough(x, y, outer, inner) || this.runsThrough(y, x, outer, inner)) return true;
    }
    return false;
  }

  /** `outer` after `inner` would put `after` after `before` by a path: `before` reaches `inner` and `outer` reaches `after`. */
  private runsThrough(before: number, after: number, outer: number, inner: number): boolean {
    return (
      (before === inner || this.reaches(before, inner, false)) &&
      (outer === after || this.reaches(outer, after, false))
    );
  }

  /** The groups a learned edge's move takes along: the outer and its transitive outers at or before the inner. */
  private moveSet(outer: number, inner: number): Set<number> {
    const limit = this.positionOf(inner);
    const outers = this.transitiveOuters(outer);
    const moving = new Set<number>();

    if (this.positionOf(outer) <= limit) moving.add(outer);
    for (const group of outers) {
      if (this.positionOf(group) <= limit) moving.add(group);
    }

    return moving;
  }

  /**
   * A contest move or full block takes `start`, its transitive outers, and the second member of every
   * contested pair whose first member is carried, closed under both, among groups at or before `limit`.
   */
  private carried(start: number, limit: number): Set<number> {
    const set = new Set([start]);
    const stack = [start];

    for (let group = stack.pop(); group !== undefined; group = stack.pop()) {
      const next: number[] = [];

      const outers = this.outers.get(group);
      if (outers !== undefined) next.push(...outers.keys());
      if (this.contested.size > 0) {
        for (const [a, b] of this.contested.values()) {
          if (a === group) next.push(b);
        }
      }

      for (const candidate of next) {
        if (!set.has(candidate) && this.positionOf(candidate) <= limit) {
          set.add(candidate);
          stack.push(candidate);
        }
      }
    }

    return set;
  }

  /** True when moving `moving` past `target` would carry a contested pair's first member past its second. */
  private breaksContested(moving: Set<number>, target: number): boolean {
    const limit = this.positionOf(target);

    for (const [first, second] of this.contested.values()) {
      if (
        moving.has(first) &&
        !moving.has(second) &&
        this.positionOf(first) < this.positionOf(second) &&
        this.positionOf(second) <= limit
      ) {
        return true;
      }
    }

    return false;
  }

  /** Moves `moving` (kept in their current relative order) to just after `target`, or to the end when `target` is null. */
  private moveAfter(moving: Set<number>, target: number | null) {
    const group = this.positions.filter(candidate => moving.has(candidate));
    const layersBefore = __DEV__ ? this.layerOrder() : undefined;

    this.listener?.beforeMove(group);

    const rest = this.positions.filter(candidate => !moving.has(candidate));
    const at = target === null ? rest.length : rest.indexOf(target) + 1;
    rest.splice(at, 0, ...group);
    this.positions = rest;
    this.reindex(0);

    this.listener?.afterMove(group);

    if (__DEV__ && layersBefore !== undefined) {
      const layersAfter = this.layerOrder();
      if (layersAfter !== undefined && layersAfter.join() !== layersBefore.join()) {
        warnOnce(
          'order-layer-moved',
          `Reordering components changed the order of the cascade layers ${layersAfter.map(name => `"${name}"`).join(', ')}. Declare the order up front in a global style, for example "@layer ${layersAfter.join(', ')};", so it does not depend on component order.`
        );
      }
    }
  }

  /** Development only: layer names by the position of the first group naming each. */
  private layerOrder(): string[] | undefined {
    if (!__DEV__) return undefined;

    const layers = this.layerGroups;
    if (layers === undefined || layers.size < 2) return undefined;

    const firstAt: Array<[name: string, at: number]> = [];
    for (const [name, groups] of layers) {
      let first = Infinity;
      for (const group of groups) {
        const at = this.positionOf(group);
        if (at !== -1 && at < first) first = at;
      }
      firstAt.push([name, first]);
    }

    return firstAt.sort((a, b) => a[1] - b[1]).map(entry => entry[0]);
  }

  /** Members in key order, keeping every pinned path and every earlier contested pair among them fixed. */
  private contestOrder(members: Set<number>): number[] {
    const left = [...members].sort((a, b) => this.keyOf(a) - this.keyOf(b));
    const order: number[] = [];

    const mustPrecede = (before: number, after: number) => {
      if (this.reaches(before, after, true)) return true;

      for (const [first, second] of this.contested.values()) {
        if (first === before && second === after) return true;
      }
      return false;
    };

    while (left.length > 0) {
      const index = left.findIndex(
        group => !left.some(other => other !== group && mustPrecede(other, group))
      );
      order.push(...left.splice(index, 1));
    }

    return order;
  }

  /** A learned edge closed a cycle: contest every pair of its members no pin orders, then order them by contest order. */
  private contestCycle(outer: number, inner: number) {
    const members = new Set<number>();
    const forward = new Set([outer, ...this.transitiveOuters(outer)]);
    for (const group of forward) {
      if (group === inner || this.reaches(group, inner, false)) members.add(group);
    }
    members.add(inner);

    for (const group of members) {
      const outers = this.outers.get(group);
      if (outers === undefined) continue;

      for (const [other, pin] of [...outers]) {
        if (!pin && members.has(other)) outers.delete(other);
      }
    }

    const order = this.contestOrder(members);
    const fresh: Array<readonly [number, number]> = [];

    for (let s = 0; s < order.length; s++) {
      for (let t = s + 1; t < order.length; t++) {
        const first = order[s];
        const second = order[t];
        const key = pairKey(first, second);

        if (
          this.contested.has(key) ||
          this.reaches(first, second, true) ||
          this.reaches(second, first, true)
        ) {
          continue;
        }

        const pair = [first, second] as const;
        this.contested.set(key, pair);
        fresh.push(pair);

        if (this.flushed.size > 0 && this.flushed.has(first) && this.flushed.has(second)) {
          this.edgeSeeds.add(first);
        }

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
      if (this.positionOf(second) < this.positionOf(first)) {
        const moving = this.carried(second, this.positionOf(first));
        if (!moving.has(first)) this.moveAfter(moving, first);
      }
    }
  }
}
