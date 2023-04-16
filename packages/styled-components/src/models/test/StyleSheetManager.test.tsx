import React from 'react';
import { render } from 'react-dom';
import { renderToString } from 'react-dom/server';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import TestRenderer, { act } from 'react-test-renderer';
import stylisRTLPlugin from 'stylis-plugin-rtl';
import StyleSheet from '../../sheet';
import { resetStyled } from '../../test/utils';
import ServerStyleSheet from '../ServerStyleSheet';
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

  it('should use given stylesheet instance', () => {
    const serverStyles = new ServerStyleSheet();
    const Title = styled.h1`
      color: palevioletred;
    `;
    renderToString(
      <StyleSheetManager sheet={serverStyles.instance}>
        <Title />
      </StyleSheetManager>
    );
    expect(serverStyles.getStyleTags().includes(`palevioletred`)).toEqual(true);
  });

  it('should render its child', () => {
    const target = document.head;

    const Title = styled.h1`
      color: palevioletred;
    `;
    const renderedComp = TestRenderer.create(
      <StyleSheetManager target={target}>
        <Title />
      </StyleSheetManager>
    );

    expect(() => renderedComp.root.findByType(Title)).not.toThrowError();
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

    TestRenderer.create(
      <StyleSheetManager target={target}>
        <Child />
      </StyleSheetManager>
    );

    const styles = target.querySelector('style')?.textContent;

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
      </StyleSheetManager>,
      app
    );

    const styles = target.querySelector('style')?.textContent;
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

    TestRenderer.create(
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

    expect(document.head.innerHTML).toMatchSnapshot();
    expect(document.body.innerHTML).toMatchSnapshot();
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
        const styles = this.props.document.querySelector('style')?.textContent;
        expect(styles?.includes(`palevioletred`)).toEqual(true);
        this.props.resolve();
      }

      render() {
        return <Title />;
      }
    }

    const div = document.body.appendChild(document.createElement('div'));

    let promiseB;

    const promiseA = new Promise((resolveA, reject) => {
      promiseB = new Promise(resolveB => {
        try {
          // Render two iframes. each iframe should have the styles for the child injected into their head
          render(
            <div>
              <Frame>
                <FrameContextConsumer>
                  {({ document }) => (
                    <SheetInjector target={document!.head}>
                      <Child document={document!} resolve={resolveA} />
                    </SheetInjector>
                  )}
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
            </div>,
            div
          );
        } catch (e) {
          reject(e);
          div.parentElement!.removeChild(div);
        }
      });
    });
    await Promise.all([promiseA, promiseB]);
    div.parentElement!.removeChild(div);
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

    class Main extends React.Component<{ document: Document }> {
      componentDidMount() {
        const styles = this.props.document.querySelector('style')?.textContent;
        expect(styles?.includes('palevioletred')).toEqual(true);
      }

      render() {
        return this.props.children;
      }
    }

    class Child extends React.Component<{ document: Document }> {
      componentDidMount() {
        const styles = this.props.document.querySelector('style')?.textContent;
        expect(styles?.includes(`palevioletred`)).toEqual(true);
      }

      render() {
        return <CommonTitle />;
      }
    }

    const div = document.body.appendChild(document.createElement('div'));

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
      </Main>,
      div
    );

    div.parentElement!.removeChild(div);
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
    const attachPoint = document.body.appendChild(document.createElement('div'));
    render(<App />, attachPoint);
    // window.getComputedStyles would be perfect, but it seems that JSDOM
    // implementation of that function isn't complete, so need to work around
    // it.
    const source = document.documentElement.outerHTML;
    // regex in case test is run against minified CSS in the future
    const indexOfRedStyle = source.search('color:red');
    const indexOfBlueStyle = source.search('color:blue');
    expect(indexOfRedStyle).toBeGreaterThanOrEqual(0);
    expect(indexOfBlueStyle).toBeGreaterThanOrEqual(0);
    expect(indexOfBlueStyle).toBeGreaterThan(indexOfRedStyle);
  });

  it('passing `enableVendorPrefixes` to StyleSheetManager works', () => {
    const Test = styled.div`
      display: flex;
    `;

    TestRenderer.create(
      <StyleSheetManager enableVendorPrefixes>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{display:-webkit-box;display:-webkit-flex;display:-ms-flexbox;display:flex;}
      </style>
    `);
  });

  it('passing default shouldForwardProp via StyleSheetManager works', () => {
    const Test = styled.div<{ foo?: boolean; bar?: boolean }>`
      padding-left: 5px;
    `;

    const result = TestRenderer.create(
      <StyleSheetManager shouldForwardProp={p => (p === 'foo' ? false : true)}>
        <Test foo bar>
          Foo
        </Test>
      </StyleSheetManager>
    );

    expect(result.toJSON()).toMatchInlineSnapshot(`
      <div
        bar={true}
        className="sc-a b"
      >
        Foo
      </div>
    `);
  });

  it('passing stylis plugins via StyleSheetManager works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    TestRenderer.create(
      <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{padding-right:5px;}
      </style>
    `);
  });

  it('an error is emitted if unnamed stylis plugins are provided', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const cachedName = stylisRTLPlugin.name;
    Object.defineProperty(stylisRTLPlugin, 'name', { value: undefined });

    expect(() =>
      TestRenderer.create(
        <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
          <Test>Foo</Test>
        </StyleSheetManager>
      )
    ).toThrowError();

    Object.defineProperty(stylisRTLPlugin, 'name', { value: cachedName });
  });

  it('changing stylis plugins via StyleSheetManager works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const wrapper = TestRenderer.create(
      <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{padding-right:5px;}
      </style>
    `);

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
            <div
              className="sc-a b"
            >
              Foo
            </div>
        `);

    act(() => {
      wrapper.update(
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
        .b{padding-right:5px;}.c{padding-left:5px;}
      </style>
    `);

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
            <div
              className="sc-a c"
            >
              Foo
            </div>
        `);

    act(() => {
      wrapper.update(
        <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
          <Test>Foo</Test>
        </StyleSheetManager>
      );
    });

    // no new dynamic classes are added, reusing the prior one
    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{padding-right:5px;}.c{padding-left:5px;}
      </style>
    `);

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
            <div
              className="sc-a b"
            >
              Foo
            </div>
        `);
  });

  it('subtrees with different stylis configs should not conflict', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const wrapper = TestRenderer.create(
      <div>
        <Test>Bar</Test>
        <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
          <Test>Foo</Test>
        </StyleSheetManager>
      </div>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{padding-left:5px;}.c{padding-right:5px;}
      </style>
    `);

    expect(wrapper.toJSON()).toMatchInlineSnapshot(`
      <div>
        <div
          className="sc-a b"
        >
          Bar
        </div>
        <div
          className="sc-a c"
        >
          Foo
        </div>
      </div>
    `);
  });

  it('nested StyleSheetManager with different injection modes works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    const Test2 = styled.div`
      background: red;
    `;

    const outerSheet = new StyleSheet({ useCSSOMInjection: true });

    TestRenderer.create(
      <StyleSheetManager sheet={outerSheet}>
        <div>
          <Test>Foo</Test>
          <StyleSheetManager disableCSSOMInjection>
            <Test2>Bar</Test2>
          </StyleSheetManager>
        </div>
      </StyleSheetManager>
    );

    expect(outerSheet.getTag().tag.getRule(0)).toMatchInlineSnapshot(`".c {padding-left: 5px;}"`);

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
      </style>
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .d{background:red;}
      </style>
    `);
  });

  it('passing a namespace to StyleSheetManager works', () => {
    const Test = styled.div`
      display: flex;
    `;

    TestRenderer.create(
      <StyleSheetManager namespace="#foo">
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(`
      <style data-styled="active"
             data-styled-version="JEST_MOCK_VERSION"
      >
        #foo .b{display:flex;}
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

    TestRenderer.create(
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
        #foo .c{padding-left:5px;}#bar .d{background:red;}
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

    TestRenderer.create(
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
        .parent .b{padding-top:5px;}.parent .child .b{padding-top:10px;}
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

    TestRenderer.create(
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
        .parent .b{color:red;}.parent .child2 .b,.parent .child .b{color:green;}
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

    TestRenderer.create(
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
        .parent .b{color:red;}.parent .child2 .b,.parent .child .b{color:green;}@media (min-width: 768px){.parent .b{color:blue;}.parent .child2 .b,.parent .child .b{color:cyan;}}
      </style>
    `);
  });
});
