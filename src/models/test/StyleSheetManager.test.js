// @flow
/* eslint-disable react/no-multi-comp */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { render } from 'react-dom';
import TestRenderer from 'react-test-renderer';
import StyleSheetManager from '../StyleSheetManager';
import ServerStyleSheet from '../ServerStyleSheet';
import StyleSheet from '../StyleSheet';
import { resetStyled } from '../../test/utils';
import Frame, { FrameContextConsumer } from 'react-frame-component';

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
    const sheet = new ServerStyleSheet();
    const Title = styled.h1`
      color: palevioletred;
    `;
    renderToString(
      <StyleSheetManager sheet={sheet.instance}>
        <Title />
      </StyleSheetManager>
    );
    expect(sheet.getStyleTags().includes(`palevioletred`)).toEqual(true);
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

    let promiseA, promiseB;
    promiseA = new Promise((resolveA, reject) => {
      promiseB = new Promise((resolveB, reject) => {
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

  describe('ssr', () => {
    it('should extract CSS outside the nested StyleSheetManager', () => {
      const sheet = new ServerStyleSheet();
      const ONE = styled.h1`
        color: red;
      `;
      const TWO = styled.h2`
        color: blue;
      `;
      class Wrapper extends React.Component {
        state = {
          targetRef: null,
        };
        render() {
          return (
            <div
              ref={el => {
                this.setState({ targetRef: el });
              }}
            >
              {this.state.targetRef && (
                <StyleSheetManager target={this.state.targetRef}>
                  <TWO />
                </StyleSheetManager>
              )}
            </div>
          );
        }
      }

      const html = renderToString(
        <StyleSheetManager sheet={sheet.instance}>
          <div>
            <ONE />
            <Wrapper />
          </div>
        </StyleSheetManager>
      );
      const css = sheet.getStyleTags();

      expect(html).toMatchSnapshot();
      expect(css).toMatchSnapshot();
    });
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
});
