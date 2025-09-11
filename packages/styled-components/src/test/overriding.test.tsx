import { render } from '@testing-library/react';
import React from 'react';
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
    render(<Inner />);
    render(<Outer />);

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

    render(<Inner />);

    const tree = render(<Outer />);

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
    expect(tree.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a sc-b c d"
        />
      </DocumentFragment>
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
      render(<Parent />);
      render(<Child />);
      render(<Grandson />);

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
        render(<Parent />);
        render(<Child />);
        render(<Grandson />);

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

        expect(render(<Parent />).asFragment()).toMatchInlineSnapshot(`
          <DocumentFragment>
            <h1
              class="sc-a d"
              color="primary"
            />
          </DocumentFragment>
        `);
        expect(render(<Child />).asFragment()).toMatchInlineSnapshot(`
          <DocumentFragment>
            <h2
              class="sc-a sc-b e"
              color="secondary"
            />
          </DocumentFragment>
        `);

        expect(render(<Grandson color="primary" />).asFragment()).toMatchInlineSnapshot(`
          <DocumentFragment>
            <h3
              class="sc-a sc-b sc-c d"
              color="primary"
            />
          </DocumentFragment>
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
