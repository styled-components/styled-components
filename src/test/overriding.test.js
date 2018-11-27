// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetStyled, expectCSSMatches } from './utils';

let styled;

describe('extending', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should let you use another component in a css rule', () => {
    const Inner = styled.div`
      color: blue;
      font-weight: light;
    `;
    const Outer = styled.div`
      padding: 1rem;
      > ${Inner} {
        font-weight: bold;
      }
    `;
    TestRenderer.create(<Inner />);
    TestRenderer.create(<Outer />);
    expectCSSMatches(`
      .c { color:blue; font-weight:light; }
      .d { padding:1rem; }
      .d > .sc-a { font-weight:bold; }
    `);
  });

  describe('heridity', () => {

    const setupParent = () => {
      const colors = {
        primary: 'red',
        secondary: 'blue',
        tertiary: 'green',
      }
      const Parent = styled.h1`
        position: relative;
        color: ${props => colors[props.color]};
      `;
      return Parent;
    }

    const evaluateSnapshot = (Parent, Child, Grandson) => {
      Parent.defaultProps = {
        color: 'primary',
      }
      Child.defaultProps = {
        color: 'secondary',
      }
      Grandson.defaultProps = {
        color: 'tertiary',
      }
      TestRenderer.create(<Parent />);
      TestRenderer.create(<Child />);
      TestRenderer.create(<Grandson />);
      expectCSSMatches(`
        .d{ position:relative; color:red; }
        .e{ position:relative; color:blue; }
        .f{ position:relative; color:green; }
      `);
    }

    it('should override parents defaultProps', () => {
      const Parent = setupParent();
      const Child = styled(Parent)``;
      const Grandson = styled(Child)``;
      evaluateSnapshot(Parent, Child, Grandson);
    });
    
    describe('when overriding with another component', () => {
      it('should override parents defaultProps', () => {
        const Parent = setupParent();
        const Child = styled(Parent.withComponent('h2'))``;
        const Grandson = styled(Child.withComponent('h3'))``;
        evaluateSnapshot(Parent, Child, Grandson);
      });
    });
  });
});
