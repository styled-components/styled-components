/**
 * @jest-environment node
 */

// React 19's client `cache` is a pass-through, so tests mock a request-scoped one.
const mockCacheStore = new Map<Function, any>();

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    cache: (fn: Function) => () => {
      if (!mockCacheStore.has(fn)) mockCacheStore.set(fn, fn());
      return mockCacheStore.get(fn);
    },
  };
});

// Mock IS_RSC before importing the module
jest.mock('../../utils/isRsc', () => ({ IS_RSC: true }));

import React, { Suspense } from 'react';
import ReactDOMServer from 'react-dom/server';
import { RSC_REDUNDANT_EMIT_WARN_THRESHOLD } from '../../constants';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import {
  countStyleTags,
  itWarnsOnRedundantEmits,
  renderGlobalInProbe,
  renderStreamed,
  tick,
} from '../../test/rscStream';
import createGlobalStyle from '../createGlobalStyle';

describe('createGlobalStyle RSC mode', () => {
  beforeEach(() => {
    mockCacheStore.clear();
  });
  it('renders style tag without precedence so it can be unmounted', () => {
    const GlobalStyle = createGlobalStyle`
      body { background: red; }
    `;

    const html = ReactDOMServer.renderToString(<GlobalStyle />);

    // Global styles must NOT use `precedence` because React 19 treats
    // precedence styles as permanent resources that persist after unmount.
    // This would break conditional global styles (e.g. body lock on modal).
    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-khwQqP">
        body{background:red;}
      </style>
    `);
  });

  it('renders dynamic global styles without precedence', () => {
    const GlobalStyle = createGlobalStyle<{ $color: string }>`
      body { background: ${props => props.$color}; }
    `;

    const html1 = ReactDOMServer.renderToString(<GlobalStyle $color="red" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $color="blue" />);

    // Same component should produce same key even with different prop values
    expect(html1).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}
      </style>
    `);
  });

  it('renders one tag per instance of the same static global style in one tree', () => {
    const GlobalStyle = createGlobalStyle`
      body { margin: 0; }
    `;

    // Two instances in one render simulate a non-hydrating RSC page where the
    // same global style appears in multiple server components. Each carries
    // its own tag so React discarding one (a Suspense fallback, a layout
    // swapped on navigation) never strips the other.
    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle />
        <GlobalStyle />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
    `);
  });

  it('renders one tag per instance of a dynamic global style even with identical props', () => {
    const GlobalStyle = createGlobalStyle<{ $bg: string }>`
      body { background: ${props => props.$bg}; }
    `;

    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle $bg="red" />
        <GlobalStyle $bg="red" />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
    `);
  });

  describe('across React rendering boundaries (#5808)', () => {
    it('keeps the global style after React reveals content behind a Suspense boundary', async () => {
      const GlobalStyle = createGlobalStyle`
        body { background: papayawhip; }
      `;
      const Resolved = async () => {
        await tick();
        return <GlobalStyle />;
      };

      const { revealed, streamed } = await renderStreamed(
        <div>
          <Suspense fallback={<GlobalStyle />}>
            <Resolved />
          </Suspense>
        </div>
      );

      // The fallback and the resolved content each stream their own tag; the
      // reveal discards the fallback's, leaving the resolved one.
      expect(countStyleTags(streamed)).toBe(2);
      expect(countStyleTags(revealed)).toBe(1);
      expect(revealed).toContain('body{background:papayawhip;}');
    });

    it('emits the tag for content rendered after a fallback that never reaches the HTML', () => {
      const GlobalStyle = createGlobalStyle`
        body { background: papayawhip; }
      `;

      // A fallback React renders but elides from the HTML (its content did
      // not suspend) still ran in the same request, so a shared record of
      // "already emitted" would leave the real content without a tag.
      ReactDOMServer.renderToString(<GlobalStyle />);
      const html = ReactDOMServer.renderToString(<GlobalStyle />);

      expect(countStyleTags(html)).toBe(1);
      expect(html).toContain('body{background:papayawhip;}');
    });

    it('keeps the layout global style when a page below it renders the same global first', async () => {
      const GlobalStyle = createGlobalStyle`
        body { background: papayawhip; }
      `;
      const Page = () => (
        <>
          <GlobalStyle />
          <p>page</p>
        </>
      );
      // The layout places its global after its children, so the page renders
      // (and records) its copy first.
      const Layout = async ({ children }: { children: React.ReactNode }) => {
        await tick();
        return (
          <>
            <main>{children}</main>
            <GlobalStyle />
          </>
        );
      };

      const { revealed } = await renderStreamed(
        <div>
          <Suspense fallback={<i>loading</i>}>
            <Layout>
              <Page />
            </Layout>
          </Suspense>
        </div>
      );

      // A client navigation to a sibling page replaces everything inside
      // <main>; the layout's own tag has to survive that.
      const afterNavigation = revealed.replace(/<main>[\s\S]*<\/main>/, '<main></main>');
      expect(countStyleTags(afterNavigation)).toBe(1);
      expect(afterNavigation).toContain('body{background:papayawhip;}');
    });
  });

  describe('redundant-emit warning', () => {
    itWarnsOnRedundantEmits({
      marker: 'instances of the global style',
      renderMany: count => {
        const GlobalStyle = createGlobalStyle`
          body { margin: 0; }
        `;

        ReactDOMServer.renderToString(
          <div>
            {Array.from({ length: count }, (_, i) => (
              <GlobalStyle key={i} />
            ))}
          </div>
        );

        return `${RSC_REDUNDANT_EMIT_WARN_THRESHOLD} instances of the global style ${GlobalStyle.styledComponentId} were rendered on one server-rendered page, so its styles repeat that many times in the HTML. A global style is normally mounted once, at the root of the app. Move it higher in the tree so it renders only once per page.`;
      },
    });
  });

  describe('shared style elements', () => {
    // Every instance still renders its own tag; the element object behind it
    // is shared so the server-component payload carries each distinct global
    // once and refers back to it for the repeats.
    it('returns the same element object for identical static CSS', () => {
      const GlobalStyle = createGlobalStyle`
        body { margin: 0; }
      `;
      const seen: React.ReactElement[] = [];

      const html = ReactDOMServer.renderToString(
        <>
          {renderGlobalInProbe(GlobalStyle, {}, seen)}
          {renderGlobalInProbe(GlobalStyle, {}, seen)}
        </>
      );

      expect(seen).toHaveLength(2);
      expect(seen[1]).toBe(seen[0]);
      expect(countStyleTags(html)).toBe(2);
    });

    it('returns the same element object for identical dynamic CSS and a distinct one for different CSS', () => {
      const GlobalStyle = createGlobalStyle<{ $bg: string }>`
        body { background: ${props => props.$bg}; }
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderGlobalInProbe(GlobalStyle, { $bg: 'red' }, seen)}
          {renderGlobalInProbe(GlobalStyle, { $bg: 'red' }, seen)}
          {renderGlobalInProbe(GlobalStyle, { $bg: 'blue' }, seen)}
        </>
      );

      expect(seen[1]).toBe(seen[0]);
      expect(seen[2]).not.toBe(seen[0]);
    });

    it('keeps one fixed React key per global style', () => {
      const GlobalStyle = createGlobalStyle<{ $bg: string }>`
        body { background: ${props => props.$bg}; }
      `;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderGlobalInProbe(GlobalStyle, { $bg: 'red' }, seen)}
          {renderGlobalInProbe(GlobalStyle, { $bg: 'blue' }, seen)}
        </>
      );

      expect(seen[0].key).toBe(GlobalStyle.styledComponentId);
      expect(seen[1].key).toBe(seen[0].key);
    });

    it('never shares an element between two global styles that emit identical CSS', () => {
      // Different source text gives each its own ID; both compile to the same
      // `body{margin:0;}`.
      const First = createGlobalStyle`
        body { margin: 0; }
      `;
      const Second = createGlobalStyle`body{margin:0;}`;
      const seen: React.ReactElement[] = [];

      ReactDOMServer.renderToString(
        <>
          {renderGlobalInProbe(First, {}, seen)}
          {renderGlobalInProbe(Second, {}, seen)}
        </>
      );

      expect(seen[1]).not.toBe(seen[0]);
    });

    it('never shares an element across StyleSheetManager settings that change the CSS', () => {
      const GlobalStyle = createGlobalStyle`
        body { margin: 0; }
      `;
      const seen: React.ReactElement[] = [];

      const html = ReactDOMServer.renderToString(
        <>
          <StyleSheetManager namespace="first">
            {renderGlobalInProbe(GlobalStyle, {}, seen)}
          </StyleSheetManager>
          <StyleSheetManager namespace="second">
            {renderGlobalInProbe(GlobalStyle, {}, seen)}
          </StyleSheetManager>
        </>
      );

      expect(seen[1]).not.toBe(seen[0]);
      expect(html).toContain('first body{margin:0;}');
      expect(html).toContain('second body{margin:0;}');
    });
  });

  it('renders multiple instances with different dynamic props in one tree', () => {
    const GlobalStyle = createGlobalStyle<{ $bg: string }>`
      body { background: ${props => props.$bg}; }
    `;

    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle $bg="red" />
        <GlobalStyle $bg="blue" />
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-kVtqfD">
        body{background:red;}
      </style>
      <style data-styled-global="sc-global-kVtqfD">
        body{background:blue;}
      </style>
    `);
  });

  it('emits correct CSS across independent RSC render passes (no hydration)', () => {
    const GlobalStyle = createGlobalStyle<{ $size: string }>`
      html { font-size: ${props => props.$size}; }
    `;

    // Simulate three separate RSC requests;none will hydrate
    const html1 = ReactDOMServer.renderToString(<GlobalStyle $size="14px" />);
    const html2 = ReactDOMServer.renderToString(<GlobalStyle $size="16px" />);
    const html3 = ReactDOMServer.renderToString(<GlobalStyle $size="18px" />);

    expect(html1).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:14px;}
      </style>
    `);
    expect(html2).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:16px;}
      </style>
    `);
    expect(html3).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-fLdnMX">
        html{font-size:18px;}
      </style>
    `);
  });

  it('renders themed global style gracefully in RSC (theme is undefined)', () => {
    const GlobalStyle = createGlobalStyle`
      body { color: ${props => (props.theme && props.theme.color) || 'black'}; }
    `;

    // No ThemeProvider in RSC;theme is undefined, should not crash
    const html = ReactDOMServer.renderToString(<GlobalStyle />);
    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-ekSA-DU">
        body{color:black;}
      </style>
    `);
  });

  it('renders global style and styled component in the same RSC tree', () => {
    const styled = require('../styled').default;

    const GlobalStyle = createGlobalStyle`
      body { margin: 0; }
    `;
    const Heading = styled.h1`
      color: red;
    `;

    const html = ReactDOMServer.renderToString(
      <>
        <GlobalStyle />
        <Heading>Hello</Heading>
      </>
    );

    expect(html).toMatchInlineSnapshot(`
      <style data-styled-global="sc-global-yXuMc">
        body{margin:0;}
      </style>
      <style data-styled>
        .eBSjvc{color:red;}
      </style>
      <h1 class="sc-kqxcKS eBSjvc">
        Hello
      </h1>
    `);
  });
});
