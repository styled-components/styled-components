import { render } from '@testing-library/react';
import React from 'react';
import { StyleSheetManager } from '../models/StyleSheetManager';
import StyleSheet from '../sheet';
import extractCSS from '../utils/extractCSS';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimization since we're not
// testing for WebStyle specifics here
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
    const colors = {
      primary: 'red',
      secondary: 'blue',
      tertiary: 'green',
    };

    it('should apply the outermost attrs color value across an extended chain', () => {
      const Parent = styled.h1.attrs<{ color?: keyof typeof colors }>({ color: 'primary' })`
        position: relative;
        color: ${props => colors[props.color!]};
      `;
      const Child = styled(Parent).attrs({ color: 'secondary' })``;
      const Grandson = styled(Child).attrs({ color: 'tertiary' })``;
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

    describe('when an outer component renders an inner one defined after it', () => {
      const warnings = () => (console.warn as jest.Mock).mock.calls.map(call => call[0]);

      beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
      });

      it('sits after the inner component when it renders it through as', () => {
        const Outer = styled.div`
          color: red;
        `;
        const Inner = styled.div`
          color: blue;
        `;

        render(<Outer as={Inner} />);

        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            color: blue;
          }
          .c {
            color: red;
          }"
        `);
      });

      it('sits after the inner component when a plain component sits between them', () => {
        const Between = ({ className }: { className?: string }) => <Inner className={className} />;
        const Outer = styled(Between)`
          color: red;
        `;
        const Inner = styled.div`
          color: blue;
        `;

        render(<Outer />);

        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            color: blue;
          }
          .c {
            color: red;
          }"
        `);
      });

      it('moves behind an inner component that first mounts after the outer was written alone', () => {
        const Outer = styled.div`
          color: red;
        `;
        const Inner = styled.div`
          color: blue;
        `;

        render(<Outer />);
        render(<Outer as={Inner} />);

        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            color: blue;
          }
          .c {
            color: red;
          }"
        `);
      });

      it('moves behind an inner component that receives the outer classes on a later render', () => {
        const Between = ({ className, wrapped }: { className?: string; wrapped: boolean }) => (
          <Inner className={wrapped ? className : 'plain'} />
        );
        const Outer = styled(Between)`
          color: red;
        `;
        const Inner = styled.div`
          color: blue;
        `;

        const { rerender } = render(<Outer wrapped={false} />);
        const before = getRenderedCSS();

        rerender(<Outer wrapped />);

        expect(before).toMatchInlineSnapshot(`
          ".c {
            color: red;
          }
          .d {
            color: blue;
          }"
        `);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".d {
            color: blue;
          }
          .c {
            color: red;
          }"
        `);
      });

      it('puts the outer after the inner in a new sheet the same instances move to', () => {
        const Between = ({ className }: { className?: string }) => <Inner className={className} />;
        const Outer = styled(Between)`
          color: red;
        `;
        const Inner = styled.div`
          color: blue;
        `;
        const first = new StyleSheet();
        const second = new StyleSheet();

        const { rerender } = render(
          <StyleSheetManager sheet={first}>
            <Outer />
          </StyleSheetManager>
        );
        rerender(
          <StyleSheetManager sheet={second}>
            <Outer />
          </StyleSheetManager>
        );

        const innerThenOuter = '.d {color: blue;}/*!sc*/\n.c {color: red;}/*!sc*/\n';

        expect(extractCSS(first)).toBe(innerThenOuter);
        expect(extractCSS(second)).toBe(innerThenOuter);
      });

      it('learns an outer whose id was registered after an earlier render of the same className', () => {
        const Inner = styled.div`
          color: blue;
        `;
        const sheet = new StyleSheet();
        const lateId = 'sc-late';
        // A changed prop makes the memoized instance render again with the same className.
        const tree = (pass: number) => (
          <StyleSheetManager sheet={sheet}>
            <Inner className={lateId} data-pass={pass} />
          </StyleSheetManager>
        );

        const { rerender } = render(tree(1));

        expect(sheet.isSettled(lateId, Inner.styledComponentId)).toBe(false);

        StyleSheet.registerId(lateId);
        rerender(tree(2));

        expect(sheet.isSettled(lateId, Inner.styledComponentId)).toBe(true);
      });

      it('falls back to definition order for two components that wrap each other, once, and keeps it', () => {
        const First = styled.div.withConfig({ displayName: 'First' })`
          color: red;
        `;
        const Second = styled.div.withConfig({ displayName: 'Second' })`
          color: blue;
        `;

        render(<First as={Second} />);
        const afterFirst = getRenderedCSS();

        render(<Second as={First} />);
        const afterSecond = getRenderedCSS();

        render(<First as={Second} />);
        render(<Second as={First} />);

        expect(afterFirst).toMatchInlineSnapshot(`
          ".d {
            color: blue;
          }
          .c {
            color: red;
          }"
        `);
        expect(afterSecond).toMatchInlineSnapshot(`
          ".c {
            color: red;
          }
          .d {
            color: blue;
          }"
        `);
        expect(getRenderedCSS()).toBe(afterSecond);
        expect(warnings()).toMatchInlineSnapshot(`
          [
            "[sc] Components "First" and "Second" wrap each other in different places, so their order falls back to definition order: "Second" sits after "First" and overrides it wherever both style one element. Raise the specificity of the one that should win.",
          ]
        `);
      });
    });

    describe('when overriding with another component', () => {
      it('should apply the outermost attrs color value alongside a new element target', () => {
        const Parent = styled.h1.attrs<{ color?: keyof typeof colors }>({ color: 'primary' })`
          position: relative;
          color: ${props => colors[props.color!]};
        `;
        const Child = styled(Parent).attrs({ as: 'h2', color: 'secondary' })``;
        const Grandson = styled(Child).attrs({ as: 'h3', color: 'tertiary' })``;
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

      it('should render each level with its own attrs and as target', () => {
        const Parent = styled.h1.attrs<{ color?: keyof typeof colors }>({ color: 'primary' })`
          position: relative;
          color: ${props => colors[props.color!]};
        `;
        const Child = styled(Parent).attrs({ as: 'h2', color: 'secondary' })``;
        const Grandson = styled(Child).attrs({ as: 'h3', color: 'tertiary' })``;

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
        expect(render(<Grandson />).asFragment()).toMatchInlineSnapshot(`
          <DocumentFragment>
            <h3
              class="sc-a sc-b sc-c f"
              color="tertiary"
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
          }
          .f {
            position: relative;
            color: green;
          }"
        `);
      });
    });
  });
});
