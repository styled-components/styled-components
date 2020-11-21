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
