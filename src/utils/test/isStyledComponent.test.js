// @flow
import React from 'react';
import {placeable} from '../../';
import isStyledComponent from '../isStyledComponent';

describe('isStyledComponent(something)', () => {
  it('returns true if using styled', () => {
    expect(isStyledComponent(placeable.div``)).toBe(true);
    expect(isStyledComponent(placeable(placeable.div``)``)).toBe(true);
  });

  it('returns false for everything else', () => {
    [() => {}, class Foo extends React.Component {}, 'foo', 1234, true, false].forEach(test =>
      expect(isStyledComponent(test)).toBe(false)
    );
  });
});
