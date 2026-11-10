import { groupForId, resetGroupIds } from '../../sheet/GroupIDAllocator';
import { registeredIdsIn } from '../registeredIds';

describe('registeredIdsIn', () => {
  beforeEach(() => {
    resetGroupIds();
  });

  it.each([
    ['an empty string', ''],
    ['only spaces', '   '],
    ['classes no component registered', 'card primary sc-unknown'],
  ])('finds nothing in %s', (_label, className) => {
    groupForId('sc-known');

    expect(registeredIdsIn(className)).toEqual([]);
  });

  it.each([
    ['one id', 'sc-a', ['sc-a']],
    ['ids among other classes, in order', 'card sc-b hash1 sc-a', ['sc-b', 'sc-a']],
    ['ids split by runs of spaces, tabs and newlines', '  sc-a \t sc-b\nhash  ', ['sc-a', 'sc-b']],
    ['an id repeated', 'sc-a sc-a', ['sc-a', 'sc-a']],
  ])('lists the registered ids in %s', (_label, className, expected) => {
    groupForId('sc-a');
    groupForId('sc-b');

    expect(registeredIdsIn(className)).toEqual(expected);
  });

  it('finds an id registered after the same string was scanned', () => {
    expect(registeredIdsIn('wrapper sc-late')).toEqual([]);

    groupForId('sc-late');

    expect(registeredIdsIn('wrapper sc-late')).toEqual(['sc-late']);
  });

  it('forgets what a reset register held', () => {
    groupForId('sc-a');
    expect(registeredIdsIn('sc-a')).toEqual(['sc-a']);

    resetGroupIds();

    expect(registeredIdsIn('sc-a')).toEqual([]);
  });

  it('answers a string it has seen again with the same list while the register is unchanged', () => {
    groupForId('sc-a');

    expect(registeredIdsIn('x sc-a')).toBe(registeredIdsIn('x sc-a'));
  });

  it('stays correct across more distinct strings than it remembers', () => {
    groupForId('sc-a');

    for (let index = 0; index < 1200; index++) {
      expect(registeredIdsIn(`u${index} sc-a`)).toEqual(['sc-a']);
    }

    expect(registeredIdsIn('u0 sc-a')).toEqual(['sc-a']);
  });
});
