// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { resetStyled, expectCSSMatches } from './utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../utils/isStaticRules', () => () => false);

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

  describe('inheritance', () => {
    const setupParent = () => {
      const colors = {
        primary: 'red',
        secondary: 'blue',
        tertiary: 'green',
      };
      const Parent = styled.h1`
        position: relative;
        color: ${props => colors[props.color]};
      `;
      return Parent;
    };

    const addDefaultProps = (Parent, Child, Grandson) => {
      Parent.defaultProps = {
        color: 'primary',
      };
      Child.defaultProps = {
        color: 'secondary',
      };
      Grandson.defaultProps = {
        color: 'tertiary',
      };
    };

    it('should override parents defaultProps', () => {
      const Parent = setupParent();
      const Child = styled(Parent)``;
      const Grandson = styled(Child)``;
      addDefaultProps(Parent, Child, Grandson);
      TestRenderer.create(<Parent />);
      TestRenderer.create(<Child />);
      TestRenderer.create(<Grandson />);
      expectCSSMatches(`
        .d{ position:relative; color:red; }
        .e{ position:relative; color:blue; }
        .f{ position:relative; color:green; }
      `);
    });

    describe('when overriding with another component', () => {
      it('should override parents defaultProps', () => {
        const Parent = setupParent();
        const Child = styled(Parent).attrs({ as: 'h2' })``;
        const Grandson = styled(Child).attrs({ as: 'h3' })``;
        addDefaultProps(Parent, Child, Grandson);
        TestRenderer.create(<Parent />);
        TestRenderer.create(<Child />);
        TestRenderer.create(<Grandson />);
        expectCSSMatches(`
          .d{ position:relative; color:red; }
          .e{ position:relative; color:blue; }
          .f{ position:relative; color:green; }
        `);
      });

      it('should evaluate grandsons props', () => {
        const Parent = setupParent();
        const Child = styled(Parent).attrs({ as: 'h2' })``;
        const Grandson = styled(Child).attrs({ as: 'h3' })``;
        addDefaultProps(Parent, Child, Grandson);
        TestRenderer.create(<Parent />);
        TestRenderer.create(<Child />);
        TestRenderer.create(<Grandson color="primary" />);
        expectCSSMatches(`
          .d{ position:relative; color:red; }
          .e{ position:relative; color:blue; }
          .f{ position:relative; color:red; }
        `);
      });
    });
  });
});
