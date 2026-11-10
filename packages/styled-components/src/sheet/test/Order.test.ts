import { resetWarnOnce } from '../../utils/warnOnce';
import { groupForId, registerBase, registerLabel, resetGroupIds } from '../GroupIDAllocator';
import { GROUP_KIND, GroupKind, Order, TIER, Tier, makeKey, serverSeqOf } from '../Order';

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
      for (const outer of order.outers.get(group)?.keys() ?? []) {
        if (!seen.has(outer)) {
          seen.add(outer);
          stack.push(outer);
        }
      }
    }
    return false;
  };

  for (const [inner, outers] of order.outers) {
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

    expect(order.positions).toEqual(expected);
  });

  it('places by the greatest position among smaller keys when positions are not sorted by key', () => {
    const order = new Order();
    order.place(1, makeKey(TIER.client, 10), GROUP_KIND.component);
    order.place(2, makeKey(TIER.client, 20), GROUP_KIND.component);
    order.learn(1, 2);
    expect(order.positions).toEqual([2, 1]);

    order.place(3, makeKey(TIER.client, 15), GROUP_KIND.component);

    // Group 1 (key 10) is the last position among the smaller keys, so 3 follows it.
    expect(order.positions).toEqual([2, 1, 3]);
  });

  it('keeps the first key a group arrives with, and its place', () => {
    const order = new Order();
    order.place(1, makeKey(TIER.server, 5), GROUP_KIND.component);
    order.place(2, makeKey(TIER.client, 1), GROUP_KIND.component);

    order.place(1, makeKey(TIER.client, 99), GROUP_KIND.component);

    expect(order.keyOf(1)).toBe(makeKey(TIER.server, 5));
    expect(order.positions).toEqual([1, 2]);
  });

  it('reports a key only once one arrived', () => {
    const order = orderOf(1);

    expect(order.hasKey(1)).toBe(true);
    expect(order.hasKey(2)).toBe(false);
  });

  describe('on a server sheet that has flushed', () => {
    it('puts a component after the last flushed group whatever its key', () => {
      const order = orderOf(5, 6);
      order.flushed.set(6, 'rules');

      order.place(1, client(1), GROUP_KIND.component);

      expect(order.positions).toEqual([5, 6, 1]);
    });

    it('still puts a component by its key when that is after the last flushed group', () => {
      const order = orderOf(1, 2, 6);
      order.flushed.set(2, 'rules');

      order.place(4, client(4), GROUP_KIND.component);

      expect(order.positions).toEqual([1, 2, 4, 6]);
    });

    it.each([
      ['a global', GROUP_KIND.global],
      ['keyframes', GROUP_KIND.keyframes],
    ])('keeps key placement for %s', (_title, kind) => {
      const order = orderOf(5, 6);
      order.flushed.set(6, 'rules');

      order.place(1, makeKey(TIER.clientGlobal, 1), kind);

      expect(order.positions).toEqual([1, 5, 6]);
    });
  });
});

describe('learn', () => {
  it('moves the outer after the inner and stores the edge', () => {
    const order = orderOf(1, 2);

    expect(order.learn(1, 2)).toBe('stored');

    expect(order.positions).toEqual([2, 1]);
    expect(order.isSettled(1, 2)).toBe(true);
  });

  it('moves nothing when the edge already holds', () => {
    const order = orderOf(1, 2);

    expect(order.learn(2, 1)).toBe('stored');

    expect(order.positions).toEqual([1, 2]);
  });

  it('skips a self edge', () => {
    const order = orderOf(1, 2);

    expect(order.learn(1, 1)).toBe('settled');

    expect(order.positions).toEqual([1, 2]);
    expect(order.outers.size).toBe(0);
  });

  it('skips an edge it already stores', () => {
    const order = orderOf(1, 2, 3);
    order.learn(1, 2);
    const positions = [...order.positions];

    expect(order.learn(1, 2)).toBe('settled');

    expect(order.positions).toEqual(positions);
  });

  it('moves the outer with every transitive outer positioned at or before the inner, keeping their order', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(2, 1);

    // Group 2 is an outer of 1, so it goes along when 1 goes after 4.
    order.learn(1, 4);

    expect(order.positions).toEqual([3, 4, 1, 2]);
  });

  it('leaves an outer positioned after the inner where it is, with its own outers', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(4, 1);
    order.learn(3, 1);

    order.learn(1, 2);

    // 1 passes 2, and 3 and 4 (outers of 1) sit after 2 already, so only 1 moves.
    expect(order.positions).toEqual([2, 1, 3, 4]);
  });

  it('positions an unpositioned outer right after the inner', () => {
    const order = orderOf(1, 2);

    order.learn(5, 1);

    expect(order.positions).toEqual([1, 5, 2]);
  });

  it('gives an unpositioned inner default placement, then moves the outer after it', () => {
    const order = orderOf(1);

    order.learn(1, 7);

    expect(order.positions).toEqual([7, 1]);
  });

  it('gives an edge-positioned group its key when its rules arrive, without moving it', () => {
    const order = orderOf(1, 2);
    order.learn(7, 1);
    expect(order.hasKey(7)).toBe(false);

    order.place(7, makeKey(TIER.serverGlobal, 1), GROUP_KIND.component);

    expect(order.keyOf(7)).toBe(makeKey(TIER.serverGlobal, 1));
    expect(order.positions).toEqual([1, 7, 2]);
  });

  describe('edge seeds', () => {
    it('collects the inner of an edge between two flushed groups', () => {
      const order = orderOf(1, 2, 3);
      order.flushed.set(1, 'a');
      order.flushed.set(2, 'b');

      order.learn(2, 1);

      expect([...order.edgeSeeds]).toEqual([1]);
    });

    it.each([
      ['only the outer flushed', [2]],
      ['only the inner flushed', [1]],
      ['neither flushed', []],
    ])('collects nothing with %s', (_title, flushed) => {
      const order = orderOf(1, 2, 3);
      for (const group of flushed) order.flushed.set(group, 'x');

      order.learn(2, 1);

      expect([...order.edgeSeeds]).toEqual([]);
    });
  });
});

describe('cycle rule', () => {
  it('contests a pair when a learned path closes a cycle, refusing the edge and dropping the learned edges', () => {
    const order = orderOf(1, 2);
    order.learn(2, 1);

    expect(order.learn(1, 2)).toBe('contested');

    expect([...order.contested.values()]).toEqual([[1, 2]]);
    expect(order.outers.get(1)?.size ?? 0).toBe(0);
    expect(order.outers.get(2)?.size ?? 0).toBe(0);
    expect(order.positions).toEqual([1, 2]);
    expect(order.isSettled(1, 2)).toBe(true);
    expect(order.isSettled(2, 1)).toBe(true);
  });

  it('moves the second member after the first when positions disagree', () => {
    const order = orderOf(1, 2);
    order.learn(1, 2);
    expect(order.positions).toEqual([2, 1]);

    order.learn(2, 1);

    // Key order decides: 1 first, 2 second, so 2 moves after 1.
    expect(order.positions).toEqual([1, 2]);
    expect(violations(order)).toEqual([]);
  });

  it('refuses a cycle through a pinned-only path and contests nothing', () => {
    const base = groupForId('Base');
    const extension = groupForId('Extension');
    registerBase('Extension', 'Base');
    const order = new Order();
    order.place(base, client(base), GROUP_KIND.component);
    order.place(extension, client(extension), GROUP_KIND.component);
    expect(order.outers.get(base)?.get(extension)).toBe(true);

    expect(order.learn(base, extension)).toBe('refused');

    expect(order.contested.size).toBe(0);
    expect(order.positions).toEqual([base, extension]);
    expect(order.isSettled(base, extension)).toBe(true);
  });

  it('refuses a later learn between contested members in either direction and moves nothing', () => {
    const order = orderOf(1, 2, 3);
    order.learn(2, 1);
    order.learn(1, 2);

    expect(order.learn(2, 1)).toBe('settled');
    expect(order.learn(1, 2)).toBe('settled');
    expect(order.positions).toEqual([1, 2, 3]);
  });

  it('refuses an edge that would order a contested pair through a path', () => {
    const order = orderOf(1, 2, 3, 4);
    order.learn(2, 1);
    order.learn(1, 2);
    expect(order.learn(3, 1)).toBe('stored');
    expect(order.learn(2, 4)).toBe('stored');
    expect(order.positions).toEqual([1, 3, 4, 2]);

    // 1 < 3 < 4 < 2 would order the contested pair {1, 2} by a path.
    expect(order.learn(4, 3)).toBe('refused');

    expect(order.positions).toEqual([1, 3, 4, 2]);
    expect(order.isSettled(4, 3)).toBe(true);
    expect(violations(order)).toEqual([]);
  });

  it('adds the first member to the edge seeds when both members of a new contested pair were flushed', () => {
    const order = orderOf(1, 2, 3);
    order.flushed.set(1, 'a');
    order.flushed.set(2, 'b');
    order.learn(2, 1);
    order.edgeSeeds.clear();

    order.learn(1, 2);

    expect([...order.edgeSeeds]).toEqual([1]);
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
      expect(order.positions).toEqual([1, 2, 3]);
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

      expect(order.positions).toEqual([1, 2, 3]);
      expect(order.isSettled(1, 3)).toBe(true);
    });

    it('holds I4 for the review hand case', () => {
      const order = orderOf(1, 2, 3, 4);

      const results = [order.learn(2, 1), order.learn(1, 2), order.learn(1, 3), order.learn(3, 4)];

      expect(results).toEqual(['stored', 'contested', 'refused', 'stored']);
      expect(order.positions).toEqual([1, 2, 4, 3]);
      expect(violations(order)).toEqual([]);
    });
  });

  describe('carry sets', () => {
    it('takes the second member of a carried first member along in a contest move', () => {
      const order = orderOf(1, 2, 3);
      order.learn(1, 2);
      order.learn(2, 3);
      expect(order.positions).toEqual([3, 2, 1]);

      order.learn(3, 1);

      // Moving 2 after 1 carries 3 (the second member of the pair {2, 3}) so that pair holds.
      expect(order.positions).toEqual([1, 2, 3]);
      expect(violations(order)).toEqual([]);
    });

    it('takes the second member of a carried first member along in a full block move', () => {
      const order = orderOf(1, 2, 3);
      order.learn(2, 1);
      order.learn(1, 2);

      order.moveToEnd(1);

      expect(order.positions).toEqual([3, 1, 2]);
      expect(violations(order)).toEqual([]);
    });

    it('moves only the second member when it has no carried partner', () => {
      const order = orderOf(1, 2, 3);
      order.learn(2, 1);
      order.learn(1, 2);

      order.moveToEnd(2);

      expect(order.positions).toEqual([1, 3, 2]);
    });

    it('appends an unpositioned group', () => {
      const order = orderOf(1, 2);

      order.moveToEnd(9);

      expect(order.positions).toEqual([1, 2, 9]);
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
      const positions = [...order.positions];

      expect(order.isSettled(outer, inner)).toBe(true);
      expect(order.learn(outer, inner)).toBe('settled');
      expect(order.positions).toEqual(positions);
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

    expect(order.positions).toEqual([base, middle, top, other]);
    expect(order.outers.get(base)?.get(middle)).toBe(true);
    expect(order.outers.get(middle)?.get(top)).toBe(true);
    expect(order.outers.get(top)?.get(other)).toBe(false);
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
    expect(order.positions).toEqual([base, extension, other]);
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
    expect(order.positions).toEqual([base, extension, other]);
    order.learn(other, extension);

    // Base wraps Other, which wraps Extension, which extends Base: a cycle through one pin.
    expect(order.learn(base, other)).toBe('contested');

    // Key order alone would put Extension first (5 < 7 < 10); the pin keeps Base before it, so Other
    // sorts first among the free members and both of its pairs are contested.
    expect([...order.contested.values()]).toEqual([
      [other, base],
      [other, extension],
    ]);
    expect(order.positions).toEqual([other, base, extension]);
    expect(order.outers.get(base)?.get(extension)).toBe(true);
    expect(violations(order)).toEqual([]);
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
    else if (!order.has(op[1])) order.place(op[1], client(op[1]), GROUP_KIND.component);
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
        return `${sequence.map(op => op.join('')).join(' ')} broke at step ${step + 1}: ${broken.join('; ')} (positions ${order.positions.join(',')})`;
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

    expect(order.positions).toEqual(expected);
  });
});
