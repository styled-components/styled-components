// @flow
import React from 'react';
import ReactDOM from 'react-dom';
import ReactDOMServer from 'react-dom/server';
import { Simulate } from 'react-dom/test-utils';

import {
  expectCSSMatches,
  getCSS,
  resetStyled,
  stripComments,
  stripWhitespace,
} from '../../test/utils';

import ThemeProvider from '../../models/ThemeProvider';
import ServerStyleSheet from '../../models/ServerStyleSheet';
import StyleSheetManager from '../../models/StyleSheetManager';

import createGlobalStyle from '../createGlobalStyle';
import keyframes from '../keyframes';
import * as constants from '../../constants';

let context;

beforeEach(() => {
  context = setup();
});

afterEach(() => {
  context.cleanup();
});

describe(`createGlobalStyle`, () => {
  it(`returns a function`, () => {
    const Component = createGlobalStyle``;
    expect(typeof Component).toBe('function');
  });

  it(`injects global <style> when rendered`, () => {
    const { render } = context;
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `;
    render(<Component />);
    expectCSSMatches(`[data-test-inject]{color:red;} `);
  });

  it(`injects global <style> when rendered to string`, () => {
    const sheet = new ServerStyleSheet();
    const Component = createGlobalStyle`[data-test-inject]{color:red;} `;
    const html = context.renderToString(sheet.collectStyles(<Component />));

    const container = document.createElement('div');
    container.innerHTML = sheet.getStyleTags();
    const style = container.querySelector('style');

    expect(html).toBe('');
    expect(stripWhitespace(stripComments(style.textContent))).toBe(
      '[data-test-inject]{ color:red; } '
    );
  });

  it(`supports interpolation`, () => {
    const { render } = setup();
    const Component = createGlobalStyle`div {color:${props => props.color};} `;
    render(<Component color="orange" />);
    expectCSSMatches(`div{color:orange;} `);
  });

  it(`supports objects with a function`, () => {
    const { render } = setup();
    const Component = createGlobalStyle({
      'h1, h2, h3, h4, h5, h6': {
        fontFamily: ({theme}) => theme.fonts.heading,
      },
    })
    render(<Component theme={{ fonts: { heading: 'sans-serif' } }} />);
    expectCSSMatches(`h1,h2,h3,h4,h5,h6{ font-family:sans-serif; }`);
  });

  it(`supports nested objects with a function`, () => {
    const { render } = setup();
    const Component1 = createGlobalStyle({
      'div, span': {
        h1: {
          span: {
            fontFamily: ({theme}) => theme.fonts.heading
          }
        }
      }
    })
    render(<Component1 theme={{ fonts: { heading: 'sans-serif' } }} />);
    expectCSSMatches(`div h1 span,span h1 span{ font-family:sans-serif; }`);
  });

  it(`supports theming`, () => {
    const { render } = setup();
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `;
    render(
      <ThemeProvider theme={{ color: 'black' }}>
        <Component />
      </ThemeProvider>
    );
    expectCSSMatches(`div{color:black;} `);
  });

  it(`updates theme correctly`, () => {
    const { render } = setup();
    const Component = createGlobalStyle`div {color:${props => props.theme.color};} `;
    let update;
    class App extends React.Component {
      state = { color: 'grey' };

      constructor() {
        super();
        update = payload => {
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
    expectCSSMatches(`div{color:grey;} `);

    update({ color: 'red' });
    expectCSSMatches(`div{color:red;} `);
  });

  it(`renders to StyleSheetManager.target`, () => {
    const { container, render } = context;
    const Component = createGlobalStyle`[data-test-target]{color:red;} `;
    render(
      <StyleSheetManager target={container}>
        <Component />
      </StyleSheetManager>
    );

    const style = container.firstChild;
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

    setTimeout(() => {
      expectCSSMatches(`
        [data-test-add]{color:red;}
        [data-test-add]{background:yellow;}
      `);
    });
  });

  it(`stringifies multiple rules correctly`, () => {
    const { render } = setup();
    const Component = createGlobalStyle`
      div {
        color: ${props => props.fg};
        background: ${props => props.bg};
      }
    `;
    render(<Component fg="red" bg="green" />);
    expectCSSMatches(`div{color:red;background:green;} `);
  });

  it(`injects multiple <GlobalStyle> components correctly`, () => {
    const { render } = setup();

    const A = createGlobalStyle`body { background: palevioletred; }`;
    const B = createGlobalStyle`body { color: white; }`;

    render(
      <React.Fragment>
        <A />
        <B />
      </React.Fragment>
    );
    expectCSSMatches(`body{background:palevioletred;} body{color:white;}`);
  });

  it(`removes styling injected styling when unmounted`, () => {
    const { render } = setup();
    const Component = createGlobalStyle`[data-test-remove]{color:grey;} `;

    class Comp extends React.Component {
      state = {
        styled: true,
      };

      componentDidMount() {
        this.setState({ styled: false });
      }

      render() {
        return this.state.styled ? <Component /> : null;
      }
    }

    render(<Comp />);
    expect(getCSS(document).trim()).not.toContain(`[data-test-remove]{color:grey;}`);
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
    const el = document.querySelector('[data-test-el]');
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-3005254895 */
      body{background:palevioletred;}
      /* sc-component-id:sc-global-1591963405 */
      body{color:white;}"
    `); // should have both styles

    Simulate.click(el);
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-3005254895 */
      body{background:palevioletred;}
      /* sc-component-id:sc-global-1591963405 */"
    `); // should only have palevioletred

    Simulate.click(el);
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-3005254895 */
      
      /* sc-component-id:sc-global-1591963405 */"
    `); // should be empty
  });

  it(`removes styling injected for multiple instances of same <GlobalStyle> components correctly`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { render } = context;

    const A = createGlobalStyle`
      body { background: ${props => props.bgColor}; }
    `;

    class Comp extends React.Component {
      state = {
        a: true,
        b: true,
      };

      onClick = () => {
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
      };

      render() {
        return (
          <div data-test-el onClick={this.onClick}>
            {this.state.a ? <A bgColor="red" /> : null}
            {this.state.b ? <A bgColor="blue" /> : null}
          </div>
        );
      }
    }

    render(<Comp />); // should be blue
    const el = document.querySelector('[data-test-el]');
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-1846532150 */
      body{background:blue;}"
    `);

    Simulate.click(el); // should be red
    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-1846532150 */
      body{background:red;}"
    `);

    Simulate.click(el); // should be empty
    expect(getCSS(document).trim()).toMatchInlineSnapshot(
      `"/* sc-component-id:sc-global-1846532150 */"`
    );
  });

  it(`should warn when children are passed as props`, () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    const { render } = setup();
    const Component = createGlobalStyle`
      div {
        color: ${props => props.fg};
        background: ${props => props.bg};
      }
    `;
    render(
      <Component fg="red" bg="green">
        <div />
      </Component>
    );

    expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(
      `"The global style component sc-global-2176982909 was given child JSX. createGlobalStyle does not render children."`
    );
  });

  it('works with keyframes', () => {
    const { render } = setup();

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

    expect(getCSS(document).trim()).toMatchInlineSnapshot(`
      "/* sc-component-id:sc-global-1354462580 */
      div{display:inline-block;-webkit-animation:a 2s linear infinite;animation:a 2s linear infinite;padding:2rem 1rem;font-size:1.2rem;}
      /* sc-component-id:sc-keyframes-a */
      @-webkit-keyframes a{from{-webkit-transform:rotate(0deg);-ms-transform:rotate(0deg);transform:rotate(0deg);}to{-webkit-transform:rotate(360deg);-ms-transform:rotate(360deg);transform:rotate(360deg);}} @keyframes a{from{-webkit-transform:rotate(0deg);-ms-transform:rotate(0deg);transform:rotate(0deg);}to{-webkit-transform:rotate(360deg);-ms-transform:rotate(360deg);transform:rotate(360deg);}}"
    `);
  });

  it(`removes style tag in StyleSheetManager.target when unmounted after target detached and no other global styles`, () => {
    // Set DISABLE_SPEEDY flag to false to force using speedy tag
    const flag = constants.DISABLE_SPEEDY;
    constants.DISABLE_SPEEDY = false;

    // Create a clean container and window.scCGSHMRCache
    window.scCGSHMRCache = {};
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
    const style = styleContainer.firstChild;
    expect(style.sheet.cssRules[0].selectorText).toBe('[data-test-unmount-remove]');

    // detach container and unmount react component
    try {
      document.body.removeChild(container);
      document.body.removeChild(styleContainer);

      ReactDOM.unmountComponentAtNode(container);
    } catch(e) {
      fail('should not throw exception');
    }

    // Reset DISABLE_SPEEDY flag
    constants.DISABLE_SPEEDY = flag;
  });
});

function setup() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  return {
    container,
    render(comp) {
      ReactDOM.render(comp, container);
    },
    renderToString(comp) {
      return ReactDOMServer.renderToString(comp);
    },
    cleanup() {
      resetStyled();
      document.body.removeChild(container);
    },
  };
}
