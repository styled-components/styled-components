// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetStyled, expectCSSMatches } from './utils';

let styled;

describe('css features', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should add vendor prefixes in the right order', () => {
    const Comp = styled.div`
      transition: opacity 0.3s;
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { -webkit-transition:opacity 0.3s; transition:opacity 0.3s; }');
  });

  it('should add vendor prefixes for display', () => {
    const Comp = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches(`
      .b {
        display:-webkit-box; display:-webkit-flex; display:-ms-flexbox; display:flex; -webkit-flex-direction:column; -ms-flex-direction:column; flex-direction:column; -webkit-align-items:center; -webkit-box-align:center; -ms-flex-align:center; align-items:center;
      }
    `);
  });

  it('should generate styles for nested media queries', () => {
    const Comp = styled.div`
      @media (min-width: 10px) {
        @media (min-height: 20px) {
          color: red;
        }
      }
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches(`
      @media (min-width: 10px) {
        @media (min-height: 20px) {
          .b {
            color: red;
          }
        }
      }
    `);
  });

  it('should pass through custom properties', () => {
    const Comp = styled.div`
      --custom-prop: some-val;
    `;
    TestRenderer.create(<Comp />);
    expectCSSMatches('.b { --custom-prop:some-val; }');
  });
});
