import '@testing-library/jest-dom';
import { act, render } from '@testing-library/react';
import React from 'react';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import { renderToString } from 'react-dom/server';
import rscPlugin from '../../plugins/rsc';
import StyleSheet from '../../sheet';
import { getCSS, resetStyled } from '../../test/utils';
// After `test/utils`, which mocks the class name generator for modules loaded later.
import createGlobalStyle from '../../constructors/createGlobalStyle';
import { resetWarnOnce } from '../../utils/warnOnce';
import ServerStyleSheet from '../ServerStyleSheet';
import {
  StyleSheetManager,
  configureServerStyles,
  mainCompiler,
  useStyleSheetContext,
} from '../StyleSheetManager';

let styled: ReturnType<typeof resetStyled>;

describe('StyleSheetManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    styled = resetStyled(true);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('warns once that configureServerStyles does nothing in the browser build, and leaves client styling alone', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    configureServerStyles({ plugins: [rscPlugin] });
    configureServerStyles({ plugins: [rscPlugin] });

    expect(warn.mock.calls).toEqual([
      [
        '[sc] configureServerStyles has no effect in the browser. Call it at the top level of a server component module, such as the root layout in Next.js, never from a client component or code bundled for the browser.',
      ],
    ]);

    const Item = styled.li`
      &:first-child {
        color: red;
      }
    `;
    render(<Item />);

    expect(getCSS(document)).not.toContain(':not(style');
  });

  it('should render its child', () => {
    const target = document.head;

    const Title = styled.h1`
      color: palevioletred;
    `;
    const renderedComp = render(
      <StyleSheetManager target={target}>
        <Title data-testid="subject" />
      </StyleSheetManager>
    );

    expect(renderedComp.getByTestId('subject')).toHaveAttribute('data-testid', 'subject');
  });

  it('should append style to given target', () => {
    const target = document.body;
    const Title = styled.h1`
      color: palevioletred;
    `;
    class Child extends React.Component {
      render() {
        return <Title />;
      }
    }

    expect(document.body.querySelectorAll('style')).toHaveLength(0);

    render(
      <StyleSheetManager target={target}>
        <Child />
      </StyleSheetManager>
    );

    const styles = getCSS(target);

    expect(styles?.includes(`palevioletred`)).toEqual(true);
  });

  it('should append style to given target in iframe', () => {
    const iframe = document.createElement('iframe');
    const app = document.createElement('div');

    document.body.appendChild(iframe);
    iframe.contentDocument!.body.appendChild(app);

    const target = iframe.contentDocument!.head;
    const Title = styled.h1`
      color: palevioletred;
    `;

    class Child extends React.Component {
      render() {
        return <Title />;
      }
    }

    render(
      <StyleSheetManager target={target}>
        <Child />
      </StyleSheetManager>
    );

    const styles = getCSS(target);
    expect(styles?.includes(`palevioletred`)).toEqual(true);
  });

  it('should apply styles to appropriate targets for nested StyleSheetManagers', () => {
    const ONE = styled.h1`
      color: red;
    `;
    const TWO = styled.h2`
      color: blue;
    `;
    const THREE = styled.h3`
      color: green;
    `;

    render(
      <div>
        <ONE />
        <StyleSheetManager target={document.head}>
          <div>
            <TWO />
            <StyleSheetManager target={document.body}>
              <THREE />
            </StyleSheetManager>
          </div>
        </StyleSheetManager>
      </div>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
    expect(document.body.innerHTML).toMatchInlineSnapshot(`
      <div>
        <div>
          <h1 class="sc-a d">
          </h1>
          <div>
            <h2 class="sc-b e">
            </h2>
            <h3 class="sc-c f">
            </h3>
          </div>
        </div>
      </div>
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  // https://github.com/styled-components/styled-components/issues/1634
  it('should inject styles into two parallel contexts', async () => {
    const Title = styled.h1`
      color: palevioletred;
    `;

    // Injects the stylesheet into the document available via context
    const SheetInjector = ({ children, target }: any) => (
      <StyleSheetManager target={target}>{children}</StyleSheetManager>
    );

    class Child extends React.Component<{ document: Document; resolve: Function }> {
      componentDidMount() {
        const styles = getCSS(this.props.document);
        expect(styles?.includes(`palevioletred`)).toEqual(true);
        this.props.resolve();
      }

      render() {
        return <Title />;
      }
    }

    let promiseB;

    const promiseA = new Promise((resolveA, reject) => {
      promiseB = new Promise(resolveB => {
        // Render two iframes. each iframe should have the styles for the child injected into their head
        render(
          <div>
            <Frame>
              <FrameContextConsumer>
                {({ document }) => {
                  return (
                    <SheetInjector target={document!.head}>
                      <Child document={document!} resolve={resolveA} />
                    </SheetInjector>
                  );
                }}
              </FrameContextConsumer>
            </Frame>
            <Frame>
              <FrameContextConsumer>
                {({ document }) => (
                  <SheetInjector target={document!.head}>
                    <Child document={document!} resolve={resolveB} />
                  </SheetInjector>
                )}
              </FrameContextConsumer>
            </Frame>
          </div>
        );
      });
    });
    await Promise.all([promiseA, promiseB]);
  });

  // https://github.com/styled-components/styled-components/issues/2973
  it('should inject common styles into both the main document and a child frame', async () => {
    const CommonTitle = styled.h1`
      color: palevioletred;
    `;

    // Injects the stylesheet into the document available via context
    const SheetInjector = ({ children, target }: any) => (
      <StyleSheetManager target={target}>{children}</StyleSheetManager>
    );

    class Main extends React.Component<React.PropsWithChildren<{ document: Document }>> {
      componentDidMount() {
        const styles = getCSS(this.props.document);
        expect(styles?.includes('palevioletred')).toEqual(true);
      }

      render() {
        return this.props.children;
      }
    }

    class Child extends React.Component<{ document: Document }> {
      componentDidMount() {
        const styles = getCSS(this.props.document);
        expect(styles?.includes(`palevioletred`)).toEqual(true);
      }

      render() {
        return <CommonTitle />;
      }
    }

    render(
      <Main document={document}>
        <div>
          <CommonTitle />
          <Frame>
            <FrameContextConsumer>
              {({ document }) => (
                <SheetInjector target={document!.head}>
                  <Child document={document!} />
                </SheetInjector>
              )}
            </FrameContextConsumer>
          </Frame>
        </div>
      </Main>
    );
  });

  it('should render styles in correct order when styled(StyledComponent) and StyleSheetManager is used', () => {
    const Red = styled.div`
      color: red;
    `;
    const RedChangedToBlue = styled(Red)`
      color: blue;
    `;
    const sheet = new StyleSheet();
    const App = () => (
      <StyleSheetManager sheet={sheet}>
        <RedChangedToBlue>I should be blue</RedChangedToBlue>
      </StyleSheetManager>
    );
    render(<App />);
    // window.getComputedStyles would be perfect, but it seems that JSDOM
    // implementation of that function isn't complete, so need to work around
    // it. CSSOM-injected rules don't appear in outerHTML, so walk the live sheet.
    const source = getCSS(document);
    // regex in case test is run against minified CSS in the future
    const indexOfRedStyle = source.search(/color:\s*red/);
    const indexOfBlueStyle = source.search(/color:\s*blue/);
    expect(indexOfRedStyle).toBeGreaterThanOrEqual(0);
    expect(indexOfBlueStyle).toBeGreaterThanOrEqual(0);
    expect(indexOfBlueStyle).toBeGreaterThan(indexOfRedStyle);
  });

  it('passing default shouldForwardProp via StyleSheetManager works', () => {
    const Test = styled.div<{ foo?: boolean; bar?: boolean }>`
      padding-left: 5px;
    `;

    const result = render(
      <StyleSheetManager shouldForwardProp={p => (p === 'foo' ? false : true)}>
        <Test foo bar>
          Foo
        </Test>
      </StyleSheetManager>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a b"
        >
          Foo
        </div>
      </DocumentFragment>
    `);
  });

  it('passing plugins via StyleSheetManager works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    render(
      <StyleSheetManager plugins={[rscPlugin]}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  it('changing plugins via StyleSheetManager works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const wrapper = render(
      <StyleSheetManager plugins={[rscPlugin]}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);

    expect(wrapper.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a b"
        >
          Foo
        </div>
      </DocumentFragment>
    `);

    act(() => {
      wrapper.rerender(
        <StyleSheetManager>
          <Test>Foo</Test>
        </StyleSheetManager>
      );
    });

    // note that the old styles are not removed since the condition may appear where they're used again
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);

    expect(wrapper.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a c"
        >
          Foo
        </div>
      </DocumentFragment>
    `);

    act(() => {
      wrapper.rerender(
        <StyleSheetManager plugins={[rscPlugin]}>
          <Test>Foo</Test>
        </StyleSheetManager>
      );
    });

    // no new dynamic classes are added, reusing the prior one
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);

    expect(wrapper.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div
          class="sc-a b"
        >
          Foo
        </div>
      </DocumentFragment>
    `);
  });

  describe('plugins that share a name', () => {
    function BoxFactory() {
      return styled.div`
        color: Red;
      `;
    }

    it('warns in development when two different plugins share a name', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'p',
      };
      const lower = {
        decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
        name: 'p',
      };
      const Box = BoxFactory();

      render(
        <>
          <StyleSheetManager plugins={[upper]}>
            <Box>A</Box>
          </StyleSheetManager>
          <StyleSheetManager plugins={[lower]}>
            <Box>B</Box>
          </StyleSheetManager>
        </>
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        '[sc] plugin name "p" is used by two different plugins. Every subtree using that name gets the same class, and the first one to render supplies the CSS for all of them. Give each plugin a distinct name.'
      );
    });

    it('warns when one plugins array holds two plugins with the same name', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'p',
      };
      const lower = {
        decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
        name: 'p',
      };
      const Box = BoxFactory();

      render(
        <StyleSheetManager plugins={[upper, lower]}>
          <Box>A</Box>
        </StyleSheetManager>
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(console.warn).toHaveBeenCalledWith(
        '[sc] plugin name "p" is used by two different plugins. Every subtree using that name gets the same class, and the first one to render supplies the CSS for all of them. Give each plugin a distinct name.'
      );
    });

    it('warns once for a repeated name', () => {
      const Box = BoxFactory();
      const renderPair = () => {
        const upper = {
          decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
          name: 'p',
        };
        const lower = {
          decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
          name: 'p',
        };
        render(
          <>
            <StyleSheetManager plugins={[upper]}>
              <Box>A</Box>
            </StyleSheetManager>
            <StyleSheetManager plugins={[lower]}>
              <Box>B</Box>
            </StyleSheetManager>
          </>
        );
      };

      renderPair();
      renderPair();

      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('does not warn when the same plugin object is used in two managers', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'p',
      };
      const Box = BoxFactory();

      render(
        <>
          <StyleSheetManager plugins={[upper]}>
            <Box>A</Box>
          </StyleSheetManager>
          <StyleSheetManager plugins={[upper]}>
            <Box>B</Box>
          </StyleSheetManager>
        </>
      );

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not warn when plugin names differ', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'upper',
      };
      const lower = {
        decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
        name: 'lower',
      };
      const Box = BoxFactory();

      render(
        <>
          <StyleSheetManager plugins={[upper]}>
            <Box>A</Box>
          </StyleSheetManager>
          <StyleSheetManager plugins={[lower]}>
            <Box>B</Box>
          </StyleSheetManager>
        </>
      );

      expect(console.warn).not.toHaveBeenCalled();
    });

    it('does not warn when same-named plugins sit under different namespaces', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'p',
      };
      const lower = {
        decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
        name: 'p',
      };
      const Box = BoxFactory();

      render(
        <>
          <StyleSheetManager namespace="#a" plugins={[upper]}>
            <Box>A</Box>
          </StyleSheetManager>
          <StyleSheetManager namespace="#b" plugins={[lower]}>
            <Box>B</Box>
          </StyleSheetManager>
        </>
      );

      expect(console.warn).not.toHaveBeenCalled();
      const css = getCSS(document);
      expect(css).toMatch(/#a \.[\w-]+\{color:RED;\}/);
      expect(css).toMatch(/#b \.[\w-]+\{color:red;\}/);
    });

    it('warns when same-named plugins share a namespace', () => {
      const upper = {
        decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
        name: 'p',
      };
      const lower = {
        decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
        name: 'p',
      };
      const Box = BoxFactory();

      render(
        <>
          <StyleSheetManager namespace="#a" plugins={[upper]}>
            <Box>A</Box>
          </StyleSheetManager>
          <StyleSheetManager namespace="#a" plugins={[lower]}>
            <Box>B</Box>
          </StyleSheetManager>
        </>
      );

      expect(console.warn).toHaveBeenCalledTimes(1);
    });

    it('does not warn in production', () => {
      (global as { __DEV__: boolean }).__DEV__ = false;
      try {
        const upper = {
          decl: (prop: string, value: string) => ({ prop, value: value.toUpperCase() }),
          name: 'p',
        };
        const lower = {
          decl: (prop: string, value: string) => ({ prop, value: value.toLowerCase() }),
          name: 'p',
        };
        const Box = BoxFactory();

        render(
          <>
            <StyleSheetManager plugins={[upper]}>
              <Box>A</Box>
            </StyleSheetManager>
            <StyleSheetManager plugins={[lower]}>
              <Box>B</Box>
            </StyleSheetManager>
          </>
        );

        expect(console.warn).not.toHaveBeenCalled();
      } finally {
        (global as { __DEV__: boolean }).__DEV__ = true;
      }
    });
  });

  it('subtrees with different StyleSheetManager configs should not conflict', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const wrapper = render(
      <div>
        <Test>Bar</Test>
        <StyleSheetManager plugins={[rscPlugin]}>
          <Test>Foo</Test>
        </StyleSheetManager>
      </div>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);

    expect(wrapper.asFragment()).toMatchInlineSnapshot(`
      <DocumentFragment>
        <div>
          <div
            class="sc-a b"
          >
            Bar
          </div>
          <div
            class="sc-a c"
          >
            Foo
          </div>
        </div>
      </DocumentFragment>
    `);
  });

  it('passing a namespace to StyleSheetManager works', () => {
    const Test = styled.div`
      display: flex;
    `;

    render(
      <StyleSheetManager namespace="#foo">
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  it('nested StyleSheetManager with different namespaces works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const Test2 = styled.div`
      background: red;
    `;

    render(
      <StyleSheetManager namespace="#foo">
        <div>
          <Test>Foo</Test>
          <StyleSheetManager namespace="#bar">
            <Test2>Bar</Test2>
          </StyleSheetManager>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  it('namespaced StyleSheetManager works with ampersand selector', () => {
    const Test = styled.div`
      padding-top: 5px;
      .child & {
        padding-top: 10px;
      }
    `;

    render(
      <StyleSheetManager namespace=".parent">
        <div>
          <Test>Foo</Test>
          <div className="child">
            <Test>Foo Bar</Test>
          </div>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  it('namespaced StyleSheetManager works with ampersand selector (complex)', () => {
    const Test = styled.div`
      color: red;
      .child2 &,
      .child & {
        color: green;
      }
    `;

    render(
      <StyleSheetManager namespace=".parent">
        <div>
          <Test>Foo</Test>
          <div className="child">
            <Test>Foo Bar</Test>
          </div>
          <div className="child2">
            <Test>Foo Bar</Test>
          </div>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  it('namespaced StyleSheetManager works with ampersand selector and media queries', () => {
    const Test = styled.div`
      color: red;
      .child2 &,
      .child & {
        color: green;
      }
      @media (min-width: 768px) {
        color: blue;
        .child2 &,
        .child & {
          color: cyan;
        }
      }
    `;

    render(
      <StyleSheetManager namespace=".parent">
        <div>
          <Test>Foo</Test>
          <div className="child">
            <Test>Foo Bar</Test>
          </div>
          <div className="child2">
            <Test>Foo Bar</Test>
          </div>
        </div>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
  });

  describe('namespace inheritance', () => {
    const className = (element: Element | null): string | undefined =>
      element?.className.split(' ').pop();

    it('gives a nested manager that sets only plugins its parent namespace, and the class the parent gives', () => {
      const Test = styled.div`
        color: red;
      `;

      const { getByTestId } = render(
        <>
          <StyleSheetManager namespace="#foo">
            <Test data-testid="direct" />
          </StyleSheetManager>
          <StyleSheetManager namespace="#foo">
            <StyleSheetManager plugins={[]}>
              <Test data-testid="nested" />
            </StyleSheetManager>
          </StyleSheetManager>
        </>
      );

      const directClass = className(getByTestId('direct'));

      expect(className(getByTestId('nested'))).toBe(directClass);
      expect(getCSS(document)).toBe(`#foo .${directClass}{color:red;}`);
    });

    it('lets a nested manager clear the parent namespace with an empty one', () => {
      const Test = styled.div`
        color: red;
      `;

      const { getByTestId } = render(
        <StyleSheetManager namespace="#foo">
          <StyleSheetManager namespace="">
            <Test data-testid="subject" />
          </StyleSheetManager>
        </StyleSheetManager>
      );

      expect(getCSS(document)).toBe(`.${className(getByTestId('subject'))}{color:red;}`);
    });

    it('lets a nested manager replace the parent namespace with its own', () => {
      const Test = styled.div`
        color: red;
      `;

      const { getByTestId } = render(
        <StyleSheetManager namespace="#foo">
          <StyleSheetManager namespace="#bar">
            <Test data-testid="subject" />
          </StyleSheetManager>
        </StyleSheetManager>
      );

      expect(getCSS(document)).toBe(`#bar .${className(getByTestId('subject'))}{color:red;}`);
    });

    it('keeps the namespace through a manager that sets only a target', () => {
      const Test = styled.div`
        color: red;
      `;

      const { getByTestId } = render(
        <StyleSheetManager namespace="#foo">
          <StyleSheetManager target={document.body}>
            <Test data-testid="subject" />
          </StyleSheetManager>
        </StyleSheetManager>
      );

      expect(getCSS(document)).toBe(`#foo .${className(getByTestId('subject'))}{color:red;}`);
    });

    it.each([
      ['an empty namespace', { namespace: '' }],
      ['an empty namespace and no plugins', { namespace: '', plugins: [] }],
      ['no plugins and no namespace', { plugins: [] }],
    ])('gives a manager with %s the default compiler', (_, props) => {
      let compiler: unknown;
      const Reader = () => {
        compiler = useStyleSheetContext().compiler;

        return null;
      };

      render(
        <StyleSheetManager {...props}>
          <Reader />
        </StyleSheetManager>
      );

      expect(compiler).toBe(mainCompiler);
    });

    it('keeps a nested manager that clears its namespace on the default compiler, under a namespaced parent', () => {
      let compiler: unknown;
      const Reader = () => {
        compiler = useStyleSheetContext().compiler;

        return null;
      };

      render(
        <StyleSheetManager namespace="#foo">
          <StyleSheetManager namespace="">
            <Reader />
          </StyleSheetManager>
        </StyleSheetManager>
      );

      expect(compiler).toBe(mainCompiler);
    });
  });

  it('reaches root-anchored selectors when the namespace sits on the root element', () => {
    const Card = styled.li`
      view-transition-name: card;
      html.dark & {
        color: white;
      }
    `;
    const Global = createGlobalStyle`
      :root {
        --primary: red;
      }
      html,
      body {
        margin: 0;
      }
      ::view-transition-group(*${Card}) {
        animation-duration: 400ms;
      }
    `;

    const sheet = new ServerStyleSheet();
    renderToString(
      sheet.collectStyles(
        <StyleSheetManager namespace="#app">
          <Global />
          <Card />
        </StyleSheetManager>
      )
    );
    const tags = sheet.getStyleTags();
    sheet.seal();

    expect(tags).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        #app .c {view-transition-name: card; view-transition-class: sc-a;}/*!sc*/
      html#app.dark .c {color: white;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"c,"}/*!sc*/
      :root#app {--primary: red;}/*!sc*/
      html#app,#app body {margin: 0;}/*!sc*/
      :is(#app,#app *)::view-transition-group(*.sc-a) {animation-duration: 400ms;}/*!sc*/
      data-styled.g2[id="sc-global-b"]{content:"sc-global-b,"}/*!sc*/
      </style>
    `);
  });

  it('should apply nonce to injected style tags', () => {
    const Comp = styled.div`
      color: red;
    `;

    render(
      <StyleSheetManager nonce="test-nonce-123">
        <Comp />
      </StyleSheetManager>
    );

    const style = document.head.querySelector('style[data-styled]');
    expect(style).not.toBeNull();
    expect(style!.getAttribute('nonce')).toBe('test-nonce-123');
  });

  it('should apply different nonces to nested StyleSheetManagers', () => {
    const Outer = styled.div`
      color: blue;
    `;
    const Inner = styled.div`
      color: green;
    `;

    render(
      <StyleSheetManager nonce="outer-nonce" target={document.head}>
        <Outer />
        <StyleSheetManager nonce="inner-nonce" target={document.body}>
          <Inner />
        </StyleSheetManager>
      </StyleSheetManager>
    );

    const headStyle = document.head.querySelector('style[data-styled]');
    const bodyStyle = document.body.querySelector('style[data-styled]');

    expect(headStyle!.getAttribute('nonce')).toBe('outer-nonce');
    expect(bodyStyle!.getAttribute('nonce')).toBe('inner-nonce');
  });
});
