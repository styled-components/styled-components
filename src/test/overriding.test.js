// @flow
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { resetPlaceable, expectCSSMatches } from './utils';

let placeable;

describe('extending', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    placeable = resetPlaceable();
  });

  it('should let you use another component in a css rule', () => {
    const Inner = placeable.div`
      color: blue;
      font-weight: light;
    `;
    const Outer = placeable.div`
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
      }
      const Parent = placeable.h1`
        position: relative;
        color: ${props => colors[props.color]};
      `;
      return Parent;
    }

    const addDefaultProps = (Parent, Child, Grandson) => {
      Parent.defaultProps = {
        color: 'primary',
      }
      Child.defaultProps = {
        color: 'secondary',
      }
      Grandson.defaultProps = {
        color: 'tertiary',
      }
    }

    it('should override parents defaultProps', () => {
      const Parent = setupParent();
      const Child = placeable(Parent)``;
      const Grandson = placeable(Child)``;
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
        const Child = placeable(Parent).attrs({as: 'h2'})``;
        const Grandson = placeable(Child).attrs({as: 'h3'})``;
        console.log
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
        const Child = placeable(Parent).attrs({as: 'h2'})``;
        const Grandson = placeable(Child).attrs({as: 'h3'})``;
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
