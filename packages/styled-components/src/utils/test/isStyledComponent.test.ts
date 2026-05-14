import React from 'react';
import styled from '../../';
import isStyledComponent from '../isStyledComponent';

describe('isStyledComponent(something)', () => {
  it('returns true if using styled', () => {
    expect(isStyledComponent(styled.div``)).toBe(true);
    expect(isStyledComponent(styled(styled.div``)``)).toBe(true);
  });

  it("returns true for a function carrier (Preact's react-compat forwardRef shape, #5736)", () => {
    const preactStyle = Object.assign(() => null, {
      styledComponentId: 'sc-test',
      $$typeof: Symbol.for('react.forward_ref'),
    });
    expect(isStyledComponent(preactStyle)).toBe(true);
  });

  it('returns false for HOCs that hoist styledComponentId but not $$typeof (#5736)', () => {
    // hoist-non-react-statics excludes $$typeof on forwardRef sources, so an
    // HOC over a styled component ends up with the brand but no $$typeof.
    const HOC = Object.assign(() => null, { styledComponentId: 'sc-test' });
    expect(isStyledComponent(HOC)).toBe(false);
  });

  it('returns false for everything else', () => {
    [
      () => {},
      class Foo extends React.Component {},
      'foo',
      1234,
      true,
      false,
      null,
      undefined,
    ].forEach(test => expect(isStyledComponent(test)).toBe(false));
  });
});
