// @flow
import React from 'react';
import styled from '../../';
import isDerivedReactComponent from '../isDerivedReactComponent';

describe('isDerivedReactComponent(something)', () => {
  it('returns true for extended React.Component classes', () => {
    expect(isDerivedReactComponent(class Foo extends React.Component {})).toBe(true);
  });

  it('returns true for extended React.PureComponent classes', () => {
    expect(isDerivedReactComponent(class Foo extends React.PureComponent {})).toBe(true);
  });

  it('returns false for everything else', () => {
    [styled.div``, () => {}, 'foo', 1234, true, false].forEach(test =>
      expect(isDerivedReactComponent(test)).toBe(false)
    );
  });
});
