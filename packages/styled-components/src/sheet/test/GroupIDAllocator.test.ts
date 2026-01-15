import { getGroupForId, getRegisteredIds, resetGroupIds } from '../GroupIDAllocator';

beforeEach(() => {
  resetGroupIds();
});

describe('GroupIDAllocator', () => {
  it('allocates unique group IDs for different component IDs', () => {
    const id1 = getGroupForId('comp-a');
    const id2 = getGroupForId('comp-b');
    const id3 = getGroupForId('comp-c');

    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });

  it('returns the same group ID for the same component ID', () => {
    const first = getGroupForId('comp-x');
    const second = getGroupForId('comp-x');
    const third = getGroupForId('comp-x');

    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('resets correctly', () => {
    const before = getGroupForId('comp-y');
    resetGroupIds();
    const after = getGroupForId('comp-y');

    expect(before).toBe(after);
  });

  it('returns registered IDs', () => {
    getGroupForId('comp-1');
    getGroupForId('comp-2');
    getGroupForId('comp-3');

    const ids = Array.from(getRegisteredIds());
    expect(ids).toContain('comp-1');
    expect(ids).toContain('comp-2');
    expect(ids).toContain('comp-3');
  });
});
