// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetPlaceable, expectCSSMatches } from './utils';

let placeable;

describe('props', () => {
  beforeEach(() => {
    placeable = resetPlaceable();
  });

  it('should execute interpolations and fall back', () => {
    const Comp = placeable.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { color:black; }');
  });
  it('should execute interpolations and inject props', () => {
    const Comp = placeable.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp fg="red" />);
    expectCSSMatches('.b { color:red; }');
  });
  it('should ignore non-0 falsy object interpolations', () => {
    const Comp = placeable.div`
      ${() => ({
        borderWidth: 0,
        colorA: null,
        colorB: false,
        colorC: undefined,
        colorD: '',
      })};
    `;
    TestRenderer.create(<Comp fg="red" />);
    expectCSSMatches('.b { border-width:0; }');
  });
});
