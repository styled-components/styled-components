import * as GroupIDAllocator from '../GroupIDAllocator';
import { makeGroupedTag } from '../GroupedTag';
import { GROUP_KIND, Order, TIER, makeKey } from '../Order';
import { VirtualTag } from '../Tag';

describe('GroupIDAllocator', () => {
  beforeEach(GroupIDAllocator.resetGroupIds);
  afterEach(GroupIDAllocator.resetGroupIds);

  it('creates continuous group IDs', () => {
    const a = GroupIDAllocator.groupForId('a');
    const b = GroupIDAllocator.groupForId('b');

    expect(a).toBe(1);
    expect(b).toBe(2);

    const a2 = GroupIDAllocator.groupForId('a');
    expect(a2).toBe(a);

    const aId = GroupIDAllocator.idForGroup(a);
    expect(aId).toBe('a');
  });

  describe('adoptGroupForId', () => {
    it('keeps the number of an id the register already knows', () => {
      GroupIDAllocator.groupForId('a');
      GroupIDAllocator.groupForId('b');

      expect(GroupIDAllocator.adoptGroupForId('b', 99)).toBe(2);
      expect(GroupIDAllocator.idForGroup(99)).toBe(undefined);
    });

    it('keeps a marker number that is free', () => {
      expect(GroupIDAllocator.adoptGroupForId('x', 99)).toBe(99);
      expect(GroupIDAllocator.idForGroup(99)).toBe('x');
      expect(GroupIDAllocator.groupForId('x')).toBe(99);
    });

    it('gives a fresh number when the marker number belongs to another id', () => {
      GroupIDAllocator.groupForId('a');
      GroupIDAllocator.groupForId('b');

      expect(GroupIDAllocator.adoptGroupForId('x', 1)).toBe(3);
      expect(GroupIDAllocator.idForGroup(1)).toBe('a');
      expect(GroupIDAllocator.idForGroup(3)).toBe('x');
    });

    it('leaves the allocation pointer where it was', () => {
      GroupIDAllocator.groupForId('a');
      GroupIDAllocator.adoptGroupForId('x', 99);
      GroupIDAllocator.adoptGroupForId('y', 1);

      // 1 is taken by `a`, so `y` took the next free number, 2; the pointer follows only allocation.
      expect(GroupIDAllocator.groupForId('y')).toBe(2);
      expect(GroupIDAllocator.groupForId('b')).toBe(3);
    });

    it('fills free numbers in definition order when a marker number is adopted ahead of them', () => {
      GroupIDAllocator.adoptGroupForId('server-b', 2);

      expect(GroupIDAllocator.groupForId('first')).toBe(1);
      expect(GroupIDAllocator.groupForId('second')).toBe(3);
    });
  });

  describe('register version', () => {
    it('bumps once for each new id and not for a known one', () => {
      const start = GroupIDAllocator.getRegisterVersion();

      GroupIDAllocator.groupForId('a');
      expect(GroupIDAllocator.getRegisterVersion()).toBe(start + 1);

      GroupIDAllocator.groupForId('a');
      GroupIDAllocator.lookupGroup('a');
      GroupIDAllocator.lookupGroup('missing');
      GroupIDAllocator.adoptGroupForId('a', 40);
      expect(GroupIDAllocator.getRegisterVersion()).toBe(start + 1);

      GroupIDAllocator.adoptGroupForId('b', 40);
      expect(GroupIDAllocator.getRegisterVersion()).toBe(start + 2);

      GroupIDAllocator.adoptGroupForId('c', 40);
      expect(GroupIDAllocator.getRegisterVersion()).toBe(start + 3);
    });

    it('never repeats a value across a reset', () => {
      const before = GroupIDAllocator.getRegisterVersion();

      GroupIDAllocator.resetGroupIds();

      expect(GroupIDAllocator.getRegisterVersion()).toBeGreaterThan(before);
    });
  });

  describe('lookupGroup', () => {
    it('returns a known id number and never allocates for an unknown one', () => {
      const a = GroupIDAllocator.groupForId('a');

      expect(GroupIDAllocator.lookupGroup('a')).toBe(a);
      expect(GroupIDAllocator.lookupGroup('unknown')).toBe(undefined);
      expect(GroupIDAllocator.groupForId('next')).toBe(a + 1);
    });
  });

  describe('chain bases', () => {
    it('records the group an extension builds on and forgets it on reset', () => {
      GroupIDAllocator.registerBase('extension', 'base');

      const base = GroupIDAllocator.lookupGroup('base')!;
      const extension = GroupIDAllocator.lookupGroup('extension')!;
      expect(GroupIDAllocator.baseGroupOf(extension)).toBe(base);
      expect(GroupIDAllocator.baseGroupOf(base)).toBe(undefined);

      GroupIDAllocator.resetGroupIds();
      expect(GroupIDAllocator.baseGroupOf(extension)).toBe(undefined);
    });
  });
});

let tag: InstanceType<typeof VirtualTag>;
let order: Order;
let groupedTag: ReturnType<typeof makeGroupedTag>;

/** Wire the order's moves to the tag the way a sheet does. */
const followMoves = () => {
  order.listener = {
    afterMove: groups => groupedTag.attachGroups(groups),
    beforeMove: groups => groupedTag.detachGroups(groups),
  };
};

const placeAll = (...groups: number[]) => {
  for (const group of groups) order.place(group, makeKey(TIER.client, group), GROUP_KIND.component);
};

beforeEach(() => {
  tag = new VirtualTag();
  order = new Order();
  groupedTag = makeGroupedTag(tag, order);
});

it('inserts and retrieves rules by groups correctly', () => {
  groupedTag.insertRules(2, ['.g2-a {}', '.g2-b {}']);

  // Insert out of order into the right group
  groupedTag.insertRules(1, ['.g1-a {}', '.g1-b {}']);

  groupedTag.insertRules(2, ['.g2-c {}', '.g2-d {}']);

  expect(groupedTag.length).toBeGreaterThan(2);
  expect(tag.length).toBe(6);

  // Expect groups to contain inserted rules
  expect(groupedTag.getGroup(0)).toBe('');
  expect(groupedTag.getGroup(1)).toBe('.g1-a {}/*!sc*/\n.g1-b {}/*!sc*/\n');
  expect(groupedTag.getGroup(2)).toBe(
    '.g2-a {}/*!sc*/\n.g2-b {}/*!sc*/\n' + '.g2-c {}/*!sc*/\n.g2-d {}/*!sc*/\n'
  );

  // Check some rules in the tag as well
  expect(tag.getRule(3)).toBe('.g2-b {}');
  expect(tag.getRule(0)).toBe('.g1-a {}');

  // And where each positioned group starts; a group with no place starts after every rule
  expect(groupedTag.indexOfGroup(1)).toBe(0);
  expect(groupedTag.indexOfGroup(2)).toBe(2);
  expect(groupedTag.indexOfGroup(3)).toBe(6);
});

it('inserts rules at correct indices if some rules are dropped', () => {
  const tag = new VirtualTag();
  jest.spyOn(tag, 'insertRule').mockImplementationOnce(() => false);
  const groupedTag = makeGroupedTag(tag, new Order());

  groupedTag.insertRules(1, ['.skipped {}', '.inserted {}']);

  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup(1)).toBe('.inserted {}/*!sc*/\n');
});

it('inserts and deletes groups correctly', () => {
  groupedTag.insertRules(1, ['.g1-a {}']);
  expect(tag.length).toBe(1);
  expect(groupedTag.getGroup(1)).not.toBe('');
  groupedTag.clearGroup(1);
  expect(tag.length).toBe(0);
  expect(groupedTag.getGroup(1)).toBe('');

  // Noop test for non-existent group
  groupedTag.clearGroup(0);
  expect(tag.length).toBe(0);
});

it('does supports large group numbers', () => {
  const baseSize = groupedTag.length;
  const group = 1 << 10;
  groupedTag.insertRules(group, ['.test {}']);

  // We expect the internal buffer to have grown beyond its initial size
  expect(groupedTag.length).toBeGreaterThan(baseSize);

  expect(groupedTag.length).toBeGreaterThan(group);
  expect(tag.length).toBe(1);
  expect(groupedTag.indexOfGroup(group)).toBe(0);
  expect(groupedTag.getGroup(group)).toBe('.test {}/*!sc*/\n');
});

it('throws when the upper group limit is reached', () => {
  const group = Math.pow(2, 31) + 1; // This can't be converted to an SMI to prevent cutoff

  expect(() => {
    groupedTag.insertRules(group, ['.test {}']);
  }).toThrowErrorMatchingInlineSnapshot(`
    "Reached the limit of how many styled components may be created at group 2147483649.
    You may only create up to 1,073,741,824 components. If you're creating components dynamically,
    as for instance in your render method then you may be running into this limitation."
  `);
});

describe('positions', () => {
  const rulesInTag = () => Array.from({ length: tag.length }, (_, index) => tag.getRule(index));

  it('lays groups out in position order, not group number order', () => {
    order.place(9, makeKey(TIER.client, 1), GROUP_KIND.component);
    order.place(2, makeKey(TIER.client, 2), GROUP_KIND.component);

    groupedTag.insertRules(2, ['.two {}']);
    groupedTag.insertRules(9, ['.nine {}']);

    expect(rulesInTag()).toEqual(['.nine {}', '.two {}']);
    expect(groupedTag.indexOfGroup(9)).toBe(0);
    expect(groupedTag.indexOfGroup(2)).toBe(1);
  });

  it('gives a group nobody positioned its group number as its place', () => {
    groupedTag.insertRules(7, ['.seven {}']);
    groupedTag.insertRules(3, ['.three {}']);

    expect(rulesInTag()).toEqual(['.three {}', '.seven {}']);
  });

  describe('after a move', () => {
    beforeEach(() => {
      followMoves();
      placeAll(1, 2, 3);
      groupedTag.insertRules(1, ['.1a {}', '.1b {}']);
      groupedTag.insertRules(2, ['.2a {}', '.2b {}']);
      groupedTag.insertRules(3, ['.3a {}', '.3b {}']);
    });

    it('puts the moved group and its rules after the group it passed', () => {
      order.learn(1, 3);

      expect(order.positions).toEqual([2, 3, 1]);
      expect(rulesInTag()).toEqual(['.2a {}', '.2b {}', '.3a {}', '.3b {}', '.1a {}', '.1b {}']);
    });

    it('reports each group offset from the new positions', () => {
      order.learn(1, 3);

      expect(groupedTag.indexOfGroup(2)).toBe(0);
      expect(groupedTag.indexOfGroup(3)).toBe(2);
      expect(groupedTag.indexOfGroup(1)).toBe(4);
      expect(groupedTag.getGroup(1)).toBe('.1a {}/*!sc*/\n.1b {}/*!sc*/\n');
    });

    it('inserts into a moved group at its new place', () => {
      order.learn(1, 3);

      groupedTag.insertRules(1, ['.1c {}']);
      groupedTag.insertRules(2, ['.2c {}']);

      expect(rulesInTag()).toEqual([
        '.2a {}',
        '.2b {}',
        '.2c {}',
        '.3a {}',
        '.3b {}',
        '.1a {}',
        '.1b {}',
        '.1c {}',
      ]);
    });

    it('does not serve an offset cached before the move', () => {
      // Prime the lookup cache on group 3, which sits at offset 4 before the move and 2 after it.
      expect(groupedTag.indexOfGroup(3)).toBe(4);

      order.learn(1, 3);

      expect(groupedTag.indexOfGroup(3)).toBe(2);
      expect(groupedTag.indexOfGroup(1)).toBe(4);
    });

    it('moves a group with no rules without touching the tag', () => {
      order.place(4, makeKey(TIER.client, 2), GROUP_KIND.component);
      expect(order.positions).toEqual([1, 2, 4, 3]);
      const before = rulesInTag();

      order.learn(4, 3);

      expect(order.positions).toEqual([1, 2, 3, 4]);
      expect(rulesInTag()).toEqual(before);
    });

    it('moves a group together with its outers, keeping their order', () => {
      order.learn(2, 1);
      order.learn(1, 3);

      expect(order.positions).toEqual([3, 1, 2]);
      expect(rulesInTag()).toEqual(['.3a {}', '.3b {}', '.1a {}', '.1b {}', '.2a {}', '.2b {}']);
    });
  });
});
