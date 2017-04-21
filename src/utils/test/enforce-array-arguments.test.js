// @flow

import expect from 'expect';
import enforceArray from '../enforce-array-arguments';

describe('enforceArrayArguments', () => {
  it(`should warn the user for incorrect usage`, () => {
    expect(() => {
      // $FlowInvalidInputTest
      enforceArray('test')(`
        html {
          color: blue;
        }
      `)
    }).toThrow(/test/);
  })

  it(`should not warn the user for correct usage`, () => {
    expect(() => {
      enforceArray('test')`
        html {
          color: blue;
        }
      `
    }).toNotThrow();
  })
});
