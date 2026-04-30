import * as GroupIDAllocator from '../GroupIDAllocator';

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

  GroupIDAllocator.setGroupForId('b', 99);
  expect(GroupIDAllocator.idForGroup(99)).toBe('b');
  expect(GroupIDAllocator.groupForId('b')).toBe(99);
});
