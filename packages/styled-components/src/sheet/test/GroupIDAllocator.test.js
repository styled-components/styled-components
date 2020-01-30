// @flow

import * as GroupIDAllocator from '../GroupIDAllocator';

beforeEach(GroupIDAllocator.resetGroupIds);
afterEach(GroupIDAllocator.resetGroupIds);

it('creates continuous group IDs', () => {
  const a = GroupIDAllocator.getGroupForId('a');
  const b = GroupIDAllocator.getGroupForId('b');

  expect(a).toBe(1);
  expect(b).toBe(2);

  const a2 = GroupIDAllocator.getGroupForId('a');
  expect(a2).toBe(a);

  const aId = GroupIDAllocator.getIdForGroup(a);
  expect(aId).toBe('a');

  GroupIDAllocator.setGroupForId('b', 99);
  expect(GroupIDAllocator.getIdForGroup(99)).toBe('b');
  expect(GroupIDAllocator.getGroupForId('b')).toBe(99);
});

it('throws early if the group ID is too large', () => {
  // Test for SMI overflow with SMIs
  GroupIDAllocator.setGroupForId('a', Math.pow(2, 31));
  expect(() => {
    GroupIDAllocator.getGroupForId('b');
  }).toThrowError(/reached the limit/i);

  // Test for SMI overflow with regular integers
  GroupIDAllocator.setGroupForId('a', Math.pow(2, 32));
  expect(() => {
    GroupIDAllocator.getGroupForId('b');
  }).toThrowError(/reached the limit/i);
});
