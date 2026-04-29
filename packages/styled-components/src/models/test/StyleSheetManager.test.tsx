import '@testing-library/jest-dom';
import { act, render } from '@testing-library/react';
import React from 'react';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import rscPlugin from '../../plugins/rsc';
import StyleSheet from '../../sheet';
import { getCSS, resetStyled } from '../../test/utils';
import { StyleSheetManager } from '../StyleSheetManager';

let styled: ReturnType<typeof resetStyled>;

describe('StyleSheetManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    styled = resetStyled(true);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
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

  it('passing `enableVendorPrefixes` to StyleSheetManager is a no-op with a dev warning (v7)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Test = styled.div`
      display: flex;
    `;

    render(
      <StyleSheetManager enableVendorPrefixes>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
    `);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('enableVendorPrefixes` is not supported in v7')
    );
    warnSpy.mockRestore();
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

  it('passing stylis plugins via StyleSheetManager works', () => {
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

  it('changing stylis plugins via StyleSheetManager works', () => {
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

  it('subtrees with different stylis configs should not conflict', () => {
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
