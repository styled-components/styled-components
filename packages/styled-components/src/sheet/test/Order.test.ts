import { resetWarnOnce } from '../../utils/warnOnce';
import {
  baseGroupOf,
  extGroupsOf,
  groupForId,
  registerBase,
  registerLabel,
  resetGroupIds,
} from '../GroupIDAllocator';
import {
  GROUP_KIND,
  GroupKind,
  Order,
  TIER,
  Tier,
  makeKey,
  noteLayers,
  pinGroup,
  serverSeqOf,
} from '../Order';
import { createStreamFlush } from '../serverOrder';

const client = (group: number) => makeKey(TIER.client, group);

/** An order with every group placed by its own number, client tier, in the given arrival order. */
const orderOf = (...groups: number[]) => {
  const order = new Order();
  for (const group of groups) order.place(group, client(group), GROUP_KIND.component);
  return order;
};

/**
 * I4: every stored edge holds in position order, every contested pair holds its contest order, and
 * no stored path orders a contested pair. Returns what is broken; empty when I4 holds.
 */
const violations = (order: Order) => {
  const broken: string[] = [];
  const at = (group: number) => order.positionOf(group);
  const reaches = (from: number, to: number) => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length > 0) {
      const group = stack.pop() as number;
      if (group === to) return true;
      for (const outer of order.outerMap.get(group)?.keys() ?? []) {
        if (!seen.has(outer)) {
          seen.add(outer);
          stack.push(outer);
        }
      }
    }
    return false;
  };

  for (const [inner, outers] of order.outerMap) {
    for (const outer of outers.keys()) {
      if (at(outer) >= 0 && at(inner) >= 0 && at(outer) < at(inner)) {
        broken.push(`edge ${outer} after ${inner} broken`);
      }
    }
  }

  for (const [first, second] of order.contested.values()) {
    if (at(second) < at(first)) broken.push(`contested ${first} before ${second} broken`);
    if (reaches(first, second) || reaches(second, first)) {
      broken.push(`contested {${first},${second}} ordered by a stored path`);
    }
  }

  return broken;
};

let warn: jest.SpyInstance;

beforeEach(() => {
  resetGroupIds();
  resetWarnOnce();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('serverSeqOf', () => {
  test.each<[string, number, number | undefined]>([
    ['a server key', makeKey(TIER.server, 7), 7],
    ['a server global key', makeKey(TIER.serverGlobal, 3), 3],
    ['a server key with seq 0', makeKey(TIER.server, 0), 0],
    ['a client key', makeKey(TIER.client, 7), undefined],
    ['a client global key', makeKey(TIER.clientGlobal, 7), undefined],
  ])('reads the seq of %s', (_title, key, expected) => {
    expect(serverSeqOf(key)).toBe(expected);
  });
});

describe('default placement', () => {
  type Arrival = [group: number, tier: Tier, seq: number, kind?: GroupKind];

  test.each<[string, Arrival[], number[]]>([
    [
      'sorts the four tiers server global, client global, server, client',
      [
        [1, TIER.client, 1],
        [2, TIER.server, 1],
        [3, TIER.clientGlobal, 1],
        [4, TIER.serverGlobal, 1],
      ],
      [4, 3, 2, 1],
    ],
    [
      'orders a tier by seq whatever the arrival order',
      [
        [1, TIER.client, 30],
        [2, TIER.client, 10],
        [3, TIER.client, 20],
      ],
      [2, 3, 1],
    ],
    [
      'puts keyframes in their graph global tier',
      [
        [1, TIER.client, 1],
        [2, TIER.clientGlobal, 9, GROUP_KIND.keyframes],
        [3, TIER.serverGlobal, 9, GROUP_KIND.keyframes],
        [4, TIER.clientGlobal, 5, GROUP_KIND.global],
      ],
      [3, 4, 2, 1],
    ],
    [
      'keeps arrival order for the same key',
      [
        [1, TIER.client, 7],
        [2, TIER.client, 7],
      ],
      [1, 2],
    ],
  ])('%s', (_title, arrivals, expected) => {
    const order = new Order();
    for (const [group, tier, seq, kind = GROUP_KIND.component] of arrivals) {
      order.place(group, makeKey(tier, seq), kind);
    }

    expect(order.posList).toEqual(expected);
  });

  it('places by the greatest position among smaller keys when positions are not sorted by key', () => {
    const order = new Order();
    order.place(1, makeKey(TIER.client, 10), GROUP_KIND.component);
    order.place(2, makeKey(TIER.client, 20), GROUP_KIND.component);
    order.learn(1, 2);
    expect(order.posList).toEqual([2, 1]);

    order.place(3, makeKey(TIER.client, 15), GROUP_KIND.component);

    // Group 1 (key 10) is the last position among the smaller keys, so 3 follows it.
    expect(order.posList).toEqual([2, 1, 3]);
  });

  it('keeps the first key a group arrives with, and its place', () => {
    const order = new Order();
    order.place(1, makeKey(TIER.server, 5), GROUP_KIND.component);
    order.place(2, makeKey(TIER.client, 1), GROUP_KIND.component);

    order.place(1, makeKey(TIER.client, 99), GROUP_KIND.component);

    expect(order.keyOf(1)).toBe(makeKey(TIER.server, 5));
    expect(order.posList).toEqual([1, 2]);
  });

  it('reports a key only once one arrived', () => {
    const order = orderOf(1);

    expect(order.hasKey(1)).toBe(true);
    expect(order.hasKey(2)).toBe(false);
  });

  describe('on a server sheet that has flushed', () => {
    it('puts a component after the last flushed group whatever its key', () => {
      const order = orderOf(5, 6);
      const stream = (order.streamFlush = createStreamFlush(order));
      stream.flushed.set(6, 'rules');

      order.place(1, client(1), GROUP_KIND.component);

      expect(order.posList).toEqual([5, 6, 1]);
    });

    it('still puts a component by its key when that is after the last flushed group', () => {
      const order = orderOf(1, 2, 6);
      const stream = (order.streamFlush = createStreamFlush(order));
      stream.flushed.set(2, 'rules');

      order.place(4, client(4), GROUP_KIND.component);

      expect(order.posList).toEqual([1, 2, 4, 6]);
    });

    it.each([
      ['a global', GROUP_KIND.global],
      ['keyframes', GROUP_KIND.keyframes],
    ])('keeps key placement for %s', (_title, kind) => {
      const order = orderOf(5, 6);
      const stream = (order.streamFlush = createStreamFlush(order));
      stream.flushed.set(6, 'rules');

      order.place(1, makeKey(TIER.clientGlobal, 1), kind);

      expect(order.posList).toEqual([1, 5, 6]);
    });

    it('clears attached stream state on reset', () => {
      const order = new Order();
      const stream = (order.streamFlush = createStreamFlush(order));
      order.place(1, makeKey(TIER.clientGlobal, 1), GROUP_KIND.global);
      order.place(2, makeKey(TIER.clientGlobal, 2), GROUP_KIND.keyframes);
      stream.flushed.set(1, 'g');
      stream.edgeSeeds.add(1);

      order.reset();

      expect(stream.flushed.size).toBe(0);
      expect(stream.edgeSeeds.size).toBe(0);

      order.place(5, client(5), GROUP_KIND.component);
      stream.flushed.set(5, 'rules');
      order.place(1, client(1), GROUP_KIND.component);
      order.place(2, client(2), GROUP_KIND.component);

      expect(order.posList).toEqual([5, 1, 2]);
    });

    it('places a pinned extension after the last flushed group instead of right after its base', () => {
      const base = groupForId('Base');
      const unrelated = groupForId('Unrelated');
      const ext = groupForId('Ext');
      registerBase('Ext', 'Base');

      const order = new Order();
      const stream = (order.streamFlush = createStreamFlush(order));
      order.place(base, client(base), GROUP_KIND.component);
      order.place(unrelated, client(unrelated), GROUP_KIND.component);
      stream.flushed.set(base, '.base {}');
      stream.flushed.set(unrelated, '.unrelated {}');

      order.place(ext, client(ext), GROUP_KIND.component);

      expect(order.posList).toEqual([base, unrelated, ext]);
    });

    it('places an unpositioned outer after the last flushed group when learning an edge', () => {
      const order = orderOf(1, 2);
      const stream = (order.streamFlush = createStreamFlush(order));
      stream.flushed.set(1, '.a {}');
      stream.flushed.set(2, '.b {}');

      order.learn(3, 1);

      expect(order.posList).toEqual([1, 2, 3]);
    });
  });
});

describe('learn', () => {
  it('moves the outer after the inner and stores the edge', () => {
    const order = orderOf(1, 2);

    expect(order.learn(1, 2)).toBe('stored');

    expect(order.posList).toEqual([2, 1]);
    expect(order.isSettled(1, 2)).toBe(true);
  });

  it('moves nothing when the edge already holds', () => {
    const order = orderOf(1, 2);

    expect(order.learn(2, 1)).toBe('stored');

    expect(order.posList).toEqual([1, 2]);
  });

  it('skips a self edge', () => {
    const order = orderOf(1, 2);

    expect(order.learn(1, 1)).toBe('settled');

    expect(order.posList).toEqual([1, 2]);
    expect(order.outerMap.size).toBe(0);
  });

  it('skips an edge it already stores', () => {
    const order = orderOf(1, 2, 3);
    order.learn(1, 2);
    const positions = [...order.posList];

    expect(order.learn(1, 2)).toBe('settled');

    expect(order.posList).toEqual(positions);
  });

  it('moves the outer with every transitive outer positioned at or before the inner, keeping their order', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(2, 1);

    // Group 2 is an outer of 1, so it goes along when 1 goes after 4.
    order.learn(1, 4);

    expect(order.posList).toEqual([3, 4, 1, 2]);
  });

  it('leaves an outer positioned after the inner where it is, with its own outers', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(4, 1);
    order.learn(3, 1);

    order.learn(1, 2);

    // 1 passes 2, and 3 and 4 (outers of 1) sit after 2 already, so only 1 moves.
    expect(order.posList).toEqual([2, 1, 3, 4]);
  });

  it('positions an unpositioned outer right after the inner', () => {
    const order = orderOf(1, 2);

    order.learn(5, 1);

    expect(order.posList).toEqual([1, 5, 2]);
  });

  it('gives an unpositioned inner default placement, then moves the outer after it', () => {
    const order = orderOf(1);

    order.learn(1, 7);

    expect(order.posList).toEqual([7, 1]);
  });

  it('gives an edge-positioned group its key when its rules arrive, without moving it', () => {
    const order = orderOf(1, 2);
    order.learn(7, 1);
    expect(order.hasKey(7)).toBe(false);

    order.place(7, makeKey(TIER.serverGlobal, 1), GROUP_KIND.component);

    expect(order.keyOf(7)).toBe(makeKey(TIER.serverGlobal, 1));
    expect(order.posList).toEqual([1, 7, 2]);
  });

  describe('edge seeds', () => {
    it.each([
      ['both endpoints flushed', [1, 2]],
      ['only the outer flushed', [2]],
      ['only the inner flushed', [1]],
      ['another group flushed', [3]],
    ])('collects the inner after a flush when %s', (_title, flushed) => {
      const order = orderOf(1, 2, 3);
      const stream = (order.streamFlush = createStreamFlush(order));
      for (const group of flushed) stream.flushed.set(group, 'x');

      order.learn(2, 1);

      expect([...stream.edgeSeeds]).toEqual([1]);
    });

    it('collects nothing before the first flush', () => {
      const order = orderOf(1, 2, 3);
      const stream = (order.streamFlush = createStreamFlush(order));

      order.learn(2, 1);

      expect([...stream.edgeSeeds]).toEqual([]);
    });
  });
});

describe('cycle rule', () => {
  it('contests a pair when a learned path closes a cycle, refusing the edge and dropping the learned edges', () => {
    const order = orderOf(1, 2);
    order.learn(2, 1);

    expect(order.learn(1, 2)).toBe('contested');

    expect([...order.contested.values()]).toEqual([[1, 2]]);
    expect(order.outerMap.get(1)?.size ?? 0).toBe(0);
    expect(order.outerMap.get(2)?.size ?? 0).toBe(0);
    expect(order.posList).toEqual([1, 2]);
    expect(order.isSettled(1, 2)).toBe(true);
    expect(order.isSettled(2, 1)).toBe(true);
  });

  it('moves the second member after the first when positions disagree', () => {
    const order = orderOf(1, 2);
    order.learn(1, 2);
    expect(order.posList).toEqual([2, 1]);

    order.learn(2, 1);

    // Key order decides: 1 first, 2 second, so 2 moves after 1.
    expect(order.posList).toEqual([1, 2]);
    expect(violations(order)).toEqual([]);
  });

  it('refuses a cycle through a pinned-only path and contests nothing', () => {
    const base = groupForId('Base');
    const extension = groupForId('Extension');
    registerBase('Extension', 'Base');
    const order = new Order();
    order.place(base, client(base), GROUP_KIND.component);
    order.place(extension, client(extension), GROUP_KIND.component);
    expect(order.outerMap.get(base)?.get(extension)).toBe(true);

    expect(order.learn(base, extension)).toBe('refused');

    expect(order.contested.size).toBe(0);
    expect(order.posList).toEqual([base, extension]);
    expect(order.isSettled(base, extension)).toBe(true);
  });

  it('refuses a later learn between contested members in either direction and moves nothing', () => {
    const order = orderOf(1, 2, 3);
    order.learn(2, 1);
    order.learn(1, 2);

    expect(order.learn(2, 1)).toBe('settled');
    expect(order.learn(1, 2)).toBe('settled');
    expect(order.posList).toEqual([1, 2, 3]);
  });

  it('refuses an edge that would order a contested pair through a path', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(2, 1);
    order.learn(1, 2);
    expect(order.learn(3, 1)).toBe('stored');
    expect(order.learn(2, 4)).toBe('stored');
    expect(order.posList).toEqual([1, 3, 4, 2]);

    // 1 < 3 < 4 < 2 would order the contested pair {1, 2} by a path.
    expect(order.learn(4, 3)).toBe('refused');

    expect(order.posList).toEqual([1, 3, 4, 2]);
    expect(order.isSettled(4, 3)).toBe(true);
    expect(violations(order)).toEqual([]);
  });

  it('refuses an edge that closes a cycle through a chain of contested pairs', () => {
    const order = orderOf(1, 2, 3, 4);

    expect(order.learn(2, 3)).toBe('stored');
    expect(order.learn(3, 2)).toBe('contested');
    expect(order.learn(3, 4)).toBe('stored');
    expect(order.learn(4, 3)).toBe('contested');
    expect([...order.contested.values()]).toEqual([
      [2, 3],
      [3, 4],
    ]);

    expect(order.learn(1, 4)).toBe('stored');
    expect(order.learn(1, 2)).toBe('stored');
    expect(order.posList).toEqual([2, 3, 4, 1]);

    // 2 <(contested) 3 <(contested) 4 -> 1 already holds, so 1 -> 2 would close a cycle.
    expect(order.learn(2, 1)).toBe('refused');
    expect(order.posList).toEqual([2, 3, 4, 1]);
    expect(violations(order)).toEqual([]);
  });

  it('adds the first member to the edge seeds when both members of a new contested pair were flushed', () => {
    const order = orderOf(1, 2, 3);
    const stream = (order.streamFlush = createStreamFlush(order));
    stream.flushed.set(1, 'a');
    stream.flushed.set(2, 'b');
    order.learn(2, 1);
    stream.edgeSeeds.clear();

    order.learn(1, 2);

    expect([...stream.edgeSeeds]).toEqual([1]);
  });

  describe('a 3-cycle', () => {
    // The closing edge is the one learned last; the other two are learned first.
    test.each<[string, Array<[number, number]>]>([
      [
        '1 after 3 closes it',
        [
          [2, 1],
          [3, 2],
          [1, 3],
        ],
      ],
      [
        '3 after 2 closes it',
        [
          [1, 3],
          [2, 1],
          [3, 2],
        ],
      ],
      [
        '2 after 1 closes it',
        [
          [3, 2],
          [1, 3],
          [2, 1],
        ],
      ],
    ])('contests all three pairs and ends in key order when %s', (_title, edges) => {
      const order = orderOf(1, 2, 3);

      const results = edges.map(([outer, inner]) => order.learn(outer, inner));

      expect(results[2]).toBe('contested');
      expect([...order.contested.values()].sort()).toEqual([
        [1, 2],
        [1, 3],
        [2, 3],
      ]);
      expect(order.posList).toEqual([1, 2, 3]);
      expect(violations(order)).toEqual([]);
    });
  });

  describe('the move check', () => {
    it('refuses an edge whose move would carry the first member of a contested pair past the second', () => {
      const order = orderOf(1, 2, 3);
      order.learn(2, 1);
      order.learn(1, 2);

      // Moving 1 after 3 would pass 2.
      expect(order.learn(1, 3)).toBe('refused');

      expect(order.posList).toEqual([1, 2, 3]);
      expect(order.isSettled(1, 3)).toBe(true);
    });

    it('holds I4 for the review hand case', () => {
      const order = orderOf(1, 2, 3, 4);

      const results = [order.learn(2, 1), order.learn(1, 2), order.learn(1, 3), order.learn(3, 4)];

      expect(results).toEqual(['stored', 'contested', 'refused', 'stored']);
      expect(order.posList).toEqual([1, 2, 4, 3]);
      expect(violations(order)).toEqual([]);
    });
  });

  describe('carry sets', () => {
    it('takes the second member of a carried first member along in a contest move', () => {
      const order = orderOf(1, 2, 3);
      order.learn(1, 2);
      order.learn(2, 3);
      expect(order.posList).toEqual([3, 2, 1]);

      order.learn(3, 1);

      // Moving 2 after 1 carries 3 (the second member of the pair {2, 3}) so that pair holds.
      expect(order.posList).toEqual([1, 2, 3]);
      expect(violations(order)).toEqual([]);
    });

    it('takes the second member of a carried first member along in a full block move', () => {
      const order = orderOf(1, 2, 3);
      order.learn(2, 1);
      order.learn(1, 2);

      order.moveToEnd(1);

      expect(order.posList).toEqual([3, 1, 2]);
      expect(violations(order)).toEqual([]);
    });

    it('moves only the second member when it has no carried partner', () => {
      const order = orderOf(1, 2, 3);
      order.learn(2, 1);
      order.learn(1, 2);

      order.moveToEnd(2);

      expect(order.posList).toEqual([1, 3, 2]);
    });

    it('appends an unpositioned group', () => {
      const order = orderOf(1, 2);

      order.moveToEnd(9);

      expect(order.posList).toEqual([1, 2, 9]);
    });
  });

  describe('refused edges settle', () => {
    it.each<[string, (order: Order) => [outer: number, inner: number]]>([
      [
        'a contested check',
        order => {
          order.learn(2, 1);
          order.learn(1, 2);
          order.learn(3, 1);
          order.learn(2, 4);
          return [4, 3];
        },
      ],
      [
        'a move check',
        order => {
          order.learn(2, 1);
          order.learn(1, 2);
          return [1, 3];
        },
      ],
    ])('settles an edge refused by %s, and a second learn changes nothing', (_title, arrange) => {
      const order = orderOf(1, 2, 3, 4);
      const [outer, inner] = arrange(order);
      expect(order.isSettled(outer, inner)).toBe(false);

      expect(order.learn(outer, inner)).toBe('refused');
      const positions = [...order.posList];

      expect(order.isSettled(outer, inner)).toBe(true);
      expect(order.learn(outer, inner)).toBe('settled');
      expect(order.posList).toEqual(positions);
    });

    it('settles an edge refused by a pinned-only cycle', () => {
      const base = groupForId('Base');
      const extension = groupForId('Extension');
      registerBase('Extension', 'Base');
      const order = new Order();
      order.place(base, client(base), GROUP_KIND.component);
      order.place(extension, client(extension), GROUP_KIND.component);

      expect(order.learn(base, extension)).toBe('refused');
      expect(order.learn(base, extension)).toBe('settled');
      expect(order.isSettled(base, extension)).toBe(true);
    });

    it('settles a stored edge and a contested pair, and nothing else', () => {
      const order = orderOf(1, 2, 3, 4);
      order.learn(1, 2);
      order.learn(2, 3);
      order.learn(3, 2);

      expect(order.isSettled(1, 2)).toBe(true);
      expect(order.isSettled(3, 2)).toBe(true);
      expect(order.isSettled(2, 3)).toBe(true);
      expect(order.isSettled(4, 1)).toBe(false);
      expect(order.isSettled(1, 4)).toBe(false);
    });
  });

  describe('warnings', () => {
    it('warns once for a contested pair, naming both components and the winner', () => {
      const alpha = groupForId('Alpha');
      const beta = groupForId('Beta');
      const order = new Order();
      order.place(alpha, client(alpha), GROUP_KIND.component);
      order.place(beta, client(beta), GROUP_KIND.component);
      order.learn(beta, alpha);

      order.learn(alpha, beta);
      order.learn(alpha, beta);

      expect(warn.mock.calls.map(call => call[0])).toEqual([
        '[sc] Components "Alpha" and "Beta" wrap each other in different places, so their order falls back to definition order: "Beta" sits after "Alpha" and overrides it wherever both style one element. Raise the specificity of the one that should win.',
      ]);
    });

    it('warns once for each refused edge, naming both components', () => {
      const base = groupForId('Base');
      const extension = groupForId('Extension');
      registerBase('Extension', 'Base');
      const order = new Order();
      order.place(base, client(base), GROUP_KIND.component);
      order.place(extension, client(extension), GROUP_KIND.component);

      order.learn(base, extension);
      order.learn(base, extension);

      expect(warn.mock.calls.map(call => call[0])).toEqual([
        '[sc] "Base" wraps "Extension" here, but their order is already fixed, so "Base" stays where it is. Raise the specificity of the one that should win.',
      ]);
    });

    it('names a component by its label when it has one, and by its id when it has none', () => {
      const card = groupForId('sc-card');
      const button = groupForId('sc-button');
      const plain = groupForId('sc-plain');
      registerLabel('sc-card', 'Card');
      registerLabel('sc-button', 'Button');
      const order = new Order();
      for (const group of [card, button, plain]) {
        order.place(group, client(group), GROUP_KIND.component);
      }
      order.learn(button, card);
      order.learn(card, button);
      registerBase('sc-plain', 'sc-card');
      order.learn(card, plain);
      order.learn(card, plain);

      expect(warn.mock.calls.map(call => call[0])).toEqual([
        '[sc] Components "Card" and "Button" wrap each other in different places, so their order falls back to definition order: "Button" sits after "Card" and overrides it wherever both style one element. Raise the specificity of the one that should win.',
        '[sc] "Card" wraps "sc-plain" here, but their order is already fixed, so "Card" stays where it is. Raise the specificity of the one that should win.',
      ]);
    });

    it('stays silent in a production build', () => {
      const alpha = groupForId('Alpha');
      const beta = groupForId('Beta');
      const order = new Order();
      order.place(alpha, client(alpha), GROUP_KIND.component);
      order.place(beta, client(beta), GROUP_KIND.component);
      order.learn(beta, alpha);
      (global as { __DEV__: boolean }).__DEV__ = false;

      try {
        order.learn(alpha, beta);
      } finally {
        (global as { __DEV__: boolean }).__DEV__ = true;
      }

      expect(warn).not.toHaveBeenCalled();
    });
  });
});

describe('pins first', () => {
  it('learns a chain level pin to its base before any other edge touches it', () => {
    const base = groupForId('Base');
    const middle = groupForId('Middle');
    const top = groupForId('Top');
    const other = groupForId('Other');
    registerBase('Middle', 'Base');
    registerBase('Top', 'Middle');
    const order = new Order();
    order.place(other, client(other), GROUP_KIND.component);

    // `Other` wraps `Top`, which is not positioned yet: the chain's pins come first, base first.
    order.learn(other, top);

    expect(order.posList).toEqual([base, middle, top, other]);
    expect(order.outerMap.get(base)?.get(middle)).toBe(true);
    expect(order.outerMap.get(middle)?.get(top)).toBe(true);
    expect(order.outerMap.get(top)?.get(other)).toBe(false);
  });

  it('positions a chain extension right after its base when its rules arrive first', () => {
    const base = groupForId('Base');
    const extension = groupForId('Extension');
    const other = groupForId('Other');
    registerBase('Extension', 'Base');
    const order = new Order();
    order.place(base, client(base), GROUP_KIND.component);
    order.place(other, client(other), GROUP_KIND.component);

    order.place(extension, makeKey(TIER.serverGlobal, 1), GROUP_KIND.component);

    // The pin beats the extension's own key.
    expect(order.posList).toEqual([base, extension, other]);
  });

  it('keeps a pin that runs against keys when contest order is decided', () => {
    // A shared base took the client tier while its extension took the server tier: the pin runs against keys.
    const base = groupForId('Base');
    const extension = groupForId('Extension');
    const other = groupForId('Other');
    registerBase('Extension', 'Base');
    const order = new Order();
    order.place(base, makeKey(TIER.client, 10), GROUP_KIND.component);
    order.place(extension, makeKey(TIER.server, 5), GROUP_KIND.component);
    order.place(other, makeKey(TIER.server, 7), GROUP_KIND.component);
    expect(order.posList).toEqual([base, extension, other]);
    order.learn(other, extension);

    // Base wraps Other, which wraps Extension, which extends Base: a cycle through one pin.
    expect(order.learn(base, other)).toBe('contested');

    // Key order alone would put Extension first (5 < 7 < 10); the pin keeps Base before it, so Other
    // sorts first among the free members and both of its pairs are contested.
    expect([...order.contested.values()]).toEqual([
      [other, base],
      [other, extension],
    ]);
    expect(order.posList).toEqual([other, base, extension]);
    expect(order.outerMap.get(base)?.get(extension)).toBe(true);
    expect(violations(order)).toEqual([]);
  });

  it('refuses a late pin that would order an earlier contested pair and preserves that pair', () => {
    const base = groupForId('Base');
    const extension = groupForId('Extension');
    const other = groupForId('Other');
    const outer = groupForId('Outer');
    const inner = groupForId('Inner');
    registerBase('Extension', 'Base');
    const order = new Order();
    order.place(base, makeKey(TIER.client, 10), GROUP_KIND.component);
    order.place(extension, makeKey(TIER.server, 5), GROUP_KIND.component);
    order.place(other, makeKey(TIER.server, 7), GROUP_KIND.component);
    order.learn(other, extension);
    expect(order.learn(base, other)).toBe('contested');
    expect([...order.contested.values()]).toEqual([
      [other, base],
      [other, extension],
    ]);

    order.place(outer, makeKey(TIER.server, 1), GROUP_KIND.component);
    order.place(inner, makeKey(TIER.server, 6), GROUP_KIND.component);
    expect(order.learn(other, outer)).toBe('stored');
    expect(order.learn(extension, outer)).toBe('stored');
    expect(order.learn(inner, other)).toBe('stored');
    expect(order.learn(inner, extension)).toBe('stored');

    registerBase('Outer', 'Inner');
    expect(order.learn(outer, inner)).toBe('settled');

    expect(
      order.contested.get(extension < other ? `${extension},${other}` : `${other},${extension}`)
    ).toEqual([other, extension]);
    expect(order.pinned.has(outer)).toBe(false);
    expect(order.posList).toEqual([outer, other, base, extension, inner]);
    expect(violations(order)).toEqual([]);
  });

  it('carries rehydrated extensions when their base moves in learn', () => {
    const base = groupForId('Base');
    const sub = groupForId('Sub');
    const other = groupForId('Other');
    const order = new Order();
    order.adoptGroup(base, client(base), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(other, client(other), GROUP_KIND.component, { full: false, late: false });
    registerBase('Sub', 'Base');

    order.learn(base, other);

    expect(order.posList).toEqual([other, base, sub]);
    expect(violations(order)).toEqual([]);
  });

  it('carries rehydrated extensions when their base moves in moveToEnd', () => {
    const base = groupForId('Base');
    const sub = groupForId('Sub');
    const other = groupForId('Other');
    const order = new Order();
    order.adoptGroup(base, client(base), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(other, client(other), GROUP_KIND.component, { full: false, late: false });
    registerBase('Sub', 'Base');

    order.moveToEnd(base);

    expect(order.posList).toEqual([other, base, sub]);
    expect(violations(order)).toEqual([]);
  });

  it('carries rehydrated extensions of a moved outer transitively', () => {
    const other = groupForId('Other');
    const base = groupForId('Base');
    const sub = groupForId('Sub');
    const late = groupForId('Late');
    const order = new Order();
    order.adoptGroup(other, client(other), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(base, client(base), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(late, client(late), GROUP_KIND.component, { full: false, late: false });
    registerBase('Sub', 'Base');
    order.learn(base, other);

    order.learn(other, late);

    expect(order.posList).toEqual([late, other, base, sub]);
    expect(violations(order)).toEqual([]);
  });

  it('carries rehydrated extensions when a contest move repositions their base', () => {
    const a = groupForId('A');
    const b = groupForId('B');
    const subB = groupForId('SubB');
    const order = new Order();
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(subB, client(subB), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(a, client(a), GROUP_KIND.component, { full: false, late: false });
    registerBase('SubB', 'B');
    order.learn(a, b);

    expect(order.learn(b, a)).toBe('contested');

    expect(order.posList).toEqual([a, b, subB]);
    expect(violations(order)).toEqual([]);
  });

  it('updates extension lookup and repins via pinGroup when registerBase changes a base', () => {
    const base1 = groupForId('Base1');
    const base2 = groupForId('Base2');
    const sub = groupForId('Sub');
    const order = orderOf(base1, base2, sub);
    registerBase('Sub', 'Base1');
    pinGroup(order, sub);
    expect(extGroupsOf(base1)?.has(sub)).toBe(true);
    expect(order.outerMap.get(base1)?.get(sub)).toBe(true);

    registerBase('Sub', 'Base2');
    pinGroup(order, sub);

    expect(extGroupsOf(base1)).toBeUndefined();
    expect(extGroupsOf(base2)?.has(sub)).toBe(true);
    expect(order.outerMap.get(base2)?.get(sub)).toBe(true);
  });

  it('catches a cycle through a late-registered rehydrated extension without displacing globals', () => {
    const globalGroup = groupForId('sc-global-g');
    const outer = groupForId('Outer');
    const sub = groupForId('Sub');
    const inner = groupForId('Inner');
    const order = new Order();
    order.adoptGroup(globalGroup, makeKey(TIER.clientGlobal, globalGroup), GROUP_KIND.global, {
      full: false,
      late: false,
    });
    order.adoptGroup(outer, client(outer), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(inner, client(inner), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(inner, sub)).toBe('stored');

    registerBase('Sub', 'Outer');

    expect(order.learn(outer, inner)).toBe('contested');
    expect(order.posList[0]).toBe(globalGroup);
    expect(order.outerMap.get(inner)?.has(outer)).toBeFalsy();
    expect(violations(order)).toEqual([]);
  });

  it('refuses an edge that orders a contested pair through a late-registered rehydrated extension', () => {
    const a = groupForId('A');
    const b = groupForId('B');
    const outer = groupForId('Outer');
    const sub = groupForId('Sub');
    const order = new Order();
    order.adoptGroup(outer, client(outer), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(a, client(a), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(b, a)).toBe('stored');
    expect(order.learn(a, b)).toBe('contested');
    expect(order.learn(b, sub)).toBe('stored');

    registerBase('Sub', 'Outer');

    expect(order.learn(outer, a)).toBe('refused');
    expect(violations(order)).toEqual([]);
  });

  it('includes a late-registered rehydrated extension in contestCycle so I4 holds', () => {
    const a = groupForId('A');
    const b = groupForId('B');
    const subB = groupForId('SubB');
    const order = new Order();
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(subB, client(subB), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(a, client(a), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(a, b)).toBe('stored');
    expect(order.learn(a, subB)).toBe('stored');

    registerBase('SubB', 'B');

    expect(order.learn(b, a)).toBe('contested');
    expect(order.posList).toEqual([a, b, subB]);
    expect(violations(order)).toEqual([]);
  });

  it('materializes an unpositioned empty base with a positioned extension before checking cycles (Case A)', () => {
    const sub = groupForId('Sub');
    const inner = groupForId('Inner');
    const base = groupForId('Base');
    const order = new Order();
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(inner, client(inner), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(inner, sub)).toBe('stored');

    registerBase('Sub', 'Base');

    expect(order.learn(base, inner)).toBe('contested');
    expect(order.outerMap.get(base)?.get(sub)).toBe(true);
    expect(order.pinned.get(sub)).toBe(base);
    expect(violations(order)).toEqual([]);
  });

  it('materializes an unpositioned empty base with a positioned extension before checking contested pairs (Case A)', () => {
    const sub = groupForId('Sub');
    const a = groupForId('A');
    const b = groupForId('B');
    const base = groupForId('Base');
    const order = new Order();
    order.adoptGroup(sub, client(sub), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(a, client(a), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(b, a)).toBe('stored');
    expect(order.learn(a, b)).toBe('contested');
    expect(order.learn(b, sub)).toBe('stored');

    registerBase('Sub', 'Base');

    expect(order.learn(base, a)).toBe('refused');
    expect(order.outerMap.get(base)?.get(sub)).toBe(true);
    expect(order.pinned.get(sub)).toBe(base);
    expect(violations(order)).toEqual([]);
  });

  it('refuses a late pin that would break or order a pre-existing contested pair (Case B)', () => {
    const a = groupForId('A');
    const b = groupForId('B');
    const subB = groupForId('SubB');
    const order = new Order();
    order.adoptGroup(a, client(a), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(subB, client(subB), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(a, subB)).toBe('stored');
    expect(order.learn(b, a)).toBe('stored');
    expect(order.learn(a, b)).toBe('contested');

    registerBase('SubB', 'B');
    pinGroup(order, subB);

    expect(order.pinned.has(subB)).toBe(false);
    expect(order.outerMap.get(b)?.has(subB)).toBeFalsy();
    expect(order.positionOf(a)).toBeLessThan(order.positionOf(b));
    expect(violations(order)).toEqual([]);
  });

  it('refuses a late pin that would close a cycle in pins union contested (Case C)', () => {
    const subB = groupForId('SubB');
    const a = groupForId('A');
    const b = groupForId('B');
    const order = new Order();
    order.adoptGroup(subB, makeKey(TIER.server, 1), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    order.adoptGroup(a, makeKey(TIER.client, 2), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    order.adoptGroup(b, makeKey(TIER.client, 3), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    expect(order.learn(b, a)).toBe('stored');
    expect(order.learn(a, b)).toBe('contested');
    expect(order.learn(a, subB)).toBe('stored');
    expect(order.learn(subB, a)).toBe('contested');

    registerBase('SubB', 'B');
    pinGroup(order, subB);

    expect(order.pinned.has(subB)).toBe(false);
    expect(order.outerMap.get(b)?.has(subB)).toBeFalsy();
    expect(order.posList).toEqual([subB, a, b]);
    expect(violations(order)).toEqual([]);
  });

  it('honors a late pin over a pre-existing learned cycle and keeps pinned in sync (Case D)', () => {
    const subB = groupForId('SubB');
    const a = groupForId('A');
    const b = groupForId('B');
    const order = new Order();
    order.adoptGroup(subB, makeKey(TIER.server, 1), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    order.adoptGroup(a, makeKey(TIER.client, 2), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    order.adoptGroup(b, makeKey(TIER.client, 3), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    expect(order.learn(a, subB)).toBe('stored');
    expect(order.learn(b, a)).toBe('stored');

    registerBase('SubB', 'B');
    pinGroup(order, subB);

    expect(order.outerMap.get(b)?.get(subB)).toBe(true);
    expect(order.pinned.get(subB)).toBe(b);
    expect(order.posList).toEqual([a, b, subB]);
    expect(violations(order)).toEqual([]);
  });

  it('ignores self-extension in registerBase and never inserts a self-loop in outerMap (Case E)', () => {
    const same = groupForId('Same');
    const order = orderOf(same);

    registerBase('Same', 'Same');
    pinGroup(order, same);

    expect(baseGroupOf(same)).toBeUndefined();
    expect(extGroupsOf(same)).toBeUndefined();
    expect(order.outerMap.get(same)?.has(same)).toBeFalsy();
    expect(order.pinned.has(same)).toBe(false);
    expect(violations(order)).toEqual([]);
  });

  it('upgrades a pre-existing learned edge to pinned on late registerBase', () => {
    const b = groupForId('B');
    const subB = groupForId('SubB');
    const order = new Order();
    order.adoptGroup(b, client(b), GROUP_KIND.component, { full: false, late: false });
    order.adoptGroup(subB, client(subB), GROUP_KIND.component, { full: false, late: false });
    expect(order.learn(subB, b)).toBe('stored');
    expect(order.outerMap.get(b)?.get(subB)).toBe(false);

    registerBase('SubB', 'B');
    pinGroup(order, subB);

    expect(order.outerMap.get(b)?.get(subB)).toBe(true);
    expect(order.pinned.get(subB)).toBe(b);
    expect(violations(order)).toEqual([]);
  });

  it('detects uppercase @LAYER rules in noteLayers when reordering changes layer order', () => {
    const second = groupForId('Second');
    const first = groupForId('First');
    const order = orderOf(second, first);
    noteLayers(order, second, '@LAYER b { .b { color: red; } }');
    noteLayers(order, first, '@Layer a { .a { color: blue; } }');
    noteLayers(order, first, '@layer-custom ignored { .c {} }');

    order.learn(second, first);

    expect(warn.mock.calls.map(call => call[0])).toEqual([
      '[sc] Reordering components changed the order of the cascade layers "a", "b". Declare the order up front in a global style, for example "@layer a, b;", so it does not depend on component order.',
    ]);
  });
});

describe('adoptGroup', () => {
  it('keeps a late full-block global before client components while moving full-block components', () => {
    const g1 = groupForId('sc-global-1');
    const g2 = groupForId('sc-global-2');
    const c1 = groupForId('C1');
    const clientD = groupForId('ClientD');
    const order = new Order();
    order.adoptGroup(g2, makeKey(TIER.clientGlobal, 2), GROUP_KIND.global, {
      full: false,
      late: false,
    });
    order.adoptGroup(c1, makeKey(TIER.server, 1), GROUP_KIND.component, {
      full: false,
      late: false,
    });
    order.place(clientD, makeKey(TIER.client, 1), GROUP_KIND.component);

    order.adoptGroup(g1, makeKey(TIER.serverGlobal, 1), GROUP_KIND.global, {
      full: false,
      late: true,
    });
    order.adoptGroup(g2, makeKey(TIER.clientGlobal, 2), GROUP_KIND.global, {
      full: true,
      late: true,
    });
    order.adoptGroup(c1, makeKey(TIER.server, 1), GROUP_KIND.component, {
      full: true,
      late: true,
    });

    expect(order.posList).toEqual([g1, g2, clientD, c1]);
  });
});

describe('enumeration gate', () => {
  type Op = ['K', number] | ['F', number] | ['L', number, number];

  const learnOps = (groups: number) => {
    const ops: Op[] = [];
    for (let outer = 1; outer <= groups; outer++) {
      for (let inner = 1; inner <= groups; inner++) {
        if (outer !== inner) ops.push(['L', outer, inner]);
      }
    }
    return ops;
  };
  const groupOps = (groups: number, kind: 'F' | 'K') =>
    Array.from({ length: groups }, (_, index): Op => [kind, index + 1]);

  const apply = (order: Order, op: Op) => {
    if (op[0] === 'L') order.learn(op[1], op[2]);
    else if (op[0] === 'F') order.moveToEnd(op[1]);
    else if (!order.hasGroup(op[1])) order.place(op[1], client(op[1]), GROUP_KIND.component);
  };

  /** Runs one sequence and returns the sequence whole with the broken invariants after the first failing operation. */
  const run = (sequence: readonly Op[], groups: number, prePlace: boolean) => {
    const order = new Order();
    if (prePlace) {
      for (let group = 1; group <= groups; group++) {
        order.place(group, client(group), GROUP_KIND.component);
      }
    }

    for (let step = 0; step < sequence.length; step++) {
      apply(order, sequence[step]);
      const broken = violations(order);
      if (broken.length > 0) {
        return `${sequence.map(op => op.join('')).join(' ')} broke at step ${step + 1}: ${broken.join('; ')} (positions ${order.posList.join(',')})`;
      }
    }

    return undefined;
  };

  const everySequence = function* (ops: readonly Op[], depth: number): Generator<Op[]> {
    const counters = new Array<number>(depth).fill(0);
    for (;;) {
      yield counters.map(index => ops[index]);
      let digit = depth - 1;
      while (digit >= 0 && ++counters[digit] === ops.length) counters[digit--] = 0;
      if (digit < 0) return;
    }
  };

  /** mulberry32: a fixed seed gives the same sample every run. */
  const seeded = (seed: number) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const sampleOf = function* (ops: readonly Op[], depth: number, count: number, seed: number) {
    const random = seeded(seed);
    for (let n = 0; n < count; n++) {
      yield Array.from({ length: depth }, () => ops[Math.floor(random() * ops.length)]);
    }
  };

  it('holds I4 after every operation of every E1 and E2 sequence and a fixed sample of E4 and E5', () => {
    const started = Date.now();
    const counts: Record<string, number> = {};
    const failures: string[] = [];
    const gate = (label: string, sequences: Iterable<Op[]>, groups: number, prePlace: boolean) => {
      counts[label] = 0;
      for (const sequence of sequences) {
        counts[label]++;
        const failure = run(sequence, groups, prePlace);
        if (failure !== undefined) {
          failures.push(`${label}: ${failure}`);
          return;
        }
      }
    };

    gate('E1', everySequence(learnOps(4), 4), 4, true);
    gate('E2', everySequence(learnOps(3), 6), 3, true);
    gate('E4', sampleOf([...learnOps(4), ...groupOps(4, 'K')], 5, 50000, 4), 4, false);
    gate('E5', sampleOf([...learnOps(4), ...groupOps(4, 'F')], 5, 50000, 5), 4, true);

    expect(failures).toEqual([]);
    expect(counts).toEqual({ E1: 20736, E2: 46656, E4: 50000, E5: 50000 });
    expect(Date.now() - started).toBeLessThan(5000);
  });

  it('holds I4, bijection, and pinned sync across 500 randomized upfront and late registerBase trials', () => {
    const started = Date.now();
    const random = seeded(0x5c07de2);
    const trials = 500;
    const failures: string[] = [];

    const checkInvariants = (order: Order): string[] => {
      const broken = violations(order);
      if (order.posList.length !== order.posMap.size) {
        broken.push(
          `posList/posMap size mismatch (${order.posList.length} vs ${order.posMap.size})`
        );
      }
      for (let i = 0; i < order.posList.length; i++) {
        if (order.posMap.get(order.posList[i]) !== i) {
          broken.push(`posMap mismatch at index ${i}`);
        }
      }
      for (const [inner, outers] of order.outerMap) {
        for (const outer of outers.keys()) {
          if (outer === inner) broken.push(`self-edge on ${outer}`);
          if (order.positionOf(outer) < 0 || order.positionOf(inner) < 0) {
            broken.push(`unpositioned edge ${outer} after ${inner}`);
          }
        }
      }
      for (const [first, second] of order.contested.values()) {
        if (order.positionOf(first) < 0 || order.positionOf(second) < 0) {
          broken.push(`unpositioned contested {${first},${second}}`);
        }
      }
      for (const [group, base] of order.pinned) {
        if (order.outerMap.get(base)?.get(group) !== true) {
          broken.push(`stale pinned entry ${group} -> ${base}`);
        }
      }
      return broken;
    };

    const ids = ['sc-global-g', 'C1', 'C2', 'C3', 'C4', 'C5'];
    for (let trial = 0; trial < trials; trial++) {
      resetGroupIds();
      const groups = ids.map(id => groupForId(id));
      const keys = groups.map((g, i) => {
        if (i === 0) {
          return makeKey(random() < 0.5 ? TIER.serverGlobal : TIER.clientGlobal, 1);
        }
        return makeKey(random() < 0.5 ? TIER.server : TIER.client, Math.floor(random() * 6) + 1);
      });
      const order = new Order();
      const log: string[] = [];

      // Half of the trials register 1-2 upfront extensions before any order ops.
      if (trial % 2 === 0) {
        const count = 1 + Math.floor(random() * 2);
        for (let k = 0; k < count; k++) {
          const child = 1 + Math.floor(random() * 5);
          const parent = 1 + Math.floor(random() * 5);
          registerBase(ids[child], ids[parent]);
          log.push(`reg(${child},${parent})`);
        }
      }

      for (let step = 0; step < 24; step++) {
        const roll = random();
        if (roll < 0.2) {
          const idx = Math.floor(random() * ids.length);
          const kind = idx === 0 ? GROUP_KIND.global : GROUP_KIND.component;
          const full = random() < 0.3;
          const late = random() < 0.4;
          order.adoptGroup(groups[idx], keys[idx], kind, { full, late });
          log.push(`adopt(${idx},${full ? 'f' : ''}${late ? 'l' : ''})`);
        } else if (roll < 0.35) {
          const idx = Math.floor(random() * ids.length);
          const kind = idx === 0 ? GROUP_KIND.global : GROUP_KIND.component;
          order.place(groups[idx], keys[idx], kind);
          log.push(`place(${idx})`);
        } else if (roll < 0.72) {
          const outer = 1 + Math.floor(random() * 5);
          const inner = 1 + Math.floor(random() * 5);
          order.learn(groups[outer], groups[inner]);
          log.push(`learn(${outer},${inner})`);
        } else if (roll < 0.84) {
          const child = 1 + Math.floor(random() * 5);
          const parent = 1 + Math.floor(random() * 5);
          registerBase(ids[child], ids[parent]);
          log.push(`reg(${child},${parent})`);
        } else if (roll < 0.93) {
          const idx = 1 + Math.floor(random() * 5);
          pinGroup(order, groups[idx]);
          log.push(`pin(${idx})`);
        } else {
          const idx = 1 + Math.floor(random() * 5);
          order.moveToEnd(groups[idx]);
          log.push(`end(${idx})`);
        }

        const broken = checkInvariants(order);
        if (broken.length > 0) {
          failures.push(`trial ${trial} step ${step + 1} [${log.join(' ')}]: ${broken.join('; ')}`);
          break;
        }
      }

      if (failures.length >= 5) break;
    }

    expect(failures).toEqual([]);
    expect(Date.now() - started).toBeLessThan(500);
  });
});

describe('the review sequences', () => {
  // Sequences that broke I4 under the earlier rules; each ends I4-clean under these rules.
  test.each<[string, Array<[outer: number, inner: number]>, number[]]>([
    [
      'review sequence 1: 1 after 2 twice, 2 after 1, 1 after 3',
      [
        [1, 2],
        [1, 2],
        [2, 1],
        [1, 3],
      ],
      [1, 2, 3, 4],
    ],
    [
      'review sequence 2: 1 after 2 twice, 2 after 1, 1 after 4',
      [
        [1, 2],
        [1, 2],
        [2, 1],
        [1, 4],
      ],
      [1, 2, 3, 4],
    ],
    [
      'review sequence 3: 1 after 2, 1 after 3, 2 after 1, 1 after 4',
      [
        [1, 2],
        [1, 3],
        [2, 1],
        [1, 4],
      ],
      [3, 1, 2, 4],
    ],
    [
      'the earlier contest-move failure: 1 after 2 three times, 1 after 3, 3 after 2, 2 after 1',
      [
        [1, 2],
        [1, 2],
        [1, 2],
        [1, 3],
        [3, 2],
        [2, 1],
      ],
      [1, 2, 3, 4],
    ],
  ])('%s', (_title, edges, expected) => {
    const order = orderOf(1, 2, 3, 4);

    for (const [outer, inner] of edges) {
      order.learn(outer, inner);
      expect(violations(order)).toEqual([]);
    }

    expect(order.posList).toEqual(expected);
  });
});
