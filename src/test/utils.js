// @flow
/**
 * This sets up our end-to-end test suite, which essentially makes sure
 * our public API works the way we promise/want
 */
import styled from '../constructors/styled';
import StyleSheet from '../models/StyleSheet';
import StyledError from '../utils/error';

/* Ignore hashing, just return class names sequentially as .a .b .c etc */
let mockIndex = 0;
let mockInputs = {};
let mockSeededClasses = [];

jest.mock('../utils/generateAlphabeticName', () => input => {
  const seed = mockSeededClasses.shift();
  if (seed) return seed;

  return mockInputs[input] || (mockInputs[input] = String.fromCodePoint(97 + mockIndex++));
});

export const seedNextClassnames = (names: Array<string>) => (mockSeededClasses = names);

export const resetStyled = (isServer: boolean = false) => {
  if (!isServer) {
    if (!document.head) {
      throw new StyledError(9);
    }

    document.head.innerHTML = '';
  }

  StyleSheet.reset(isServer);
  mockIndex = 0;
  mockInputs = {};
  if (typeof window !== 'undefined') window.scCGSHMRCache = {};

  return styled;
};

export const stripComments = (str: string) => str.replace(/\/\*.*?\*\/\n?/g, '');

export const stripWhitespace = (str: string) =>
  str
    .trim()
    .replace(/([;\{\}])/g, '$1  ')
    .replace(/\s+/g, ' ');

export const getCSS = (scope: Document | HTMLElement) =>
  Array.from(scope.querySelectorAll('style'))
    .map(tag => tag.innerHTML)
    .join('\n')
    .replace(/ {/g, '{')
    .replace(/:\s+/g, ':')
    .replace(/:\s+;/g, ':;');

export const expectCSSMatches = (
  _expectation: string,
  opts: { ignoreWhitespace: boolean } = { ignoreWhitespace: true }
) => {
  // NOTE: This should normalise both CSS strings to make irrelevant mismatches less likely
  const expectation = _expectation
    .replace(/ {/g, '{')
    .replace(/:\s+/g, ':')
    .replace(/:\s+;/g, ':;');

  const css = getCSS(document);

  if (opts.ignoreWhitespace) {
    const stripped = stripWhitespace(stripComments(css));
    expect(stripped).toEqual(stripWhitespace(expectation));
    return stripped;
  } else {
    expect(css).toEqual(expectation);
    return css;
  }
};
