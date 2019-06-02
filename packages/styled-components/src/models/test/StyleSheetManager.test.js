// @flow
/* eslint-disable react/prop-types */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { render } from 'react-dom';
import TestRenderer from 'react-test-renderer';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import stylisRTLPlugin from 'stylis-rtl';
import StyleSheetManager from '../StyleSheetManager';
import ServerStyleSheet from '../ServerStyleSheet';
import StyleSheet from '../../sheet';
import { resetStyled } from '../../test/utils';

let styled;
let consoleError;

const parallelWarning =
  'Warning: Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported.';

describe('StyleSheetManager', () => {
  consoleError = console.error;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';

    styled = resetStyled(true);

    jest
      .spyOn(console, 'error')
      .mockImplementation(msg => (msg !== parallelWarning ? consoleError(msg) : null));
  });

  it('should use given stylesheet instance', () => {
    const serverStyles = new ServerStyleSheet();
    const Title = styled.h1`
      color: palevioletred;
    `;
    renderToString(
      <StyleSheetManager sheet={serverStyles.sheet}>
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

    const styles = target.querySelector('style').textContent;

    expect(styles.includes(`palevioletred`)).toEqual(true);
  });

  it('should append style to given target in iframe', () => {
    const iframe = document.createElement('iframe');
    const app = document.createElement('div');

    document.body.appendChild(iframe);
    iframe.contentDocument.body.appendChild(app);

    const target = iframe.contentDocument.head;
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

    const styles = target.querySelector('style').textContent;
    expect(styles.includes(`palevioletred`)).toEqual(true);
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
    const SheetInjector = ({ children, target }) => (
      <StyleSheetManager target={target}>{children}</StyleSheetManager>
    );

    class Child extends React.Component {
      componentDidMount() {
        const styles = this.props.document.querySelector('style').textContent;
        expect(styles.includes(`palevioletred`)).toEqual(true);
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
                    <SheetInjector target={document.head}>
                      <Child document={document} resolve={resolveA} />
                    </SheetInjector>
                  )}
                </FrameContextConsumer>
              </Frame>
              <Frame>
                <FrameContextConsumer>
                  {({ document }) => (
                    <SheetInjector target={document.head}>
                      <Child document={document} resolve={resolveB} />
                    </SheetInjector>
                  )}
                </FrameContextConsumer>
              </Frame>
            </div>,
            div
          );
        } catch (e) {
          reject(e);
          div.parentElement.removeChild(div);
        }
      });
    });
    await Promise.all([promiseA, promiseB]);
    div.parentElement.removeChild(div);
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

  it('passing stylis options via StyleSheetManager works', () => {
    const Test = styled.div`
      display: flex;
    `;

    TestRenderer.create(
      <StyleSheetManager stylisOptions={{ prefix: false }}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(
      `"<style data-styled=\\"active\\" data-styled-version=\\"JEST_MOCK_VERSION\\">.sc-a{display:flex;}</style>"`
    );
  });

  it('passing stylis plugins via StyleSheetManager works', () => {
    const Test = styled.div`
      padding-left: 5px;
    `;

    TestRenderer.create(
      <StyleSheetManager stylusPlugins={[stylisRTLPlugin]}>
        <Test>Foo</Test>
      </StyleSheetManager>
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(
      `"<style data-styled=\\"active\\" data-styled-version=\\"JEST_MOCK_VERSION\\">.sc-a{padding-right:5px;}</style>"`
    );
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

    expect(outerSheet.getTag().tag.getRule(0)).toMatchInlineSnapshot(
      `".sc-a {padding-left: 5px;}"`
    );

    expect(document.head.innerHTML).toMatchInlineSnapshot(
      `"<style data-styled=\\"active\\" data-styled-version=\\"JEST_MOCK_VERSION\\"></style><style data-styled=\\"active\\" data-styled-version=\\"JEST_MOCK_VERSION\\">.sc-b{background:red;}</style>"`
    );
  });
});
