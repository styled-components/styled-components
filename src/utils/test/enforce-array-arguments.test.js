// @flow

import expect from 'expect';
import enforceArray from '../enforce-array-arguments';

describe('enforceArrayArguments', () => {
  it(`should throw an invariant for incorrect usage`, () => {
    expect(() => {
      // $FlowInvalidInputTest
      enforceArray('test')(`
        html {
          color: blue;
        }
      `)
    }).toThrow(/test/);
  })

  it(`should not throw an invariant for correct usage`, () => {
    expect(() => {
      enforceArray('test')`
        html {
          color: blue;
        }
      `
    }).toNotThrow();
  })
});
