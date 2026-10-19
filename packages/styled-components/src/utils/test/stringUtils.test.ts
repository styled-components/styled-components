import React from 'react';
import escape from '../escape';
import generateAlphabeticName from '../generateAlphabeticName';
import generateDisplayName from '../generateDisplayName';
import hyphenateStyleName from '../hyphenateStyleName';
import interleave from '../interleave';
import { compileWeb } from '../../parser/compile';
import { parseSource } from '../../parser/source';
import { joinRules, joinStrings, stripSplitter } from '../joinStrings';

describe('hyphenateStyleName', () => {
  it('hyphenates camelCase style names', () => {
    expect(hyphenateStyleName('backgroundColor')).toEqual('background-color');
    expect(hyphenateStyleName('MozTransition')).toEqual('-moz-transition');
    expect(hyphenateStyleName('msTransition')).toEqual('-ms-transition');
    // https://github.com/styled-components/styled-components/issues/3810
    expect(hyphenateStyleName('--MyColor')).toEqual('--MyColor');
  });
});

describe('joinStrings', () => {
  it('joins the two strings with a space between', () => {
    expect(joinStrings('a', 'b')).toBe('a b');
    expect(joinStrings('a ', 'b')).toBe('a  b');
    expect(joinStrings('a ', ' b')).toBe('a   b');
  });

  it('ignores falsy inputs', () => {
    expect(joinStrings('a')).toBe('a');
    expect(joinStrings('a', null)).toBe('a');
    expect(joinStrings('a', '')).toBe('a');
    expect(joinStrings(null, 'b')).toBe('b');
    expect(joinStrings('', 'b')).toBe('b');
  });
});

describe('joinRules', () => {
  it('keeps a compiled rule as written when the splitter is removed, whatever a value holds', () => {
    const src = parseSource(['color: ', '; margin: 0;'], [() => 'red //*!sc*/\n* b']);
    const css = joinRules(compileWeb(src, {}, '.a'));
    expect(css).toBe('.a{color:red //*!sc*/ * b;margin:0;}/*!sc*/\n');
    expect(stripSplitter(css)).toBe('.a{color:red //*!sc*/ * b;margin:0;}');
  });
});

describe('generateAlphabeticName', () => {
  it('should create alphabetic names for number input data', () => {
    expect(generateAlphabeticName(1000000000)).toEqual('cGNYzm');
    expect(generateAlphabeticName(2000000000)).toEqual('fnBWYy');
  });

  it('should not fail for numbers above int32 limit', () => {
    expect(generateAlphabeticName(3819806601)).toEqual('kcwstn');
  });

  it('pins the letters at each digit boundary and the largest uint32 input', () => {
    expect(generateAlphabeticName(0)).toBe('a');
    expect(generateAlphabeticName(25)).toBe('z');
    expect(generateAlphabeticName(26)).toBe('A');
    expect(generateAlphabeticName(51)).toBe('Z');
    expect(generateAlphabeticName(52)).toBe('a');
    expect(generateAlphabeticName(53)).toBe('bb');
    expect(generateAlphabeticName(2703)).toBe('ZZ');
    expect(generateAlphabeticName(2704)).toBe('aa');
    expect(generateAlphabeticName(140607)).toBe('ZZZ');
    expect(generateAlphabeticName(140608)).toBe('aaa');
    expect(generateAlphabeticName(2147483647)).toBe('fHKRMx');
    expect(generateAlphabeticName(4294967295)).toBe('lpvJyV');
  });

  it('breaks up substrings of "ad" case-insensitive to avoid adblocker issues', () => {
    expect(generateAlphabeticName(1355)).toMatchInlineSnapshot(`"A-d"`);
    expect(generateAlphabeticName(1381)).toMatchInlineSnapshot(`"A-D"`);
    expect(generateAlphabeticName(2707)).toMatchInlineSnapshot(`"a-d"`);
    expect(generateAlphabeticName(2733)).toMatchInlineSnapshot(`"a-D"`);
    expect(generateAlphabeticName(7390035)).toMatchInlineSnapshot(`"a-Da-d"`);
  });
});

describe('generateDisplayName', () => {
  it('handles a string type', () => {
    expect(generateDisplayName('div')).toBe('styled.div');
  });

  it('handles a React class type', () => {
    class Foo extends React.Component {}

    expect(generateDisplayName(Foo)).toBe('Styled(Foo)');
  });

  it('handles a React class type with displayName', () => {
    class Foo extends React.Component {
      static displayName = 'Bar';
    }

    expect(generateDisplayName(Foo)).toBe('Styled(Bar)');
  });
});

describe('escape', () => {
  it('replaces characters that could be part of CSS selectors', () => {
    expect(escape('foo(bar):#*$><+~=|^baz')).toEqual('foo-bar-baz');
  });

  it('replaces double hyphens with a single hyphen', () => {
    expect(escape('foo--bar')).toEqual('foo-bar');
  });

  it('removes extraneous hyphens at the ends of the string', () => {
    expect(escape('-foo--bar-')).toEqual('foo-bar');
  });
});

describe('interleave', () => {
  it('blindly interleave', () => {
    expect(interleave([], [])).toEqual([undefined]);
    expect(interleave(['foo'], [])).toEqual(['foo']);
    expect(interleave(['foo'], [1])).toEqual(['foo', 1, undefined]);
    expect(interleave(['foo', 'bar'], [1])).toEqual(['foo', 1, 'bar']);
  });
  it('should be driven off the number of interpolations', () => {
    expect(interleave(['foo', 'bar'], [])).toEqual(['foo']);
    expect(interleave(['foo', 'bar', 'baz'], [1])).toEqual(['foo', 1, 'bar']);
    expect(interleave([], [1])).toEqual([undefined, 1, undefined]);
    expect(interleave(['foo'], [1, 2, 3])).toEqual([
      'foo',
      1,
      undefined,
      2,
      undefined,
      3,
      undefined,
    ]);
  });
});
