// @flow
/* eslint-disable import/no-duplicates */
import * as React from 'react';
import { Component } from 'react';
/* eslint-enable import/no-duplicates */
import styled from '../../';
import isStatelessFunction from '../isStatelessFunction';

class MockComponent extends Component {
  render() {
    return <div {...this.props} />
  }
}
describe('isStatelessFunction(something)', () => {
  it('returns true if stateless', () => {
    expect(isStatelessFunction(() => {})).toBe(true);

  });

  it('returns false for everything else', () => {
    expect(isStatelessFunction(styled.div``)).toBe(false);
    expect(isStatelessFunction(MockComponent)).toBe(false);
    expect(isStatelessFunction({})).toBe(false);
    expect(isStatelessFunction([])).toBe(false);
  });
});
