import React from 'react';
import TestRenderer from 'react-test-renderer';
import { AnyComponent } from '../types';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../utils/isStaticRules', () => () => false);

let styled: ReturnType<typeof resetStyled>;

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

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".c {
        color: blue;
        font-weight: light;
      }
      .d {
        padding: 1rem;
      }
      .d > .sc-a {
        font-weight: bold;
      }"
    `);
  });

  it('folded components should not duplicate styles', () => {
    const Inner = styled.div`
      color: blue;

      & + & {
        color: green;
      }
    `;

    const Outer = styled(Inner)`
      padding: 1rem;
    `;

    TestRenderer.create(<Inner />);

    const tree = TestRenderer.create(<Outer />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".c {
        color: blue;
      }
      .sc-a + .sc-a {
        color: green;
      }
      .d {
        padding: 1rem;
      }"
    `);

    // ensure both static classes are applied and dynamic classes are also present
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="sc-a sc-b c d"
      />
    `);
  });

  describe('inheritance', () => {
    const setupParent = () => {
      const colors = {
        primary: 'red',
        secondary: 'blue',
        tertiary: 'green',
      };

      const Parent = styled.h1<{ color?: keyof typeof colors }>`
        position: relative;
        color: ${props => colors[props.color!]};
      `;

      return Parent;
    };

    const addDefaultProps = (Parent: AnyComponent, Child: AnyComponent, Grandson: AnyComponent) => {
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

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".d {
          position: relative;
          color: red;
        }
        .e {
          position: relative;
          color: blue;
        }
        .f {
          position: relative;
          color: green;
        }"
      `);
    });

    describe('when overriding with another component', () => {
      it('should override parents defaultProps', () => {
        const Parent = setupParent();
        const Child = styled(Parent).attrs({ as: 'h2' })``;
        const Grandson = styled(Child).attrs(() => ({ as: 'h3' }))``;
        addDefaultProps(Parent, Child, Grandson);
        TestRenderer.create(<Parent />);
        TestRenderer.create(<Child />);
        TestRenderer.create(<Grandson />);

        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            position: relative;
            color: red;
          }
          .e {
            position: relative;
            color: blue;
          }
          .f {
            position: relative;
            color: green;
          }"
        `);
      });

      it('should evaluate grandsons props', () => {
        const Parent = setupParent();
        const Child = styled(Parent).attrs({ as: 'h2' })``;
        const Grandson = styled(Child).attrs(() => ({ as: 'h3' }))``;
        addDefaultProps(Parent, Child, Grandson);

        expect(TestRenderer.create(<Parent />).toJSON()).toMatchInlineSnapshot(`
          <h1
            className="sc-a d"
            color="primary"
          />
        `);
        expect(TestRenderer.create(<Child />).toJSON()).toMatchInlineSnapshot(`
          <h2
            className="sc-a sc-b e"
            color="secondary"
          />
        `);

        expect(TestRenderer.create(<Grandson color="primary" />).toJSON()).toMatchInlineSnapshot(`
          <h3
            className="sc-a sc-b sc-c d"
            color="primary"
          />
        `);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            position: relative;
            color: red;
          }
          .e {
            position: relative;
            color: blue;
          }"
        `);
      });
    });
  });
});
