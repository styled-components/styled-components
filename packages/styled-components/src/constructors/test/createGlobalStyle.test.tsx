import { act, render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import React from 'react';
import GlobalStyle from '../../models/GlobalStyle';
import { mainStylis, StyleSheetManager } from '../../models/StyleSheetManager';
import ThemeProvider from '../../models/ThemeProvider';
import StyleSheet from '../../sheet';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import createGlobalStyle from '../createGlobalStyle';
import css from '../css';
import keyframes from '../keyframes';

describe(`createGlobalStyle`, () => {
  beforeEach(() => {
    resetStyled();
  });

  it(`injects global <style> when rendered`, () => {
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `;
    render(<Component />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-inject] {
        color: red;
      }"
    `);
  });

  it(`supports interpolation`, () => {
    const Component = createGlobalStyle<{ color: string }>`div {color:${props => props.color};} `;
    render(<Component color="orange" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: orange;
      }"
    `);
  });

  it(`supports objects with a function`, () => {
    const Component = createGlobalStyle({
      'h1, h2, h3, h4, h5, h6': {
        fontFamily: ({ theme }) => theme.fonts.heading,
      },
    });
    render(<Component theme={{ fonts: { heading: 'sans-serif' } }} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "h1, h2, h3, h4, h5, h6 {
        font-family: sans-serif;
      }"
    `);
  });

  it(`supports nested objects with a function`, () => {
    const Component1 = createGlobalStyle({
      'div, span': {
        h1: {
          span: {
            fontFamily: ({ theme }) => theme.fonts.heading,
          },
        },
      },
    });
    render(<Component1 theme={{ fonts: { heading: 'sans-serif' } }} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div h1 span, span h1 span {
        font-family: sans-serif;
      }"
    `);
  });

  it(`supports theming`, () => {
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `;
    render(
      <ThemeProvider theme={{ color: 'black' }}>
        <Component />
      </ThemeProvider>
    );
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: black;
      }"
    `);
  });

  it(`updates theme correctly`, () => {
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `;
    let update: any;
    class App extends React.Component {
      state = { color: 'grey' };

      constructor(props: {}) {
        super(props);
        update = (payload: {}) => {
          this.setState(payload);
        };
      }

      render() {
        return (
          <ThemeProvider theme={{ color: this.state.color }}>
            <Component />
          </ThemeProvider>
        );
      }
    }
    render(<App />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: grey;
      }"
    `);

    act(() => update({ color: 'red' }));
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: red;
      }"
    `);
  });

  it('should work in StrictMode without warnings', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Comp = createGlobalStyle`
      html {
        color: red;
      }
    `;

    act(() => {
      render(
        <React.StrictMode>
          <Comp />
        </React.StrictMode>
      );
    });

    expect(spy).not.toHaveBeenCalled();
  });

  it('should not inject twice in StrictMode', () => {
    jest.spyOn(StyleSheet, 'registerId');

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Comp = createGlobalStyle`
      html {
        color: red;
      }
    `;

    act(() => {
      render(
        <React.StrictMode>
          <Comp />
        </React.StrictMode>
      );
    });

    expect(spy).not.toHaveBeenCalled();
    expect(StyleSheet.registerId).toHaveBeenCalledTimes(1);
  });

  it('should have styles present after StrictMode double-render cycle', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Comp = createGlobalStyle`
      [data-strict-test] {
        color: red;
      }
    `;

    act(() => {
      render(
        <React.StrictMode>
          <Comp />
        </React.StrictMode>
      );
    });

    // Styles should be present after StrictMode's render-unmount-remount cycle
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-strict-test] {
        color: red;
      }"
    `);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should properly cleanup and re-inject styles in StrictMode unmount/remount', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const Comp = createGlobalStyle`
      [data-strict-unmount] {
        background: blue;
      }
    `;

    const { unmount } = render(
      <React.StrictMode>
        <Comp />
      </React.StrictMode>
    );

    // Styles should be present
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-strict-unmount] {
        background: blue;
      }"
    `);

    // Unmount
    unmount();

    // Wait for microtask to complete cleanup
    await Promise.resolve();

    // Styles should be removed after unmount
    expect(getRenderedCSS()).not.toContain('[data-strict-unmount]');

    // Remount
    render(
      <React.StrictMode>
        <Comp />
      </React.StrictMode>
    );

    // Styles should be re-injected
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-strict-unmount] {
        background: blue;
      }"
    `);
    expect(spy).not.toHaveBeenCalled();
  });

  it(`preserves multiple instances in StrictMode when one unmounts`, () => {
    const GlobalStyle = createGlobalStyle`body { background: teal; }`;

    function Wrapper({ showSecond }: { showSecond: boolean }) {
      return (
        <React.StrictMode>
          <GlobalStyle />
          {showSecond && <GlobalStyle />}
        </React.StrictMode>
      );
    }

    const { rerender } = render(<Wrapper showSecond={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: teal;
      }"
    `);

    rerender(<Wrapper showSecond={false} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: teal;
      }"
    `);
  });

  it(`renders to StyleSheetManager.target`, () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const Component = createGlobalStyle`[data-test-target]{color:red;} `;
    render(
      <StyleSheetManager target={container}>
        <Component />
      </StyleSheetManager>
    );

    const style = container.firstElementChild!;
    expect(style.tagName).toBe('STYLE');
    expect(style.textContent).toMatchInlineSnapshot(`""`);
  });

  it(`stringifies multiple rules correctly`, () => {
    const Component = createGlobalStyle<{ fg: any; bg: any }>`
      div {
        color: ${props => props.fg};
        background: ${props => props.bg};
      }
    `;
    render(<Component fg="red" bg="green" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: red;
        background: green;
      }"
    `);
  });

  it(`injects multiple <GlobalStyle> components correctly`, () => {
    const A = createGlobalStyle`body { background: palevioletred; }`;
    const B = createGlobalStyle`body { color: white; }`;

    render(
      <React.Fragment>
        <A />
        <B />
      </React.Fragment>
    );
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }
      body {
        color: white;
      }"
    `);
  });

  it(`removes styling injected styling when unmounted`, async () => {
    const ComponentA = createGlobalStyle`[data-test-remove]{color:grey;} `;
    const ComponentB = createGlobalStyle`[data-test-keep]{color:blue;} `;

    class Comp extends React.Component<{ insert: boolean }> {
      render() {
        return this.props.insert ? <ComponentA /> : <ComponentB />;
      }
    }

    const renderer = render(<Comp insert />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-remove] {
        color: grey;
      }"
    `);

    renderer.rerender(<Comp insert={false} />);

    // Wait for microtask to complete cleanup
    await Promise.resolve();

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-keep] {
        color: blue;
      }"
    `);
  });

  it(`removes styling injected for multiple <GlobalStyle> components correctly`, async () => {
    const A = createGlobalStyle`body { background: palevioletred; }`;
    const B = createGlobalStyle`body { color: white; }`;

    class Comp extends React.Component {
      state = {
        a: true,
        b: true,
      };

      onClick() {
        if (this.state.a === true && this.state.b === true) {
          this.setState({
            a: true,
            b: false,
          });
        } else if (this.state.a === true && this.state.b === false) {
          this.setState({
            a: false,
            b: false,
          });
        } else {
          this.setState({
            a: true,
            b: true,
          });
        }
      }

      render() {
        return (
          <div data-test-el onClick={() => this.onClick()}>
            {this.state.a ? <A /> : null}
            {this.state.b ? <B /> : null}
          </div>
        );
      }
    }

    render(<Comp />);
    const el = document.querySelector('[data-test-el]')! as HTMLElement;
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }
      body {
        color: white;
      }"
    `); // should have both styles

    await userEvent.click(el);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }"
    `); // should only have palevioletred

    await userEvent.click(el);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`); // should be empty
  });

  it(`removes styling injected for multiple instances of same <GlobalStyle> components correctly`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const A = createGlobalStyle<{ bgColor?: any }>`
      body { background: ${props => props.bgColor}; }
    `;

    const root = render(<A bgColor="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: blue;
      }"
    `);

    root.rerender(<A bgColor="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    root.rerender(<A />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);
  });

  it(`preserves styles when one of multiple mounted instances of the same global style unmounts`, () => {
    const GlobalStyle = createGlobalStyle`body { background: palevioletred; }`;

    function Wrapper({ showSecond }: { showSecond: boolean }) {
      return (
        <>
          <GlobalStyle />
          {showSecond && <GlobalStyle />}
        </>
      );
    }

    const { rerender } = render(<Wrapper showSecond={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }"
    `);

    // Unmount the second instance — first instance's styles must survive
    rerender(<Wrapper showSecond={false} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }"
    `);
  });

  it(`preserves dynamic styles when one of multiple mounted instances unmounts`, () => {
    const GlobalStyle = createGlobalStyle<{ color: string }>`
      body { color: ${props => props.color}; }
    `;

    function Wrapper({ showSecond, color }: { showSecond: boolean; color: string }) {
      return (
        <>
          <GlobalStyle color={color} />
          {showSecond && <GlobalStyle color={color} />}
        </>
      );
    }

    const { rerender } = render(<Wrapper showSecond={true} color="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        color: red;
      }
      body {
        color: red;
      }"
    `);

    // Unmount second — first should keep its styles
    rerender(<Wrapper showSecond={false} color="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        color: red;
      }"
    `);

    // Update prop on remaining instance — should still work
    rerender(<Wrapper showSecond={false} color="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        color: blue;
      }"
    `);
  });

  it(`cleans up all styles when all instances of a global style unmount`, () => {
    const GlobalStyle = createGlobalStyle`body { background: red; }`;

    function Wrapper({ count }: { count: number }) {
      return (
        <>
          {Array.from({ length: count }, (_, i) => (
            <GlobalStyle key={i} />
          ))}
        </>
      );
    }

    const { rerender } = render(<Wrapper count={3} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    // Remove one at a time
    rerender(<Wrapper count={2} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    rerender(<Wrapper count={1} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    rerender(<Wrapper count={0} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);
  });

  it(`handles remounting instances after full unmount`, () => {
    const GlobalStyle = createGlobalStyle`body { background: green; }`;

    function Wrapper({ show }: { show: boolean }) {
      return show ? (
        <>
          <GlobalStyle />
          <GlobalStyle />
        </>
      ) : null;
    }

    const { rerender } = render(<Wrapper show={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: green;
      }"
    `);

    // Unmount all
    rerender(<Wrapper show={false} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);

    // Remount — should work again
    rerender(<Wrapper show={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: green;
      }"
    `);
  });

  it(`handles unmounting first instance while second stays mounted`, () => {
    const GlobalStyle = createGlobalStyle`body { background: coral; }`;

    function Wrapper({ showFirst, showSecond }: { showFirst: boolean; showSecond: boolean }) {
      return (
        <>
          {showFirst && <GlobalStyle />}
          {showSecond && <GlobalStyle />}
        </>
      );
    }

    const { rerender } = render(<Wrapper showFirst={true} showSecond={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: coral;
      }"
    `);

    // Remove the FIRST instance — second should survive
    rerender(<Wrapper showFirst={false} showSecond={true} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: coral;
      }"
    `);

    // Remove second too
    rerender(<Wrapper showFirst={false} showSecond={false} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);
  });

  it(`updates one instance's props while another instance stays mounted`, () => {
    const GlobalStyle = createGlobalStyle<{ bg: string }>`
      body { background: ${props => props.bg}; }
    `;

    function Wrapper({ colorA, colorB }: { colorA: string; colorB: string }) {
      return (
        <>
          <GlobalStyle bg={colorA} />
          <GlobalStyle bg={colorB} />
        </>
      );
    }

    const { rerender } = render(<Wrapper colorA="red" colorB="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }
      body {
        background: blue;
      }"
    `);

    // Change only instance A's prop — instance B's CSS is unchanged, and
    // rule order must remain mount-order (A then B) so cascade doesn't flip
    // based on which instance updated last.
    rerender(<Wrapper colorA="green" colorB="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: green;
      }
      body {
        background: blue;
      }"
    `);
  });

  it(`handles dynamic props in StrictMode across multiple renders`, () => {
    const GlobalStyle = createGlobalStyle<{ color: string }>`
      body { color: ${props => props.color}; }
    `;

    function App({ color }: { color: string }) {
      return (
        <React.StrictMode>
          <GlobalStyle color={color} />
        </React.StrictMode>
      );
    }

    const { rerender } = render(<App color="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        color: red;
      }"
    `);

    rerender(<App color="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        color: blue;
      }"
    `);
  });

  it(`should warn when children are passed as props`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const Component = createGlobalStyle<{ fg: any; bg: any }>`
      div {
        color: ${props => props.fg};
        background: ${props => props.bg};
      }
    `;
    render(
      // @ts-expect-error children not expected
      <Component fg="red" bg="green">
        <div />
      </Component>
    );

    const warn = console.warn as jest.Mock<Console['warn']>;

    expect(warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"The global style component sc-global-a was given child JSX. createGlobalStyle does not render children."`
    );
  });

  it(`should warn when @import is used`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const Component = createGlobalStyle`
      @import url("something.css");
    `;
    render(<Component />);

    const warn = console.warn as jest.Mock<Console['warn']>;

    expect(warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"Please do not use @import CSS syntax in createGlobalStyle at this time, as the CSSOM APIs we use in production do not handle it well. Instead, we recommend using a library such as react-helmet to inject a typical <link> meta tag to the stylesheet, or simply embedding it manually in your index.html <head> section for a simpler app."`
    );
  });

  it('works with keyframes', () => {
    const rotate360 = keyframes`
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    `;

    const GlobalStyle = createGlobalStyle`
      div {
        display: inline-block;
        animation: ${rotate360} 2s linear infinite;
        padding: 2rem 1rem;
        font-size: 1.2rem;
      }
    `;

    render(
      <div>
        <GlobalStyle />
        <div>&lt; 💅 &gt;</div>
      </div>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@keyframes a {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      div {
        display: inline-block;
        animation: a 2s linear infinite;
        padding: 2rem 1rem;
        font-size: 1.2rem;
      }"
    `);
  });

  it(`removes style tag in StyleSheetManager.target when unmounted after target detached and no other global styles`, () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const styleContainer = document.createElement('div');
    document.body.appendChild(styleContainer);

    const Component = createGlobalStyle`[data-test-unmount-remove]{color:grey;} `;

    class Comp extends React.Component {
      render() {
        return (
          <div>
            <StyleSheetManager target={styleContainer}>
              <Component />
            </StyleSheetManager>
          </div>
        );
      }
    }

    render(<Comp />);

    // Check styles
    const style = styleContainer.firstElementChild as HTMLStyleElement;
    expect((style!.sheet!.cssRules[0] as CSSStyleRule).selectorText).toBe(
      '[data-test-unmount-remove]'
    );

    // detach container and unmount react component
    try {
      document.body.removeChild(container);
      document.body.removeChild(styleContainer);
    } catch (e) {
      fail('should not throw exception');
    }
  });

  it(`injects multiple global styles in definition order, not composition order`, () => {
    const GlobalStyleOne = createGlobalStyle`[data-test-inject]{color:red;} `;
    const GlobalStyleTwo = createGlobalStyle`[data-test-inject]{color:green;} `;
    render(
      <>
        <GlobalStyleTwo />
        <GlobalStyleOne />
      </>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-inject] {
        color: red;
      }
      [data-test-inject] {
        color: green;
      }"
    `);
  });
});

describe('createGlobalStyle HMR', () => {
  /**
   * Simulate React Fast Refresh "hot patching": the module re-evaluates,
   * createGlobalStyle produces a new inner render function (with a new
   * globalStyle closure), but the component FIBER stays mounted.
   *
   * We achieve this with a DynamicRenderer wrapper that calls the inner
   * GlobalStyleComponent as a render function (like a custom hook) on
   * the wrapper's fiber.  Swapping the render function mimics Fast Refresh
   * replacing the closure without unmounting.
   *
   * The fix: including `globalStyle` in useLayoutEffect deps so that
   * the new object reference from the re-evaluated module triggers
   * effect cleanup + re-run.
   */

  beforeEach(() => {
    resetStyled();
  });

  /**
   * Call the inner GlobalStyleComponent render function directly on a
   * stable host fiber — hooks attach to the host, state is preserved,
   * but the closure (and thus `globalStyle`) changes when we swap `renderFn`.
   */
  function DynamicRenderer({ renderFn }: { renderFn: (props: any) => React.ReactNode }) {
    return renderFn({}) as React.ReactElement;
  }

  it('updates static CSS when the globalStyle closure changes (Fast Refresh simulation)', () => {
    const V1 = createGlobalStyle`[data-hmr]{color:red;}`;
    const V2 = createGlobalStyle`[data-hmr]{color:blue;}`;

    // Extract the inner GlobalStyleComponent from the React.memo wrapper.
    // This is the function whose closure holds `globalStyle` and `renderStyles`.
    const innerV1 = (V1 as any).type;
    const innerV2 = (V2 as any).type;

    // Mount V1's render function on the DynamicRenderer fiber
    const { rerender } = render(<DynamicRenderer renderFn={innerV1} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-hmr] {
        color: red;
      }"
    `);

    // "HMR patch" — swap to V2's render function on the SAME fiber.
    // DynamicRenderer's fiber stays mounted; hooks are preserved.
    // The useLayoutEffect callback now captures V2's globalStyle.
    // With fix: deps include globalStyle (new ref) → effect re-runs.
    // Without fix: deps are [instance, styleSheet] (unchanged) → effect skipped.
    rerender(<DynamicRenderer renderFn={innerV2} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-hmr] {
        color: blue;
      }"
    `);
  });

  it('updates dynamic CSS when the globalStyle closure changes (Fast Refresh simulation)', () => {
    const V1 = createGlobalStyle<{ bg: string }>`
      body { background: ${props => props.bg}; font-size: 14px; }
    `;
    const V2 = createGlobalStyle<{ bg: string }>`
      body { background: ${props => props.bg}; font-size: 18px; margin: 0; }
    `;

    const innerV1 = (V1 as any).type;
    const innerV2 = (V2 as any).type;

    const { rerender } = render(
      <DynamicRenderer renderFn={(p: any) => innerV1({ bg: 'red', ...p })} />
    );
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
        font-size: 14px;
      }"
    `);

    // Swap closure, same props
    rerender(<DynamicRenderer renderFn={(p: any) => innerV2({ bg: 'red', ...p })} />);

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
        font-size: 18px;
        margin: 0;
      }"
    `);
  });

  it('cleans up old group when globalStyle closure changes', () => {
    const V1 = createGlobalStyle`[data-hmr-cleanup]{outline:1px solid red;}`;
    const V2 = createGlobalStyle`[data-hmr-cleanup]{border:1px solid blue;}`;

    const innerV1 = (V1 as any).type;
    const innerV2 = (V2 as any).type;

    const { rerender } = render(<DynamicRenderer renderFn={innerV1} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-hmr-cleanup] {
        outline: 1px solid red;
      }"
    `);

    rerender(<DynamicRenderer renderFn={innerV2} />);

    // Old styles must be gone, new styles present
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-hmr-cleanup] {
        border: 1px solid blue;
      }"
    `);
  });
});

describe('GlobalStyle.renderStyles (unit)', () => {
  /**
   * These tests exercise GlobalStyle.renderStyles() directly to cover
   * the rulesEqual fast-path on the pure model. The React lifecycle
   * path also reaches this fast-path now -- see the lifecycle tests
   * below (`useLayoutEffect rebuildGroup`).
   */

  let sheet: StyleSheet;

  beforeEach(() => {
    resetStyled();
    sheet = new StyleSheet({ isServer: false });
  });

  it('skips rebuildGroup when re-rendered with identical CSS (rulesEqual fast-path)', () => {
    const rules = css`
      body {
        color: ${(p: { theme: { color: string } }) => p.theme.color};
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-eq-test');
    const ctx = { theme: { color: 'red' } } as any;

    // First render — populates instanceRules
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(gs.instanceRules.has('1')).toBe(true);

    const clearRulesSpy = jest.spyOn(sheet, 'clearRules');

    // Second render with same CSS — should hit fast-path and skip rebuildGroup
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(clearRulesSpy).not.toHaveBeenCalled();
  });

  it('rebuilds group when re-rendered with changed CSS', () => {
    const rules = css`
      body {
        color: ${(p: { theme: { color: string } }) => p.theme.color};
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-diff-test');

    // First render
    gs.renderStyles('1', { theme: { color: 'red' } } as any, sheet, mainStylis);
    const clearRulesSpy = jest.spyOn(sheet, 'clearRules');

    // Second render with different CSS — should NOT hit fast-path
    gs.renderStyles('1', { theme: { color: 'blue' } } as any, sheet, mainStylis);
    expect(clearRulesSpy).toHaveBeenCalled();

    // Verify the new CSS is present
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body {color: blue;}/*!sc*/
      data-styled.g1[id="sc-global-diff-test"]{content:"sc-global-diff-test1,"}/*!sc*/
      "
    `);
  });

  it('rebuilds group when rule count changes', () => {
    // Use a rule that can produce different numbers of stylis output rules
    let extraRule = '';
    const rules = css`
      body {
        color: red;
      }
      ${() => extraRule}
    `;
    const gs = new GlobalStyle(rules, 'sc-global-count-test');
    const ctx = { theme: {} } as any;

    // First render — one rule
    gs.renderStyles('1', ctx, sheet, mainStylis);
    const clearRulesSpy = jest.spyOn(sheet, 'clearRules');

    // Add extra rule content and re-render
    extraRule = 'div { background: green; }';
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(clearRulesSpy).toHaveBeenCalled();
  });

  it('always rebuilds on server stylesheet even with identical CSS', () => {
    const serverSheet = new StyleSheet({ isServer: true });
    const rules = css`
      body {
        color: ${(p: { theme: { color: string } }) => p.theme.color};
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-server-test');
    const ctx = { theme: { color: 'red' } } as any;

    // First render
    gs.renderStyles('1', ctx, serverSheet, mainStylis);
    const clearRulesSpy = jest.spyOn(serverSheet, 'clearRules');

    // Same CSS — server must always rebuild (clearTag invalidates DOM)
    gs.renderStyles('1', ctx, serverSheet, mainStylis);
    expect(clearRulesSpy).toHaveBeenCalled();
  });

  it('static global style skips re-render entirely when name is already registered', () => {
    const rules = css`
      body {
        background: pink;
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-static-test');
    const ctx = { theme: {} } as any;

    // First render — inserts rules
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body {background: pink;}/*!sc*/
      data-styled.g1[id="sc-global-static-test"]{content:"sc-global-static-test,"}/*!sc*/
      "
    `);

    const insertSpy = jest.spyOn(sheet, 'insertRules');

    // Second render — name already registered, should skip
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('static rehydrated style populates instanceRules cache for rebuild', () => {
    const rules = css`
      body {
        background: teal;
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-rehydrate-test');
    const ctx = { theme: {} } as any;

    // First render — inserts rules and populates cache
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(gs.instanceRules.has('1')).toBe(true);
    const entry1 = gs.instanceRules.get('1')!;

    // Simulate rehydration: name is registered but instanceRules is cleared
    gs.instanceRules.clear();
    expect(gs.instanceRules.has('1')).toBe(false);

    // Re-render — should repopulate cache from computation (not re-insert)
    const insertSpy = jest.spyOn(sheet, 'insertRules');
    gs.renderStyles('1', ctx, sheet, mainStylis);
    expect(gs.instanceRules.has('1')).toBe(true);
    expect(insertSpy).not.toHaveBeenCalled();

    // Cache should match original
    expect(gs.instanceRules.get('1')!.rules).toEqual(entry1.rules);
  });

  it('removeStyles triggers rebuildGroup with surviving instances', () => {
    const rules = css`
      body {
        color: ${(p: { theme: { color: string } }) => p.theme.color};
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-remove-test');

    // Mount two instances
    gs.renderStyles('1', { theme: { color: 'red' } } as any, sheet, mainStylis);
    gs.renderStyles('2', { theme: { color: 'blue' } } as any, sheet, mainStylis);
    expect(gs.instanceRules.size).toBe(2);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body {color: red;}/*!sc*/
      body {color: blue;}/*!sc*/
      data-styled.g1[id="sc-global-remove-test"]{content:"sc-global-remove-test1,sc-global-remove-test2,"}/*!sc*/
      "
    `);

    // Remove instance 1 — instance 2 should survive
    gs.removeStyles('1', sheet);
    expect(gs.instanceRules.size).toBe(1);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body {color: blue;}/*!sc*/
      data-styled.g1[id="sc-global-remove-test"]{content:"sc-global-remove-test2,"}/*!sc*/
      "
    `);

    // Remove instance 2 — all gone
    gs.removeStyles('2', sheet);
    expect(gs.instanceRules.size).toBe(0);
    expect(sheet.toString()).toBe('');
  });

  it('does not accumulate style rules across render/unmount cycles (#5674)', () => {
    const rules = css`
      .perf-a {
        color: red;
      }
      .perf-b {
        color: blue;
      }
    `;
    const gs = new GlobalStyle(rules, 'sc-global-accum-test');
    const ctx = { theme: {} } as any;

    for (let i = 1; i <= 10; i++) {
      const id = String(i);
      gs.renderStyles(id, ctx, sheet, mainStylis);
      gs.removeStyles(id, sheet);
    }

    // After 10 render/remove cycles, all rules should be cleaned up.
    // The bug: renderStyles without removeStyles accumulated rules unboundedly.
    expect(gs.instanceRules.size).toBe(0);
    expect(sheet.toString()).toBe('');
  });
});

describe('createGlobalStyle useLayoutEffect rebuildGroup (#5730)', () => {
  beforeEach(() => {
    resetStyled();
  });

  it('skips rebuildGroup when parent re-renders with unchanged global style props', () => {
    const GlobalStyle = createGlobalStyle<{ bg: string }>`
      body { background: ${props => props.bg}; }
    `;

    function Parent({ bg, counter }: { bg: string; counter: number }) {
      // `counter` forces Parent to re-render without changing `bg`.
      return (
        <>
          <span data-testid="counter">{counter}</span>
          <GlobalStyle bg={bg} />
        </>
      );
    }

    const { rerender } = render(<Parent bg="red" counter={0} />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    // Spy on the shared-group rebuild cost. With the fix, unchanged CSS must
    // NOT clearRules on each unrelated parent re-render.
    const clearRulesSpy = jest.spyOn(StyleSheet.prototype, 'clearRules');

    for (let i = 1; i <= 5; i++) {
      rerender(<Parent bg="red" counter={i} />);
    }

    expect(clearRulesSpy).not.toHaveBeenCalled();
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    clearRulesSpy.mockRestore();
  });

  it('still rebuilds when the dynamic global style CSS actually changes', () => {
    const GlobalStyle = createGlobalStyle<{ bg: string }>`
      body { background: ${props => props.bg}; }
    `;

    const { rerender } = render(<GlobalStyle bg="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    rerender(<GlobalStyle bg="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: blue;
      }"
    `);
  });

  it('still cleans up on unmount after many re-renders', async () => {
    const GlobalStyle = createGlobalStyle<{ bg: string }>`
      [data-5730-cleanup] { background: ${props => props.bg}; }
    `;

    function App({ show, counter }: { show: boolean; counter: number }) {
      return show ? (
        <>
          <span>{counter}</span>
          <GlobalStyle bg="red" />
        </>
      ) : null;
    }

    const { rerender } = render(<App show counter={0} />);

    for (let i = 1; i <= 5; i++) {
      rerender(<App show counter={i} />);
    }

    expect(getRenderedCSS()).toContain('[data-5730-cleanup]');

    rerender(<App show={false} counter={99} />);
    await Promise.resolve();

    expect(getRenderedCSS()).not.toContain('[data-5730-cleanup]');
  });

  it('preserves stylesheet position when any instance of a multi-mounted static global unmounts', () => {
    // Static globals share a single group slot. Unmounting any one instance
    // rebuilds the slot from surviving entries — absolute ordering in the
    // stylesheet must not shift relative to other global styles declared
    // before or after it at module load time.
    const First = createGlobalStyle`html { font-size: 16px; }`;
    const Target = createGlobalStyle`body { background: papayawhip; }`;
    const Last = createGlobalStyle`:root { --token: 1; }`;

    function App({ which }: { which: 'both' | 'firstOnly' | 'secondOnly' }) {
      return (
        <>
          <First />
          {which !== 'secondOnly' && <Target />}
          {which !== 'firstOnly' && <Target />}
          <Last />
        </>
      );
    }

    const { rerender } = render(<App which="both" />);

    // Baseline: both target instances mounted, one copy of rule emitted
    // (static dedup), in its correct slot between First and Last.
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "html {
        font-size: 16px;
      }
      body {
        background: papayawhip;
      }
      :root {
        --token: 1;
      }"
    `);

    // Unmount the FIRST target instance — survivor must remain in same slot.
    rerender(<App which="secondOnly" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "html {
        font-size: 16px;
      }
      body {
        background: papayawhip;
      }
      :root {
        --token: 1;
      }"
    `);

    // Remount first, unmount second — also preserves slot.
    rerender(<App which="both" />);
    rerender(<App which="firstOnly" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "html {
        font-size: 16px;
      }
      body {
        background: papayawhip;
      }
      :root {
        --token: 1;
      }"
    `);
  });
});
