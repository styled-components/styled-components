/**
 * @jest-environment node
 */

import { resetStyled } from './utils';

import React from 'react';
import { renderToNodeStream, renderToString } from 'react-dom/server';
import stylisRTLPlugin from 'stylis-plugin-rtl';
import createGlobalStyle from '../constructors/createGlobalStyle';
import ServerStyleSheet from '../models/ServerStyleSheet';
import { StyleSheetManager } from '../models/StyleSheetManager';

jest.mock('../utils/nonce');

let styled: ReturnType<typeof resetStyled>;

describe('ssr', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    require('../utils/nonce').mockReset();

    styled = resetStyled(true);
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

  it('should emit nothing when no styles were generated', () => {
    styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    renderToString(sheet.collectStyles(<div />));

    const cssTags = sheet.getStyleTags();
    expect(cssTags).toBe('');

    const cssElements = sheet.getStyleElement();
    expect(cssElements).toEqual([]);
  });

  it('should emit global styles without any other components', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;

    const sheet = new ServerStyleSheet();
    renderToString(sheet.collectStyles(<Component />));

    const cssTags = sheet.getStyleTags();
    expect(cssTags).toMatchSnapshot();

    const cssElements = sheet.getStyleElement();
    expect(cssElements).toMatchSnapshot();
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

  it('should return a generated React style element', () => {
    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();

    renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Component />
          <Heading>Hello SSR!</Heading>
        </React.Fragment>
      )
    );

    const [element] = sheet.getStyleElement();

    expect(element.props.dangerouslySetInnerHTML).toBeDefined();
    expect(element.props.children).not.toBeDefined();
    expect(element.props).toMatchSnapshot();
  });

  it('should return a generated React style element with nonce if webpack nonce is preset in the global scope', () => {
    require('../utils/nonce').mockImplementation(() => 'foo');

    const Component = createGlobalStyle`
      body { background: papayawhip; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();

    renderToString(
      sheet.collectStyles(
        <React.Fragment>
          <Heading>Hello SSR!</Heading>
          <Component />
        </React.Fragment>
      )
    );

    const [element] = sheet.getStyleElement();
    expect(element.props.nonce).toBe('foo');
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
    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise<void>((resolve, reject) => {
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

    // This is the result of the above
    const expectedElements = '<div>*************************</div>'.repeat(100);

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

    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));
    const stream$ = new Promise<string>((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => resolve(received));
      stream.on('error', reject);
    });

    return stream$.then(received => {
      expect(sheet.sealed).toBe(true);
      expect(received.includes(expectedElements)).toBeTruthy();
      expect(received).toMatch(/yellow/);
      expect(received).toMatch(/green/);
    });
  });

  it('should handle errors while streaming', () => {
    function ExplodingComponent(): React.JSX.Element {
      throw new Error('ahhh');
    }

    const sheet = new ServerStyleSheet();
    const jsx = sheet.collectStyles(<ExplodingComponent />);
    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise<void>(resolve => {
      stream.on('data', () => {});

      stream.on('error', err => {
        expect(err).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        resolve();
      });
    });
  });

  it('should not interleave style tags into textarea elements', () => {
    const StyledTextArea = styled.textarea<{ height: number }>`
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

    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise<void>((resolve, reject) => {
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

  it('should throw if interleaveWithNodeStream is called twice', () => {
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

    expect(() =>
      // @ts-expect-error TODO ReadableStream vs Readable
      sheet.interleaveWithNodeStream(sheet.interleaveWithNodeStream(renderToNodeStream(jsx)))
    ).toThrowErrorMatchingSnapshot();
  });

  it('should throw if getStyleTags is called after interleaveWithNodeStream is called', () => {
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

    // @ts-expect-error TODO ReadableStream vs Readable
    sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    expect(sheet.getStyleTags).toThrowErrorMatchingSnapshot();
  });

  it('should throw if getStyleElement is called after interleaveWithNodeStream is called', () => {
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

    // @ts-expect-error TODO ReadableStream vs Readable
    sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    expect(sheet.getStyleElement).toThrowErrorMatchingSnapshot();
  });

  it('should throw if getStyleTags is called after streaming is complete', () => {
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
    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise<void>((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => {
        expect(received).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        expect(sheet.getStyleTags).toThrowErrorMatchingSnapshot();

        resolve();
      });

      stream.on('error', reject);
    });
  });

  it('should throw if getStyleElement is called after streaming is complete', () => {
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
    // @ts-expect-error TODO ReadableStream vs Readable
    const stream = sheet.interleaveWithNodeStream(renderToNodeStream(jsx));

    return new Promise<void>((resolve, reject) => {
      let received = '';

      stream.on('data', chunk => {
        received += chunk;
      });

      stream.on('end', () => {
        expect(received).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        expect(sheet.getStyleElement).toThrowErrorMatchingSnapshot();

        resolve();
      });

      stream.on('error', reject);
    });
  });

  it('should work with stylesheet manager and passed stylis plugins', () => {
    const Heading = styled.h1`
      padding-left: 5px;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <StyleSheetManager stylisPlugins={[stylisRTLPlugin]}>
          <Heading>Hello SSR!</Heading>
        </StyleSheetManager>
      )
    );
    const css = sheet.getStyleTags();

    expect(html).toMatchInlineSnapshot(`
      <h1 class="sc-a b">
        Hello SSR!
      </h1>
    `);
    expect(css).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{padding-right:5px;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
      </style>
    `);
  });
});
