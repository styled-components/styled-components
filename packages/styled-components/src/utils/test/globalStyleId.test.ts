import generateComponentId from '../generateComponentId';
import { globalStyleComponentId, resetGlobalStyleComponentIds } from '../globalStyleId';
import { KEYFRAMES_SYMBOL } from '../isKeyframes';

function plain(rules: readonly unknown[]): string {
  return `sc-global-${generateComponentId(JSON.stringify(rules))}`;
}

function counted(rules: readonly unknown[], issued: number): string {
  const serialized = JSON.stringify(rules);
  return `sc-global-${generateComponentId(issued === 0 ? serialized : `${serialized}\0${issued}`)}`;
}

describe('globalStyleComponentId', () => {
  beforeEach(() => {
    resetGlobalStyleComponentIds();
  });

  it('hashes static rules from their JSON, including a second identical call', () => {
    const rules = ['html { --a: 1; }'];
    const other = ['html { --b: 1; }'];

    expect(globalStyleComponentId(rules)).toBe(plain(rules));
    expect(globalStyleComponentId(rules)).toBe(plain(rules));
    expect(globalStyleComponentId(other)).toBe(plain(other));
    expect(plain(rules)).not.toBe(plain(other));
  });

  it('keeps static ids independent of call order', () => {
    const left = ['html { --a: 1; }'];
    const right = ['html { --b: 1; }'];
    const leftFirst = globalStyleComponentId(left);
    const rightSecond = globalStyleComponentId(right);

    resetGlobalStyleComponentIds();

    const rightFirst = globalStyleComponentId(right);
    const leftSecond = globalStyleComponentId(left);

    expect(leftFirst).toBe(leftSecond);
    expect(rightSecond).toBe(rightFirst);
  });

  it('uses the plain hash for the first function body and a count for later ones', () => {
    const firstRules = [() => 'html { --a: 1; }'];
    const secondRules = [() => 'html { --b: 1; }'];
    const thirdRules = [() => 'html { --c: 1; }'];

    const first = globalStyleComponentId(firstRules);
    const second = globalStyleComponentId(secondRules);
    const third = globalStyleComponentId(thirdRules);

    expect(JSON.stringify(firstRules)).toBe(JSON.stringify(secondRules));
    expect(first).toBe(plain(firstRules));
    expect(first).toBe(counted(firstRules, 0));
    expect(second).toBe(counted(secondRules, 1));
    expect(third).toBe(counted(thirdRules, 2));
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it('counts each distinct serialization on its own', () => {
    const whole = [() => 'html { --a: 1; }'];
    const mixed = ['html { color: ', () => 'red', '; }'];
    const sameSkeleton = ['html { color: ', () => 'blue', '; }'];
    const otherSkeleton = ['html { background: ', () => 'red', '; }'];

    expect(JSON.stringify(mixed)).toBe(JSON.stringify(sameSkeleton));
    expect(JSON.stringify(mixed)).not.toBe(JSON.stringify(otherSkeleton));

    const wholeFirst = globalStyleComponentId(whole);
    const mixedFirst = globalStyleComponentId(mixed);
    const otherFirst = globalStyleComponentId(otherSkeleton);
    const wholeSecond = globalStyleComponentId(whole);
    const mixedSecond = globalStyleComponentId(sameSkeleton);

    expect(wholeFirst).toBe(plain(whole));
    expect(mixedFirst).toBe(plain(mixed));
    expect(otherFirst).toBe(plain(otherSkeleton));
    expect(wholeSecond).toBe(counted(whole, 1));
    expect(mixedSecond).toBe(counted(mixed, 1));
  });

  it('counts a function nested in a css helper, and not a static helper', () => {
    const nested = [[() => 'html { --a: 1; }']];
    const nestedAgain = [[() => 'html { --b: 1; }']];
    const staticNested = [['html { --a: 1; }']];

    const first = globalStyleComponentId(nested);
    const second = globalStyleComponentId(nestedAgain);

    expect(first).toBe(plain(nested));
    expect(second).toBe(counted(nestedAgain, 1));
    expect(globalStyleComponentId(staticNested)).toBe(plain(staticNested));
    expect(globalStyleComponentId(staticNested)).toBe(plain(staticNested));
  });

  it('does not let an earlier function collision change a static id', () => {
    const rules = ['html { --a: 1; }'];
    globalStyleComponentId([() => 'one']);
    globalStyleComponentId([() => 'two']);

    expect(globalStyleComponentId(rules)).toBe(plain(rules));
  });

  it('repeats the same ids after the counts are cleared', () => {
    const rules = [() => 'html { --a: 1; }'];
    const first = globalStyleComponentId(rules);
    const second = globalStyleComponentId([() => 'html { --b: 1; }']);

    resetGlobalStyleComponentIds();

    expect(globalStyleComponentId([() => 'html { --c: 1; }'])).toBe(first);
    expect(globalStyleComponentId([() => 'html { --d: 1; }'])).toBe(second);
  });

  it('shares an id for two copies of one styled component and keeps methods out of the hash', () => {
    const button = {
      styledComponentId: 'sc-button',
      target: 'button',
      toString() {
        return '.sc-button';
      },
      type() {
        return null;
      },
    };
    const link = {
      styledComponentId: 'sc-link',
      target: 'a',
      toString() {
        return '.sc-link';
      },
      type() {
        return null;
      },
    };
    const buttonRules = [button, ' { --a: 1; }'];
    const linkRules = [link, ' { --b: 1; }'];

    expect(globalStyleComponentId(buttonRules)).toBe(plain(buttonRules));
    expect(globalStyleComponentId(buttonRules)).toBe(plain(buttonRules));
    expect(globalStyleComponentId(linkRules)).toBe(plain(linkRules));
    expect(plain(buttonRules)).not.toBe(plain(linkRules));
  });

  it('shares an id for two copies of one keyframes value and does not call toString', () => {
    const fade = {
      id: 'sc-keyframes-fade',
      name: 'fade',
      rules: 'from{opacity:0}',
      toString() {
        throw new Error('toString should not run while building a global id');
      },
    };
    Object.defineProperty(fade, KEYFRAMES_SYMBOL, { value: true });
    const rules = ['html { animation-name: ', fade, '; --k: 1; }'];

    expect(globalStyleComponentId(rules)).toBe(plain(rules));
    expect(globalStyleComponentId(rules)).toBe(plain(rules));
  });

  it('walks a toJSON object that points at itself when the object holds a function', () => {
    const cyclic: { fn: () => string; self?: unknown; toJSON: () => string } = {
      fn: () => 'x',
      toJSON: () => 'flat',
    };
    cyclic.self = cyclic;
    const rules = [cyclic];

    expect(globalStyleComponentId(rules)).toBe(plain(rules));
    expect(globalStyleComponentId([cyclic])).toBe(counted(rules, 1));
  });

  it('still throws when the rules contain a cycle JSON cannot encode', () => {
    const rules: unknown[] = [];
    rules.push(rules);

    expect(() => globalStyleComponentId(rules)).toThrow(TypeError);
  });
});
