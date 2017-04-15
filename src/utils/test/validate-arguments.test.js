// @flow

import expect from 'expect';
import sinon from 'sinon';
import validate from '../validate-arguments';

describe('validateArguments', () => {
  it(`should warn the user for incorrect usage`, () => {
    const consoleSpy = sinon.spy(console, 'error')

    // $FlowInvalidInputTest
    validate('test')(`
      html {
        color: blue;
      }
    `)

    consoleSpy.restore()
    expect(consoleSpy.called).toBe(true, `console.error should've been called`)
  })

  it(`should not warn the user for correct usage`, () => {
    const consoleSpy = sinon.spy(console, 'error')

    validate('test')`
      html {
        color: blue;
      }
    `

    consoleSpy.restore()
    expect(consoleSpy.called).toBe(false, `console.error should not have been called`)
  })
});
