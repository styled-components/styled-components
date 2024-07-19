import React from 'react';
import ReactDOM from 'react-dom';
import { act, Simulate } from 'react-dom/test-utils';
import ReactTestRenderer from 'react-test-renderer';
import * as constants from '../../constants';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import ThemeProvider from '../../models/ThemeProvider';
import StyleSheet from '../../sheet';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import createGlobalStyle from '../createGlobalStyle';
import keyframes from '../keyframes';

describe(`createGlobalStyle`, () => {
  let context: ReturnType<typeof setup>;

  function setup() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    return {
      container,
      render(comp: React.JSX.Element) {
        ReactDOM.render(comp, container);
      },
      cleanup() {
        resetStyled();
        document.body.removeChild(container);
      },
    };
  }

  beforeEach(() => {
    context = setup();
  });

  afterEach(() => {
    context.cleanup();
  });

  it(`injects global <style> when rendered`, () => {
    const { render } = context;
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `;
    render(<Component />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-inject] {
        color: red;
      }"
    `);
  });

  it(`supports interpolation`, () => {
    const { render } = context;
    const Component = createGlobalStyle<{ color: string }>`div {color:${props => props.color};} `;
    render(<Component color="orange" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: orange;
      }"
    `);
  });

  it(`supports objects with a function`, () => {
    const { render } = setup();
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
    const { render } = setup();
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
    const { render } = context;
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
    const { render } = context;
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

    update({ color: 'red' });
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "div {
        color: red;
      }"
    `);
  });

  it('should work in StrictMode without warnings', () => {
    const { render } = context;
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

    const { render } = context;
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

  it(`renders to StyleSheetManager.target`, () => {
    const { container, render } = context;
    const Component = createGlobalStyle`[data-test-target]{color:red;} `;
    render(
      <StyleSheetManager target={container}>
        <Component />
      </StyleSheetManager>
    );

    const style = container.firstElementChild!;
    expect(style.tagName).toBe('STYLE');
    expect(style.textContent).toContain(`[data-test-target]{color:red;}`);
  });

  it(`adds new global rules non-destructively`, () => {
    const { render } = context;
    const Color = createGlobalStyle`[data-test-add]{color:red;} `;
    const Background = createGlobalStyle`[data-test-add]{background:yellow;} `;

    render(
      <React.Fragment>
        <Color />
        <Background />
      </React.Fragment>
    );

    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "[data-test-add] {
        color: red;
      }
      [data-test-add] {
        background: yellow;
      }"
    `);
  });

  it(`stringifies multiple rules correctly`, () => {
    const { render } = context;
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
    const { render } = context;

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

  it(`removes styling injected styling when unmounted`, () => {
    const ComponentA = createGlobalStyle`[data-test-remove]{color:grey;} `;
    const ComponentB = createGlobalStyle`[data-test-keep]{color:blue;} `;

    class Comp extends React.Component<{ insert: boolean }> {
      render() {
        return this.props.insert ? <ComponentA /> : <ComponentB />;
      }
    }

    const renderer = ReactTestRenderer.create(<Comp insert />);

    ReactTestRenderer.act(() => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "[data-test-remove] {
          color: grey;
        }"
      `);

      renderer.update(<Comp insert={false} />);
    });

    ReactTestRenderer.act(() => {
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "[data-test-keep] {
          color: blue;
        }"
      `);
    });
  });

  it(`removes styling injected for multiple <GlobalStyle> components correctly`, () => {
    const { render } = context;

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
    const el = document.querySelector('[data-test-el]')!;
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }
      body {
        color: white;
      }"
    `); // should have both styles

    Simulate.click(el);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: palevioletred;
      }"
    `); // should only have palevioletred

    Simulate.click(el);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`); // should be empty
  });

  it(`removes styling injected for multiple instances of same <GlobalStyle> components correctly`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { render } = context;

    const A = createGlobalStyle<{ bgColor?: any }>`
      body { background: ${props => props.bgColor}; }
    `;

    render(<A bgColor="blue" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: blue;
      }"
    `);

    render(<A bgColor="red" />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "body {
        background: red;
      }"
    `);

    render(<A />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`""`);
  });

  it(`should warn when children are passed as props`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { render } = context;
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

    const { render } = context;
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
    const { render } = context;

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
      "div {
        display: inline-block;
        animation: a 2s linear infinite;
        padding: 2rem 1rem;
        font-size: 1.2rem;
      }
      @keyframes a {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }"
    `);
  });

  it(`removes style tag in StyleSheetManager.target when unmounted after target detached and no other global styles`, () => {
    // Set DISABLE_SPEEDY flag to false to force using speedy tag
    const flag = constants.DISABLE_SPEEDY;
    // @ts-expect-error it's ok
    constants.DISABLE_SPEEDY = false;

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

    ReactDOM.render(<Comp />, container);

    // Check styles
    const style = styleContainer.firstElementChild as HTMLStyleElement;
    expect((style!.sheet!.cssRules[0] as CSSStyleRule).selectorText).toBe(
      '[data-test-unmount-remove]'
    );

    // detach container and unmount react component
    try {
      document.body.removeChild(container);
      document.body.removeChild(styleContainer);

      ReactDOM.unmountComponentAtNode(container);
    } catch (e) {
      fail('should not throw exception');
    }

    // Reset DISABLE_SPEEDY flag
    // @ts-expect-error it's ok
    constants.DISABLE_SPEEDY = flag;
  });

  it(`injects multiple global styles in definition order, not composition order`, () => {
    const { render } = context;
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
