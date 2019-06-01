// @flow
/* eslint-disable react/prop-types */
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetStyled, expectCSSMatches } from './utils';

let styled;

describe('props', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should execute interpolations and fall back', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { color:black; }');
  });

  it('should execute interpolations and inject props', () => {
    const Comp = styled.div`
      color: ${props => props.fg || 'black'};
    `;
    TestRenderer.create(<Comp fg="red" />);
    expectCSSMatches('.b { color:red; }');
  });

  it('should ignore non-0 falsy object interpolations', () => {
    const Comp = styled.div`
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

  it('should pass "forwardedAs" to the underlying component as "as" if used', () => {
    const Comp = ({ as: Component = 'div', ...props }) => <Component {...props} />;

    const Comp2 = styled(Comp)`
      background: red;
    `;

    expect(TestRenderer.create(<Comp2 forwardedAs="button" />).toJSON()).toMatchInlineSnapshot(`
<button
  className="sc-a b"
/>
`);

    expectCSSMatches('.b { background: red; }');
  });
});
