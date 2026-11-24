/**
 * Cost of the sheet's output order at 1,000 groups (a large app's component count).
 *
 * - Insert: placing groups by key, and writing one rule into each through a `GroupedTag`.
 * - Move: `learn` moving the first group after the last, which reorders the positions and takes
 *   the moved group's rules out of the tag and back in at their new offset. Asserted under 1 ms.
 * - Contested check: `learn` on an order with no contested pairs against the same order holding one
 *   unrelated contested pair. The first never runs the contested check (a presence check on the
 *   pair map guards it), so it must not be slower than the second.
 *
 * Run: pnpm --filter styled-components bench:web -- order.bench
 */
import { performance } from 'perf_hooks';
import { makeGroupedTag } from '../sheet/GroupedTag';
import { GROUP_KIND, Order, TIER, makeKey } from '../sheet/Order';
import { createStreamFlush } from '../sheet/serverOrder';
import { VirtualTag } from '../sheet/Tag';
import { bench as _bench } from './bench-utils';

const GROUPS = 1000;
const MOVES = 200;

const bench = (name: string, iterations: number, fn: (i: number) => void) =>
  _bench(name, iterations, fn, { nameWidth: 56, precision: 2, runs: 7 });

/** An order of `count` client components defined in order, with a tag that follows its moves. */
const buildSheet = (count: number) => {
  const order = new Order();
  const tag = makeGroupedTag(new VirtualTag(), order);

  order.moveListener = {
    afterMove: groups => tag.attachGroups(groups),
    beforeMove: groups => tag.detachGroups(groups),
  };

  for (let group = 1; group <= count; group++) {
    order.place(group, makeKey(TIER.client, group), GROUP_KIND.component);
    tag.insertRules(group, ['.c' + group + ' { color: red; }']);
  }

  return { order, tag };
};

const median = (samples: number[]) => samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)];

describe('order', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('inserts 1,000 groups', () => {
    console.log(`\norder insert, ${GROUPS} groups`);

    bench('place by key, definition order', 20, () => {
      const order = new Order();
      for (let group = 1; group <= GROUPS; group++) {
        order.place(group, makeKey(TIER.client, group), GROUP_KIND.component);
      }
    });

    bench('place by key, globals after every component', 20, () => {
      const order = new Order();
      for (let group = 1; group <= GROUPS; group++) {
        const global = group % 2 === 0;
        order.place(
          group,
          makeKey(global ? TIER.clientGlobal : TIER.client, group),
          global ? GROUP_KIND.global : GROUP_KIND.component
        );
      }
    });

    bench('place and write one rule per group', 20, () => {
      buildSheet(GROUPS);
    });
  });

  it('moves a group in under 1 ms at 1,000 groups', () => {
    const { order, tag } = buildSheet(GROUPS);

    const move = () => {
      const { posList } = order;
      order.learn(posList[0], posList[posList.length - 1]);
    };

    for (let i = 0; i < 50; i++) move();

    const startedAt = performance.now();
    for (let i = 0; i < MOVES; i++) move();
    const perMoveMs = (performance.now() - startedAt) / MOVES;

    console.log(`\norder move, ${GROUPS} groups: ${perMoveMs.toFixed(3)}ms per move`);

    expect(order.posList).toHaveLength(GROUPS);
    expect(tag.tag.length).toBe(GROUPS);
    expect(perMoveMs).toBeLessThan(1);
  });

  it('pays no contested check when the order has no contested pairs', () => {
    const runs = 11;
    const pairs = 2000;
    const withoutPairs: number[] = [];
    const withPair: number[] = [];

    const timeLearns = (order: Order) => {
      const startedAt = performance.now();
      for (let outer = 2; outer <= pairs; outer++) order.learn(outer, outer - 1);
      return performance.now() - startedAt;
    };

    const buildOrder = (contested: boolean) => {
      const order = new Order();
      for (let group = 1; group <= pairs + 2; group++) {
        order.place(group, makeKey(TIER.client, group), GROUP_KIND.component);
      }

      if (contested) {
        // One pair far from every pair the timed loop learns
        order.learn(pairs + 2, pairs + 1);
        order.learn(pairs + 1, pairs + 2);
      }

      return order;
    };

    for (let run = 0; run < runs; run++) {
      const plain = buildOrder(false);
      const guarded = buildOrder(true);
      expect(guarded.contested.size).toBe(1);

      withoutPairs.push(timeLearns(plain));
      withPair.push(timeLearns(guarded));
    }

    const without = median(withoutPairs);
    const guarded = median(withPair);

    console.log(
      `\norder learn, ${pairs} edges: no contested pairs ${without.toFixed(2)}ms, one unrelated contested pair ${guarded.toFixed(2)}ms`
    );

    expect(without).toBeLessThan(guarded * 1.5);
  });

  it('computes StreamFlush.reemitFor without scanning every flushed group per seed', () => {
    const flushes = 20;
    const perFlush = 100;
    const totalGroups = flushes * perFlush;

    const runMultiFlush = () => {
      const order = new Order();
      const stream = (order.streamFlush = createStreamFlush(order));
      const tag = makeGroupedTag(new VirtualTag(), order);
      let reemitMs = 0;

      for (let f = 0; f < flushes; f++) {
        const start = f * perFlush + 1;
        const end = start + perFlush;
        for (let group = start; group < end; group++) {
          order.place(group, makeKey(TIER.client, group), GROUP_KIND.component);
          tag.insertRules(group, ['.c' + group + ' { color: red; }']);
        }

        const startedAt = performance.now();
        const reemit = stream.reemitFor(tag.groupSizes);
        reemitMs += performance.now() - startedAt;

        if (f > 0) expect(reemit?.size).toBe(0);
        stream.recordFlush(tag);
        for (let group = start; group < end; group++) tag.clearGroup(group);
      }

      expect(stream.flushed.size).toBe(totalGroups);
      return reemitMs;
    };

    // Warm up JIT before sampling.
    runMultiFlush();
    const samples = [runMultiFlush(), runMultiFlush(), runMultiFlush()];
    const elapsed = median(samples);

    console.log(
      `\nStreamFlush.reemitFor, ${flushes} flushes x ${perFlush} groups (${totalGroups} total): ${elapsed.toFixed(2)}ms`
    );

    expect(elapsed).toBeLessThan(15);
  });
});
