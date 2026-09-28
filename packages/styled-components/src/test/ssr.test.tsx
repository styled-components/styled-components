/**
 * @jest-environment node
 */

import { resetStyled } from './utils';

import { tokenize, TokenType } from '@csstools/css-tokenizer';
import React from 'react';
import { renderToPipeableStream, renderToString } from 'react-dom/server';
// `renderToNodeStream` was removed in React 19. SC still supports its SSR
// pipeline via `renderToPipeableStream`; the legacy tests below are gated on
// whether the function is present, so they silently skip in R19 test runs.
const renderToNodeStream: typeof renderToPipeableStream | undefined = (
  require('react-dom/server') as any
).renderToNodeStream;
import stylisRTLPlugin from 'stylis-plugin-rtl';
import { ThemeProvider } from '../base';
import css from '../constructors/css';
import createGlobalStyle from '../constructors/createGlobalStyle';
import keyframes from '../constructors/keyframes';
import ServerStyleSheet from '../models/ServerStyleSheet';
import { StyleSheetManager, mainCompiler } from '../models/StyleSheetManager';
import WebGlobalStyle from '../models/WebGlobalStyle';
import StyleSheet from '../sheet';

jest.mock('../utils/nonce', () => {
  const mock = jest.fn(() => null);
  return { __esModule: true, default: mock, resetNonceCache: jest.fn() };
});

let styled: ReturnType<typeof resetStyled>;

// Test helper to run streaming tests with both stream types (legacy
// renderToNodeStream was removed in React 19 and is skipped when absent).
const streamingTestCases = (
  [
    renderToNodeStream
      ? { name: 'renderToNodeStream (legacy)', renderFn: renderToNodeStream }
      : null,
    { name: 'renderToPipeableStream', renderFn: renderToPipeableStream },
  ] as const
).filter(Boolean) as { name: string; renderFn: typeof renderToPipeableStream }[];

/**
 * Helper function to create parameterized streaming tests
 */
function describeStreamingTests(
  testName: string,
  testFn: (
    renderFn: typeof renderToNodeStream | typeof renderToPipeableStream,
    streamType: string
  ) => void
) {
  describe(testName, () => {
    streamingTestCases.forEach(({ name, renderFn }) => {
      it(`with ${name}`, () => testFn(renderFn, name));
    });
  });
}

describe('ssr', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    require('../utils/nonce').default.mockReset();

    styled = resetStyled(true);
  });

  it('should extract the CSS in a simple case', () => {
    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(sheet.collectStyles(<Heading>Hello SSR!</Heading>));
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
        .b{color:red;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
      </style>
    `);
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

    expect(html).toMatchInlineSnapshot(`
      <h1 class="sc-b c">
        Hello SSR!
      </h1>
    `);
    expect(css).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        body{background:papayawhip;}/*!sc*/
      data-styled.g1[id="sc-global-a"]{content:"sc-global-a,"}/*!sc*/
      .c{color:red;}/*!sc*/
      data-styled.g2[id="sc-b"]{content:"c,"}/*!sc*/
      </style>
    `);
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
    expect(cssTags).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        body{background:papayawhip;}/*!sc*/
      data-styled.g1[id="sc-global-a"]{content:"sc-global-a,"}/*!sc*/
      </style>
    `);

    const cssElements = sheet.getStyleElement();
    expect(cssElements).toMatchInlineSnapshot(`
      [
        {
          "$$typeof": Symbol(react.transitional.element),
          "_owner": null,
          "_store": {},
          "key": "sc-0-0",
          "props": {
            "dangerouslySetInnerHTML": {
              "__html": "body{background:papayawhip;}/*!sc*/
      data-styled.g1[id="sc-global-a"]{content:"sc-global-a,"}/*!sc*/
      ",
            },
            "data-styled": "",
            "data-styled-version": "JEST_MOCK_VERSION",
          },
          "type": "style",
        },
      ]
    `);
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

    expect(cssA).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .c{color:red;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"c,"}/*!sc*/
      </style>
    `);
    expect(cssA).not.toContain('green');
    expect(cssB).not.toContain('red');
    expect(cssB).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .d{color:green;}/*!sc*/
      data-styled.g2[id="sc-b"]{content:"d,"}/*!sc*/
      </style>
    `);
  });

  it('should add a nonce to the stylesheet if webpack nonce is detected in the global scope', () => {
    require('../utils/nonce').default.mockImplementation(() => 'foo');

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

    expect(html).toMatchInlineSnapshot(`
      <h1 class="sc-b c">
        Hello SSR!
      </h1>
    `);
    expect(css).toMatchInlineSnapshot(`
      <style nonce="foo"
             data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        body{background:papayawhip;}/*!sc*/
      data-styled.g1[id="sc-global-a"]{content:"sc-global-a,"}/*!sc*/
      .c{color:red;}/*!sc*/
      data-styled.g2[id="sc-b"]{content:"c,"}/*!sc*/
      </style>
    `);
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

    expect(html).toMatchInlineSnapshot(`
      <div>
        <h2 class="TWO a">
        </h2>
        <h1 class="ONE b">
        </h1>
      </div>
    `);
    expect(css).toMatchInlineSnapshot(`
      <style data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{color:red;}/*!sc*/
      data-styled.g1[id="ONE"]{content:"b,"}/*!sc*/
      .a{color:blue;}/*!sc*/
      data-styled.g2[id="TWO"]{content:"a,"}/*!sc*/
      </style>
    `);
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
    expect(element.props).toMatchInlineSnapshot(`
      {
        "dangerouslySetInnerHTML": {
          "__html": "body{background:papayawhip;}/*!sc*/
      data-styled.g1[id="sc-global-a"]{content:"sc-global-a,"}/*!sc*/
      .c{color:red;}/*!sc*/
      data-styled.g2[id="sc-b"]{content:"c,"}/*!sc*/
      ",
        },
        "data-styled": "",
        "data-styled-version": "JEST_MOCK_VERSION",
      }
    `);
  });

  it('should return a generated React style element with nonce if webpack nonce is preset in the global scope', () => {
    require('../utils/nonce').default.mockImplementation(() => 'foo');

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

  it('should use nonce from ServerStyleSheet constructor over auto-detection', () => {
    require('../utils/nonce').default.mockImplementation(() => 'auto-nonce');

    const Heading = styled.h1`
      color: red;
    `;

    const sheet = new ServerStyleSheet({ nonce: 'constructor-nonce' });
    renderToString(sheet.collectStyles(<Heading>Hello!</Heading>));

    const css = sheet.getStyleTags();
    expect(css).toMatchInlineSnapshot(`
      <style nonce="constructor-nonce"
             data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{color:red;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
      </style>
    `);
    expect(css).not.toContain('auto-nonce');
  });

  it('should use nonce from ServerStyleSheet constructor in getStyleElement', () => {
    const Heading = styled.h1`
      color: blue;
    `;

    const sheet = new ServerStyleSheet({ nonce: 'element-nonce' });
    renderToString(sheet.collectStyles(<Heading>Hello!</Heading>));

    const [element] = sheet.getStyleElement();
    expect(element.props.nonce).toBe('element-nonce');
  });

  it('should fall back to auto-detection when no constructor nonce is provided', () => {
    require('../utils/nonce').default.mockImplementation(() => 'detected-nonce');

    const Heading = styled.h1`
      color: green;
    `;

    const sheet = new ServerStyleSheet();
    renderToString(sheet.collectStyles(<Heading>Hello!</Heading>));

    const css = sheet.getStyleTags();
    expect(css).toMatchInlineSnapshot(`
      <style nonce="detected-nonce"
             data-styled="true"
             data-styled-version="JEST_MOCK_VERSION"
      >
        .b{color:green;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
      </style>
    `);
  });

  it('should omit nonce attribute when no nonce is available', () => {
    require('../utils/nonce').default.mockImplementation(() => null);

    const Heading = styled.h1`
      color: purple;
    `;

    const sheet = new ServerStyleSheet();
    renderToString(sheet.collectStyles(<Heading>Hello!</Heading>));

    const css = sheet.getStyleTags();
    expect(css).not.toContain('nonce');

    const [element] = sheet.getStyleElement();
    expect(element.props.nonce).toBeUndefined();
  });

  describeStreamingTests('should interleave styles with rendered HTML', renderFn => {
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
    const stream = sheet.interleaveWithNodeStream(renderFn(jsx));

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

  describeStreamingTests(
    'should interleave styles with rendered HTML when chunked streaming',
    renderFn => {
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

      const stream = sheet.interleaveWithNodeStream(renderFn(jsx));
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
    }
  );

  describeStreamingTests('should handle errors while streaming', renderFn => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    function ExplodingComponent(): React.JSX.Element {
      throw new Error('ahhh');
    }

    const sheet = new ServerStyleSheet();
    const jsx = sheet.collectStyles(<ExplodingComponent />);
    const stream = sheet.interleaveWithNodeStream(renderFn(jsx));

    return new Promise<void>(resolve => {
      stream.on('data', () => {});

      stream.on('error', err => {
        expect(err).toMatchSnapshot();
        expect(sheet.sealed).toBe(true);
        resolve();
      });
    });
  });

  describeStreamingTests('should not interleave style tags into textarea elements', renderFn => {
    const StyledTextArea = styled.textarea<{ height: number }>`
      height: ${props => `${props.height}px`};
    `;

    const sheet = new ServerStyleSheet();

    // Currently we cannot set the chunk size to read with react renderToPipeableStream, so to ensure
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

    const stream = sheet.interleaveWithNodeStream(renderFn(jsx));

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

  describeStreamingTests('should throw if interleaveWithNodeStream is called twice', renderFn => {
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
      sheet.interleaveWithNodeStream(sheet.interleaveWithNodeStream(renderFn(jsx)))
    ).toThrowErrorMatchingSnapshot();
  });

  describeStreamingTests(
    'should throw if getStyleTags is called after interleaveWithNodeStream is called',
    renderFn => {
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

      sheet.interleaveWithNodeStream(renderFn(jsx));

      expect(sheet.getStyleTags).toThrowErrorMatchingSnapshot();
    }
  );

  describeStreamingTests(
    'should throw if getStyleElement is called after interleaveWithNodeStream is called',
    renderFn => {
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

      sheet.interleaveWithNodeStream(renderFn(jsx));

      expect(sheet.getStyleElement).toThrowErrorMatchingSnapshot();
    }
  );

  describeStreamingTests(
    'should throw if getStyleTags is called after streaming is complete',
    renderFn => {
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
      const stream = sheet.interleaveWithNodeStream(renderFn(jsx));

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
    }
  );

  describeStreamingTests(
    'should throw if getStyleElement is called after streaming is complete',
    renderFn => {
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
      const stream = sheet.interleaveWithNodeStream(renderFn(jsx));

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
    }
  );

  it('emits a dev warning when a legacy v6 plugin package is passed (v7)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Heading = styled.h1`
      padding-left: 5px;
    `;

    const sheet = new ServerStyleSheet();
    const html = renderToString(
      sheet.collectStyles(
        <StyleSheetManager plugins={[stylisRTLPlugin]}>
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
        .b{padding-left:5px;}/*!sc*/
      data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
      </style>
    `);
    expect(warnSpy.mock.calls[0][0]).toMatchInlineSnapshot(
      `"[sc] plugin "stylisRTLPlugin" is a stylis middleware function; v7 plugins are objects with an \`rw\` and/or \`decl\` hook."`
    );
    warnSpy.mockRestore();
  });

  it('should use given StyleSheetManager sheet instance', () => {
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

  describe('dynamic creation warnings', () => {
    let warn: jest.SpyInstance;

    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      warn.mockRestore();
    });

    it('should not warn for module-level components in SSR', () => {
      const ModuleLevelHeading = styled.h1`
        color: red;
      `;

      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<ModuleLevelHeading>Hello</ModuleLevelHeading>));

      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });

    it('should not warn for components with dynamic styles defined outside render', () => {
      const DynamicHeading = styled.h1<{ $color: string }>`
        color: ${props => props.$color};
      `;

      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <React.Fragment>
            <DynamicHeading $color="red">Hello</DynamicHeading>
            <DynamicHeading $color="blue">World</DynamicHeading>
          </React.Fragment>
        )
      );
      const css = sheet.getStyleTags();

      expect(css).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{color:red;}/*!sc*/
        .c{color:blue;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,c,"}/*!sc*/
        </style>
      `);
      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });

    it('should not warn for components with theme-based dynamic styles', () => {
      const ThemedHeading = styled.h1`
        color: ${props => (props.theme as Record<string, string>)?.color || 'black'};
        font-size: ${props => (props.theme as Record<string, string>)?.fontSize || '16px'};
      `;

      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<ThemedHeading>Themed</ThemedHeading>));

      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });

    it('should not warn for extended components with dynamic styles', () => {
      const BaseComponent = styled.div`
        padding: 10px;
      `;

      const ExtendedComponent = styled(BaseComponent)<{ $active: boolean }>`
        background: ${props => (props.$active ? 'green' : 'gray')};
      `;

      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <React.Fragment>
            <ExtendedComponent $active={true} />
            <ExtendedComponent $active={false} />
          </React.Fragment>
        )
      );

      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });

    it('should not warn for components using interpolation functions', () => {
      const getColor = (color: string) => `color: ${color};`;

      const StyledDiv = styled.div<{ $color: string }>`
        ${props => getColor(props.$color)}
        padding: 10px;
      `;

      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<StyledDiv $color="purple">Content</StyledDiv>));
      const css = sheet.getStyleTags();

      expect(css).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{color:purple;padding:10px;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
        </style>
      `);
      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });

    it('should handle multiple dynamic style variations without warnings', () => {
      interface CardProps {
        $variant: 'primary' | 'secondary' | 'danger';
        $size: 'small' | 'medium' | 'large';
      }

      const Card = styled.div<CardProps>`
        background: ${props => {
          switch (props.$variant) {
            case 'primary':
              return 'blue';
            case 'secondary':
              return 'gray';
            case 'danger':
              return 'red';
          }
        }};
        padding: ${props => {
          switch (props.$size) {
            case 'small':
              return '8px';
            case 'medium':
              return '16px';
            case 'large':
              return '24px';
          }
        }};
      `;

      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <React.Fragment>
            <Card $variant="primary" $size="small" />
            <Card $variant="secondary" $size="medium" />
            <Card $variant="danger" $size="large" />
          </React.Fragment>
        )
      );
      const css = sheet.getStyleTags();

      expect(css).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{background:blue;padding:8px;}/*!sc*/
        .c{background:gray;padding:16px;}/*!sc*/
        .d{background:red;padding:24px;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,c,d,"}/*!sc*/
        </style>
      `);
      expect(warn).not.toHaveBeenCalledWith(expect.stringMatching(/has been created dynamically/i));
    });
  });

  describe('real-world SSR patterns', () => {
    it('should render extended styled components with correct CSS', () => {
      const Base = styled.div`
        display: flex;
        color: blue;
      `;
      const Extended = styled(Base)`
        color: red;
        font-weight: bold;
      `;
      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<Extended />));
      const css = sheet.getStyleTags();
      expect(css).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .c{display:flex;color:blue;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"c,"}/*!sc*/
        .d{color:red;font-weight:bold;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"d,"}/*!sc*/
        </style>
      `);
    });

    it('should render keyframes in SSR', () => {
      const fadeIn = keyframes`
        from { opacity: 0; }
        to { opacity: 1; }
      `;
      const Comp = styled.div`
        animation: ${fadeIn} 0.3s ease-in;
      `;
      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<Comp />));
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          @keyframes a{from{opacity:0;}to{opacity:1;}}/*!sc*/
        data-styled.g1[id="sc-keyframes-a"]{content:"a,"}/*!sc*/
        .c{animation:a 0.3s ease-in;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"c,"}/*!sc*/
        </style>
      `);
    });

    it('should render attrs correctly in SSR', () => {
      const Input = styled.input.attrs({ type: 'email', placeholder: 'Enter email' })`
        border: 1px solid gray;
        padding: 8px;
      `;
      const sheet = new ServerStyleSheet();
      const html = renderToString(sheet.collectStyles(<Input />));
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{border:1px solid gray;padding:8px;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
        </style>
      `);
      expect(html).toContain('type="email"');
      expect(html).toContain('placeholder="Enter email"');
    });

    it('should render themed components in SSR', () => {
      const Heading = styled.h1`
        color: ${p => p.theme.color};
        font-size: ${p => p.theme.fontSize};
      `;
      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={{ color: 'navy', fontSize: '2rem' }}>
            <Heading>Hello</Heading>
          </ThemeProvider>
        )
      );
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{color:navy;font-size:2rem;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
        </style>
      `);
    });

    it('should render component selectors in SSR', () => {
      const Icon = styled.span`
        font-size: 20px;
      `;
      const Button = styled.button`
        ${Icon} {
          margin-right: 8px;
        }
      `;
      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <Button>
            <Icon />
            Click
          </Button>
        )
      );
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .d{font-size:20px;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"d,"}/*!sc*/
        .c .sc-a{margin-right:8px;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"c,"}/*!sc*/
        </style>
      `);
    });

    it('should render deep inheritance chain in SSR', () => {
      const L1 = styled.div`
        display: flex;
      `;
      const L2 = styled(L1)`
        color: blue;
      `;
      const L3 = styled(L2)`
        font-size: 14px;
      `;
      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<L3 />));
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .d{display:flex;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"d,"}/*!sc*/
        .e{color:blue;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"e,"}/*!sc*/
        .f{font-size:14px;}/*!sc*/
        data-styled.g3[id="sc-c"]{content:"f,"}/*!sc*/
        </style>
      `);
    });

    it('should render GlobalStyle with ThemeProvider in SSR', () => {
      const GlobalStyle = createGlobalStyle`
        body {
          background: ${p => p.theme.bg};
          color: ${p => p.theme.fg};
        }
      `;
      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={{ bg: '#111', fg: '#eee' }}>
            <GlobalStyle />
          </ThemeProvider>
        )
      );
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          body{background:#111;color:#eee;}/*!sc*/
        data-styled.g1[id="sc-global-a"]{content:"sc-global-a_R_0_,"}/*!sc*/
        </style>
      `);
    });

    it('should render dynamic attrs with theme in SSR', () => {
      const Comp = styled.div.attrs<{ $size?: 'sm' | 'lg' }>(p => ({
        'data-size': p.$size || 'sm',
      }))`
        padding: ${p => (p.$size === 'lg' ? '16px' : '8px')};
      `;
      const sheet = new ServerStyleSheet();
      const html = renderToString(sheet.collectStyles(<Comp $size="lg" />));
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .b{padding:16px;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"b,"}/*!sc*/
        </style>
      `);
      expect(html).toContain('data-size="lg"');
    });

    it('should render multiple components with shared keyframes in SSR', () => {
      const pulse = keyframes`
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      `;
      const A = styled.div`
        animation: ${pulse} 2s infinite;
      `;
      const B = styled.span`
        animation: ${pulse} 1s infinite;
      `;
      const sheet = new ServerStyleSheet();
      renderToString(
        sheet.collectStyles(
          <>
            <A />
            <B />
          </>
        )
      );
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          @keyframes a{0%{transform:scale(1);}50%{transform:scale(1.05);}100%{transform:scale(1);}}/*!sc*/
        data-styled.g1[id="sc-keyframes-a"]{content:"a,"}/*!sc*/
        .d{animation:a 2s infinite;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"d,"}/*!sc*/
        .e{animation:a 1s infinite;}/*!sc*/
        data-styled.g3[id="sc-c"]{content:"e,"}/*!sc*/
        </style>
      `);
    });

    it('should handle extended component with attrs and theme in SSR', () => {
      const Base = styled.button.attrs({ type: 'button' })`
        display: inline-flex;
        border: none;
      `;
      const Themed = styled(Base)`
        background: ${p => p.theme.primary};
        color: white;
      `;
      const sheet = new ServerStyleSheet();
      const html = renderToString(
        sheet.collectStyles(
          <ThemeProvider theme={{ primary: 'dodgerblue' }}>
            <Themed>Click</Themed>
          </ThemeProvider>
        )
      );
      const tags = sheet.getStyleTags();
      expect(tags).toMatchInlineSnapshot(`
        <style data-styled="true"
               data-styled-version="JEST_MOCK_VERSION"
        >
          .c{display:inline-flex;border:none;}/*!sc*/
        data-styled.g1[id="sc-a"]{content:"c,"}/*!sc*/
        .d{background:dodgerblue;color:white;}/*!sc*/
        data-styled.g2[id="sc-b"]{content:"d,"}/*!sc*/
        </style>
      `);
      expect(html).toContain('type="button"');
    });
  });

  it('should not emit useLayoutEffect warning during SSR', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const sheet = new ServerStyleSheet();
    const Component = createGlobalStyle`body { background: red; }`;
    renderToString(sheet.collectStyles(<Component />));

    const useLayoutEffectWarning = consoleErrorSpy.mock.calls.find(call =>
      call.some(arg => typeof arg === 'string' && arg.includes('useLayoutEffect'))
    );
    expect(useLayoutEffectWarning).toBeUndefined();

    consoleErrorSpy.mockRestore();
  });

  describe('XSS hardening on SSR emit', () => {
    it('escapes `</style>` substrings in interpolated values so the host `<style>` cannot be terminated', () => {
      const Comp = styled.div<{ $bg: string }>`
        color: ${p => p.$bg};
      `;
      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<Comp $bg={'</style>'} />));

      const tags = sheet.getStyleTags();
      // The CSS body must not contain a literal `</style` other than the
      // closing tag we control at the very end.
      const lastClose = tags.lastIndexOf('</style>');
      expect(lastClose).toBeGreaterThan(0);
      expect(tags.slice(0, lastClose).toLowerCase()).not.toContain('</style');
      // The original payload's `<` was rewritten to the CSS hex escape `\3C`.
      expect(tags).toContain('\\3C/style');
    });

    it('escapes `</style>` from createGlobalStyle interpolations', () => {
      const Global = createGlobalStyle<{ $bg: string }>`
        body { background: ${p => p.$bg}; }
      `;
      const sheet = new ServerStyleSheet();
      renderToString(sheet.collectStyles(<Global $bg={'</style>'} />));

      const tags = sheet.getStyleTags();
      const lastClose = tags.lastIndexOf('</style>');
      expect(tags.slice(0, lastClose).toLowerCase()).not.toContain('</style');
    });

    it('HTML-escapes the nonce attribute so a hostile value cannot break out of the `<style ...>` tag', () => {
      const sheet = new ServerStyleSheet({
        nonce: '"><script>alert("nonce-pwn")</script>',
      });
      const Comp = styled.div`
        color: red;
      `;
      renderToString(sheet.collectStyles(<Comp />));

      const tags = sheet.getStyleTags();
      // The injected `"` must be HTML-escaped so the `nonce` attribute
      // closes correctly. We don't need to escape `>` to keep the tag intact
      // (per HTML5 §13.2.5.32 the parser enters tag-state on `<` not `>`),
      // but the literal `<script` must be escaped to `&lt;script` so no
      // markup leaks past the attribute.
      expect(tags).toContain('nonce="&quot;');
      expect(tags).not.toMatch(/<script/);
    });

    /**
     * Every payload renders beside a static declaration and a static nested
     * rule, and the SSR text is read back by a CSS Syntax 3 reader: the rule
     * list must hold exactly the authored rules, every selector scoped.
     */
    describe('interpolated values cannot escape their construct', () => {
      const scoped = (payload: string) => {
        const Comp = styled.div<{ $v: string }>`
          color: ${p => p.$v};
          background: blue;
          & span {
            margin: 0;
          }
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $v={payload} />));
        return readRules(sheet.getStyleTags());
      };

      it.each([
        ['a closing brace', '} body{background:red} a{b:c'],
        ['an opening brace', '{ x'],
        ['a raw newline inside a string', '"\n} body{background:red} a{b:"'],
        ['a quote inside a comment', '/* " */ } body{background:red} /* " */'],
        ['a bad url', 'url(a"b) } body{background:red} x"'],
        ['an unbalanced quote', '"abc'],
        ['an unbalanced parenthesis', 'calc(1px'],
        ['an unbalanced comment', 'red /* x'],
        ['a trailing backslash', 'red\\'],
        ['a bad url after `<!--`', '<!--url(x"a) } body{background:red} x{" )'],
        ['url( directly preceded by a non-ASCII code point', ' url(x)'],
      ])('drops the declaration holding %s', (_, payload) => {
        expect(scoped(payload)).toEqual([
          { prelude: '.b', props: ['background'], rules: [] },
          { prelude: '.b span', props: ['margin'], rules: [] },
        ]);
      });

      // CSS Syntax 3 revisions disagree on whether a code point at or above
      // U+0080 continues an identifier, so `url(` directly preceded by one
      // has no single reading and must drop its declaration with a dev
      // warning naming the property, the same as any other failed value.
      it('drops the declaration holding url( directly preceded by a non-ASCII code point, with a dev warning', () => {
        const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
        expect(scoped(' url(x)')).toEqual([
          { prelude: '.b', props: ['background'], rules: [] },
          { prelude: '.b span', props: ['margin'], rules: [] },
        ]);
        expect(warn.mock.calls.map(call => String(call[0]))).toEqual([
          expect.stringContaining('`color`'),
        ]);
        warn.mockRestore();
      });

      it('adds only declarations of the same rule for a value `;`', () => {
        expect(scoped('red; position: fixed')).toEqual([
          { prelude: '.b', props: ['color', 'position', 'background'], rules: [] },
          { prelude: '.b span', props: ['margin'], rules: [] },
        ]);
      });

      it('adds no @import through a value', () => {
        expect(scoped('red; @import url(https://evil.example/x.css)')).toEqual([
          { prelude: '.b', props: ['color', 'background'], rules: [] },
          { prelude: '.b span', props: ['margin'], rules: [] },
        ]);
      });

      describe('style object values', () => {
        const fontFace = 'red; @font-face { font-family: x; src: url(//evil.example/f) }';
        const renderRules = (Comp: React.ComponentType<{ $v: string }>, payload: string) => {
          const sheet = new ServerStyleSheet();
          renderToString(sheet.collectStyles(<Comp $v={payload} />));
          return readRules(sheet.getStyleTags());
        };
        const fromFunction = () =>
          styled.div<{ $v: string }>(p => ({
            color: p.$v,
            background: 'blue',
            '& span': { margin: p.$v },
          }));
        const fromStatic = (payload: string) => () =>
          styled.div<{ $v: string }>({
            color: payload,
            background: 'blue',
            '& span': { margin: payload },
          });

        it.each([
          ['an object a function returns', () => fromFunction()],
          ['a static object', () => fromStatic(fontFace)()],
        ])('adds no rule through a value in %s', (_, make) => {
          const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
          expect(renderRules(make(), fontFace)).toEqual([
            { prelude: '.b', props: ['background'], rules: [] },
          ]);
          warn.mockRestore();
        });

        // A style object leaf holding `url(` directly preceded by a
        // non-ASCII code point must not be baked as literal CSS text (the
        // same ambiguity `checkSlotValue` fails on): it becomes a value slot
        // instead, which then fails the check and drops the declaration.
        it.each([
          ['an object a function returns', () => fromFunction()],
          ['a static object', () => fromStatic(' url(x)')()],
        ])(
          'drops a declaration whose value holds url( directly preceded by a non-ASCII code point in %s',
          (_, make) => {
            const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
            expect(renderRules(make(), ' url(x)')).toEqual([
              { prelude: '.b', props: ['background'], rules: [] },
            ]);
            warn.mockRestore();
          }
        );

        it.each([
          ['an object a function returns', () => fromFunction()],
          ['a static object', () => fromStatic('red; position: fixed')()],
        ])('adds only declarations of the same rule for a value `;` in %s', (_, make) => {
          expect(renderRules(make(), 'red; position: fixed')).toEqual([
            { prelude: '.b', props: ['color', 'position', 'background'], rules: [] },
            { prelude: '.b span', props: ['margin', 'position'], rules: [] },
          ]);
        });
      });

      it('adds no frame or rule through a value in a keyframes template', () => {
        const fade = keyframes`
          from { opacity: ${'0; } } body { color: red } @keyframes x { from { a: b'}; color: blue; }
          to { opacity: 1; }
        `;
        const Comp = styled.div`
          animation: ${fade} 1s;
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          {
            prelude: '@keyframes a',
            props: [],
            rules: [
              { prelude: 'from', props: ['color'], rules: [] },
              { prelude: 'to', props: ['opacity'], rules: [] },
            ],
          },
          { prelude: '.c', props: ['animation'], rules: [] },
        ]);
      });

      it('scopes every selector a comma list in a selector slot adds', () => {
        const Comp = styled.div<{ $sel: string }>`
          & ${p => p.$sel} {
            color: red;
          }
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $sel="a, body" />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          { prelude: '.b a,.b body', props: ['color'], rules: [] },
        ]);
      });

      it.each([
        ['a comment hiding `&`', '/*&*/body', '.b body:hover'],
        ['a comment hiding `&` inside parentheses', ':is(/*)&(*/ body)', '.b :is( body):hover'],
      ])('scopes a selector slot whose value holds %s', (_, payload, prelude) => {
        const Comp = styled.div<{ $sel: string }>`
          ${p => p.$sel}:hover {
            color: red;
          }
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $sel={payload} />));
        expect(readRules(sheet.getStyleTags())).toEqual([{ prelude, props: ['color'], rules: [] }]);
      });

      it.each([
        ['a `;`', 'h1; body'],
        ['a brace', 'h1 {} body'],
      ])('drops the rule whose selector slot holds %s', (_, payload) => {
        const Comp = styled.div<{ $sel: string }>`
          @media (min-width: 1px) {
            & ${p => p.$sel} {
              color: red;
            }
          }
          color: blue;
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $sel={payload} />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          { prelude: '.b', props: ['color'], rules: [] },
        ]);
      });

      it('drops the declaration whose property slot holds a brace', () => {
        const Comp = styled.div<{ $p: string }>`
          ${p => p.$p}: red;
          background: blue;
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $p="x} body{color" />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          { prelude: '.b', props: ['background'], rules: [] },
        ]);
      });

      it.each([
        ['a `;`', 'screen; body'],
        ['a brace', 'screen{} body'],
      ])('drops the at-rule whose prelude slot holds %s', (_, payload) => {
        const Comp = styled.div<{ $q: string }>`
          @media ${p => p.$q} {
            color: red;
          }
          background: blue;
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $q={payload} />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          { prelude: '.b', props: ['background'], rules: [] },
        ]);
      });

      it.each([
        ['an attribute string', '"]&url(("x) " ) ) {} body { display: none } " [y="z'],
        ['an escaped name', '"]&\\75rl(("x) " ) ) {} body { display: none } " [y="z'],
      ])('drops the rule whose selector value joins `&` to a call through %s', (_, payload) => {
        const Comp = styled.div<{ $state: string }>`
          color: blue;
          &[data-state="${p => p.$state}"] {
            color: red;
          }
        `;
        const sheet = new ServerStyleSheet();
        renderToString(sheet.collectStyles(<Comp $state={payload} />));
        expect(readRules(sheet.getStyleTags())).toEqual([
          { prelude: '.b', props: ['color'], rules: [] },
        ]);
      });

      describe('a value whose comment removal would join tokens', () => {
        const value = 'u/**/rl(x"a) {} body{display:none} y{" )';
        const render = (Comp: React.ComponentType<{ $v: string }>) => {
          const sheet = new ServerStyleSheet();
          renderToString(sheet.collectStyles(<Comp $v={value} />));
          return readRules(sheet.getStyleTags());
        };

        it('adds no rule through a selector value', () => {
          const Comp = styled.div<{ $v: string }>`
            color: blue;
            &:hover ${p => p.$v} {
              color: red;
            }
          `;
          expect(render(Comp)).toEqual([
            { prelude: '.b', props: ['color'], rules: [] },
            {
              prelude: '.b:hover url(x"a) {} body{display:none} y{" )',
              props: ['color'],
              rules: [],
            },
          ]);
        });

        it('adds no rule through an @media prelude value', () => {
          const Comp = styled.div<{ $v: string }>`
            color: blue;
            @media ${p => p.$v} {
              color: red;
            }
          `;
          expect(render(Comp)).toEqual([
            { prelude: '.b', props: ['color'], rules: [] },
            {
              prelude: '@media url(x"a) {} body{display:none} y{" )',
              props: [],
              rules: [{ prelude: '.b', props: ['color'], rules: [] }],
            },
          ]);
        });

        it('adds no rule through a keyframe stop value', () => {
          const Comp = styled.div<{ $v: string }>`
            color: blue;
            @keyframes spin {
              ${p => p.$v}, from {
                opacity: 0;
              }
            }
          `;
          expect(render(Comp)).toEqual([
            { prelude: '.b', props: ['color'], rules: [] },
            {
              prelude: '@keyframes spin',
              props: [],
              rules: [
                {
                  prelude: 'url(x"a) {} body{display:none} y{" ),from',
                  props: ['opacity'],
                  rules: [],
                },
              ],
            },
          ]);
        });
      });

      it('keeps every selector a global value adds under its authored selector', () => {
        const Global = createGlobalStyle<{ $sel: string; $v: string }>`
          .root {
            & ${p => p.$sel} {
              color: ${p => p.$v};
            }
          }
          body {
            margin: 0;
          }
        `;
        const render = (sel: string, v: string) => {
          const sheet = new ServerStyleSheet();
          renderToString(sheet.collectStyles(<Global $sel={sel} $v={v} />));
          return readRules(sheet.getStyleTags());
        };
        expect(render('a, body', 'red')).toEqual([
          { prelude: '.root a,.root body', props: ['color'], rules: [] },
          { prelude: 'body', props: ['margin'], rules: [] },
        ]);
        expect(render('a', 'red } html { background: red')).toEqual([
          { prelude: 'body', props: ['margin'], rules: [] },
        ]);
      });
    });

    it('passes a benign nonce through unchanged', () => {
      const sheet = new ServerStyleSheet({ nonce: 'abcDEF123/+=' });
      const Comp = styled.div`
        color: red;
      `;
      renderToString(sheet.collectStyles(<Comp />));

      expect(sheet.getStyleTags()).toContain('nonce="abcDEF123/+="');
    });
  });

  it('preserves dynamic global styles when same instance renders after clearTag', () => {
    const rules = css`
      body {
        color: ${() => 'red'};
      }
    `;
    const gs = new WebGlobalStyle(rules, 'sc-global-clearTag-test');
    const sheet = new StyleSheet({ isServer: true });
    const executionContext = { theme: {} } as any;

    gs.renderStyles('1', executionContext, sheet, mainCompiler);
    expect(gs.instanceRules.size).toBe(1);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body{color:red;}/*!sc*/
      data-styled.g1[id="sc-global-clearTag-test"]{content:"sc-global-clearTag-test1,"}/*!sc*/
      "
    `);

    sheet.clearTag();

    gs.renderStyles('1', executionContext, sheet, mainCompiler);
    expect(sheet.toString()).toMatchInlineSnapshot(`
      "body{color:red;}/*!sc*/
      data-styled.g1[id="sc-global-clearTag-test"]{content:"sc-global-clearTag-test1,"}/*!sc*/
      "
    `);
  });
});

interface ReadRule {
  /** Declaration names, in order. */
  props: string[];
  /** Selector text, or `@name prelude` for an at-rule. */
  prelude: string;
  /** Rules nested in a conditional group rule or a nested block. */
  rules: ReadRule[];
}

type CssToken = {
  kind: '{' | '}' | '(' | ')' | '[' | ']' | ';' | 'at' | 'ws' | 'text';
  text: string;
};

const CONDITIONAL_GROUP_RULES = new Set([
  '@container',
  '@layer',
  '@media',
  '@scope',
  '@starting-style',
  '@supports',
]);

/**
 * Read SSR style tags the way a browser does, as a check independent of the
 * library's own parser: `@csstools/css-tokenizer` tokenizes per CSS Syntax 3
 * §4.3, and the rule list is read per §5.5 (a `;` ends a qualified rule
 * inside a block). The library's `data-styled` marker rules are left out.
 */
function readRules(tags: string): ReadRule[] {
  const text = tags.slice(tags.indexOf('>') + 1, tags.lastIndexOf('</style>'));
  return readCss(text).filter(rule => !rule.prelude.startsWith('data-styled.'));
}

/** {@link readRules} for CSS text. */
function readCss(text: string): ReadRule[] {
  return readRuleList(tokenizeCss(text), { i: 0 }, false);
}

const BLOCK_TOKENS: Partial<Record<TokenType, CssToken['kind']>> = {
  [TokenType.CloseCurly]: '}',
  [TokenType.CloseParen]: ')',
  [TokenType.CloseSquare]: ']',
  [TokenType.Function]: '(',
  [TokenType.OpenCurly]: '{',
  [TokenType.OpenParen]: '(',
  [TokenType.OpenSquare]: '[',
  [TokenType.Semicolon]: ';',
};

/** CSS Syntax 3 tokens as the rule reader takes them: comments dropped, each whitespace run one space. */
function tokenizeCss(s: string): CssToken[] {
  const out: CssToken[] = [];
  for (const token of tokenize({ css: s })) {
    const type = token[0];
    if (type === TokenType.Comment || type === TokenType.EOF) continue;
    if (type === TokenType.Whitespace) {
      out.push({ kind: 'ws', text: ' ' });
    } else if (type === TokenType.AtKeyword) {
      out.push({ kind: 'at', text: token[1] });
    } else {
      out.push({ kind: BLOCK_TOKENS[type] ?? 'text', text: token[1] });
    }
  }
  return out;
}

/** Read one component value's text starting at `pos`; `()`, `[]`, and `{}` groups read whole. */
function readComponentValue(tokens: CssToken[], pos: { i: number }): string {
  const open = tokens[pos.i];
  pos.i++;
  const close = open.kind === '(' ? ')' : open.kind === '[' ? ']' : open.kind === '{' ? '}' : null;
  if (close === null) return open.text;
  let text = open.text;
  while (pos.i < tokens.length && tokens[pos.i].kind !== close) {
    text += readComponentValue(tokens, pos);
  }
  if (pos.i < tokens.length) text += tokens[pos.i++].text;
  return text;
}

/** Read up to a top-level token of one of `stops`; returns the text and the stop reached. */
function readUntil(
  tokens: CssToken[],
  pos: { i: number },
  stops: ReadonlyArray<CssToken['kind']>
): [string, CssToken['kind'] | 'eof'] {
  let text = '';
  while (pos.i < tokens.length) {
    const kind = tokens[pos.i].kind;
    if (stops.includes(kind)) return [text.trim(), kind];
    text += readComponentValue(tokens, pos);
  }
  return [text.trim(), 'eof'];
}

function readRuleList(tokens: CssToken[], pos: { i: number }, nested: boolean): ReadRule[] {
  const rules: ReadRule[] = [];
  while (pos.i < tokens.length) {
    const token = tokens[pos.i];
    if (token.kind === 'ws' || (nested && token.kind === ';')) {
      pos.i++;
      continue;
    }
    if (nested && token.kind === '}') {
      pos.i++;
      return rules;
    }
    if (token.kind === 'at') {
      pos.i++;
      const [prelude, stop] = readUntil(tokens, pos, nested ? [';', '{', '}'] : [';', '{']);
      const name = prelude ? token.text + ' ' + prelude : token.text;
      if (stop === '{') {
        pos.i++;
        if (CONDITIONAL_GROUP_RULES.has(token.text)) {
          rules.push({ prelude: name, props: [], rules: readRuleList(tokens, pos, true) });
        } else {
          rules.push({ prelude: name, ...readBlock(tokens, pos) });
        }
      } else {
        if (stop === ';') pos.i++;
        rules.push({ prelude: name, props: [], rules: [] });
      }
      continue;
    }
    const [prelude, stop] = readUntil(tokens, pos, nested ? ['{', ';', '}'] : ['{']);
    if (stop === ';') {
      pos.i++;
      continue;
    }
    if (stop !== '{') continue;
    pos.i++;
    rules.push({ prelude, ...readBlock(tokens, pos) });
  }
  return rules;
}

/** Read a style block after its `{`: declaration names, and any nested rule. */
function readBlock(tokens: CssToken[], pos: { i: number }): Omit<ReadRule, 'prelude'> {
  const props: string[] = [];
  const rules: ReadRule[] = [];
  while (pos.i < tokens.length) {
    const token = tokens[pos.i];
    if (token.kind === 'ws' || token.kind === ';') {
      pos.i++;
      continue;
    }
    if (token.kind === '}') {
      pos.i++;
      break;
    }
    const [text, stop] = readUntil(tokens, pos, [';', '{', '}']);
    if (stop === '{') {
      pos.i++;
      rules.push({ prelude: text, ...readBlock(tokens, pos) });
    } else if (text.indexOf(':') !== -1) {
      props.push(text.slice(0, text.indexOf(':')).trim());
    }
  }
  return { props, rules };
}
