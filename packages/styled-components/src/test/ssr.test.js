/**
 * @jest-environment node
 */
// @flow
import React from 'react';
import { renderToString, renderToNodeStream } from 'react-dom/server';
import ServerStyleSheet from '../models/ServerStyleSheet';
import { resetStyled, seedNextClassnames } from './utils';
import keyframes from '../constructors/keyframes';
import createGlobalStyle from '../constructors/createGlobalStyle';

jest.mock('../utils/nonce');

let styled;

describe('ssr', () => {
  beforeEach(() => {
    // eslint-disable-next-line
    require('../utils/nonce').mockReset();

    styled = resetStyled(true);
  });

  afterEach(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should extract the CSS in a simple case', () => {
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>));
    const css = sheet.getStyleTags();

    expect(html).toMatchSnapshot();
    expect(css).toMatchSnapshot();
  });

  it('should extract both global and local CSS', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Component />
          <Heading>Hello SSR!</Heading>
        </React.Fragment>
      )
    );
    const css = sheet.getStyleTags();

    expect(html).toMatchSnapshot();
    expect(css).toMatchSnapshot();
  });

  it('should not spill ServerStyleSheets into each other', () => {
    const A = styled.h1`
      color: red;
    `;
    const B = styled.h1`
      color: green;
    `;

    const sheetA = new ServerStyleSheet();
    renderToString(sheetA.collectStyles(<A />));
    const cssA = sheetA.getStyleTags();

    const sheetB = new ServerStyleSheet();
    renderToString(sheetB.collectStyles(<B />));
    const cssB = sheetB.getStyleTags();

    expect(cssA).toContain('red');
    expect(cssA).not.toContain('green');
    expect(cssB).not.toContain('red');
    expect(cssB).toContain('green');
  });

  it('should add a nonce to the stylesheet if webpack nonce is detected in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo');

    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Component />
          <Heading>Hello SSR!</Heading>
        </React.Fragment>
      )
    );
    const css = sheet.getStyleTags();

    expect(html).toMatchSnapshot();
    expect(css).toMatchSnapshot();
  });

  it('should render CSS in the order the components were defined, not rendered', () => {
    const ONE = styled.h1.withConfig({ componentId: 'ONE' })`
      color: red;
    `;
    const TWO = styled.h2.withConfig({ componentId: 'TWO' })`
      color: blue;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <div>
          <TWO />
          <ONE />
        </div>
      )
    );
    const css = sheet.getStyleTags();

    expect(html).toMatchSnapshot();
    expect(css).toMatchSnapshot();
  });

  it('should share global styles but keep renders separate', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const PageOne = styled.h1.withConfig({ componentId: 'PageOne' })`
      color: red;
    `;
    const PageTwo = styled.h2.withConfig({ componentId: 'PageTwo' })`
      color: blue;
    `;

    const sheetOne = new ServerStyleSheet();
    const htmlOne = renderToString(
      sheetOne.collectStyles(
        <React.Fragment>
          <Component />
          <PageOne>Camera One!</PageOne>
        </React.Fragment>
      )
    );
    const cssOne = sheetOne.getStyleTags();

    const sheetTwo = new ServerStyleSheet();
    const htmlTwo = renderToString(
      sheetTwo.collectStyles(
        <React.Fragment>
          <Component />
          <PageTwo>Camera Two!</PageTwo>
        </React.Fragment>
      )
    );
    const cssTwo = sheetTwo.getStyleTags();

    expect(htmlOne).toMatchSnapshot();
    expect(cssOne).toMatchSnapshot();
    expect(htmlTwo).toMatchSnapshot();
    expect(cssTwo).toMatchSnapshot();
  });

  it('should dispatch global styles to each ServerStyleSheet', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Header = styled.h1.withConfig({ componentId: 'Header' })`
      animation: ${props => props.animation} 1s both;
    `;

    seedNextClassnames(['keyframe_0']);

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Component />
          <Header animation={keyframes`0% { opacity: 0; }`} />
        </React.Fragment>
      )
    );
    const css = sheet.getStyleTags();

    expect(html).toMatchSnapshot();
    expect(css).toMatchSnapshot();
  });

  it('should return a generated React style element', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Component />
          <Heading>Hello SSR!</Heading>
        </React.Fragment>
      )
    );
    const elements = sheet.getStyleElement();

    expect(elements).toHaveLength(1);

    /* I know this looks pointless, but apparently I have the feeling we'll need this */
    expect(elements[0].props.dangerouslySetInnerHTML).toBeDefined();
    expect(elements[0].props.children).not.toBeDefined();

    expect(elements[0].props).toMatchSnapshot();
  });

  it('should return a generated React style element with nonce if webpack nonce is preset in the global scope', () => {
    // eslint-disable-next-line
    require('../utils/nonce').mockImplementation(() => 'foo');

    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Heading>Hello SSR!</Heading>
          <Component />
        </React.Fragment>
      )
    );
    const elements = sheet.getStyleElement();

    expect(elements).toHaveLength(1);
    expect(elements[0].props.nonce).toBe('foo');
  });

  it('should interleave styles with rendered HTML when utilitizing streaming', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const jsx = sheet.collectStyles(
      <React.Fragment>
        <Component />
        <Heading>Hello SSR!</Heading>
      </React.Fragment>
    );
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => {
        expect(received).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        resolve();
      });

      stream.on('error', reject);
    });
  });

  it('should interleave styles with rendered HTML when chunked streaming', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const Body = styled.div`
      color: blue;
    `;

    const SideBar = styled.div`
      color: yellow;
    `;

    const Footer = styled.div`
      color: green;
    `;

    const sheet = new ServerStyleSheet();
    const jsx = sheet.collectStyles(
      <React.Fragment>
        <Component />
        <Heading>Hello SSR!</Heading>
        <Body>
          {new Array(1000).fill(0).map((_, i) => (
            <div key={i}>*************************</div>
          ))}
        </Body>
        <SideBar>SideBar</SideBar>
        <Footer>Footer</Footer>
      </React.Fragment>
    );
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => {
        expect(received).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        expect(received).toMatch(/yellow/);
        expect(received).toMatch(/green/);
        resolve();
      });

      stream.on('error', reject);
    });
  });

  it('should handle errors while streaming', () => {
    const sheet = new ServerStyleSheet();
    const jsx = sheet.collectStyles(null);
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise((resolve, reject) => {
      stream.on('data', () => {});

      stream.on('error', err => {
        expect(err).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        resolve();
      });
    });
  });

  it('should not interleave style tags into textarea elements', () => {
    const StyledTextArea = styled.textarea`
      height: ${props => `${props.height}px`};
    `;

    const sheet = new ServerStyleSheet();

    // Currently we cannot set the chunk size to read with react renderToNodeStream, so to ensure
    // that multiple chunks are created, we initialize a large array of styled text areas.  We give
    // each textarea a different style to ensure a large enough number of style tags are generated
    // to be interleaved in the document
    const jsx = sheet.collectStyles(
      <React.Fragment>
        {new Array(500).fill(0).map((_, i) => (
          <StyledTextArea
            key={i}
            className="test-textarea"
            onChange={() => {}}
            value={`Textarea ${i}`}
            height={i}
          />
        ))}
      </React.Fragment>
    );

    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => {
        const styleTagsInsideTextarea = received.match(/<\/style>[^<]*<\/textarea>/g);

        expect(styleTagsInsideTextarea).toBeNull();
        resolve();
      });

      stream.on('error', reject);
    });
  });
});
