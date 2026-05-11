import { render } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../base';
import css from '../constructors/css';
import { getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('modern CSS', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('@layer', () => {
    // Block-less `@layer reset, framework, utilities;` is exercised by the
    // parser parity suite (src/parser/parity.test.ts);jsdom's CSSOM drops
    // the declaration on round-trip so an integration test here would just
    // re-test jsdom, not styled-components.

    it('emits a named @layer block around declarations', () => {
      const Comp = styled.div`
        @layer utilities {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@layer utilities {
          .a {
            color: red;
          }
        }"
      `);
    });

    it('nests @layer inside @media', () => {
      const Comp = styled.div`
        @media (min-width: 500px) {
          @layer theme {
            color: red;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@media (min-width:500px) {
          @layer theme {
            .a {
              color: red;
            }
          }
        }"
      `);
    });
  });

  // @scope is exercised by the parser parity suite (src/parser/parity.test.ts);
  // jsdom's CSSOM doesn't support it so an integration test here would just
  // re-test jsdom, not styled-components.

  describe('@starting-style', () => {
    it('emits @starting-style for discrete transitions', () => {
      const Comp = styled.div`
        opacity: 1;
        transition: opacity 0.3s allow-discrete;
        @starting-style {
          opacity: 0;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          opacity: 1;
          transition: opacity 0.3s allow-discrete;
        }
        @starting-style {
          .a {
            opacity: 0;
          }
        }"
      `);
    });
  });

  describe('@property', () => {
    it('emits @property as a top-level declaration', () => {
      const Comp = styled.div`
        @property --my-color {
          syntax: '<color>';
          inherits: false;
          initial-value: red;
        }
        color: var(--my-color);
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: var(--my-color);
        }
        @property --my-color {
          syntax: '<color>';
          inherits: false;
          initial-value: red;
        }"
      `);
    });
  });

  describe('light-dark()', () => {
    it('passes light-dark() through as a value function', () => {
      const Comp = styled.div`
        color-scheme: light dark;
        background: light-dark(white, #111);
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color-scheme: light dark;
          background: light-dark(white, #111);
        }"
      `);
    });
  });

  describe(':has() / :where() / :is() with self-reference', () => {
    // Regression: stylis#350;multiple `&` inside :is()/:where()/:has() dropped some
    // instances. The in-house parser walks paren depth explicitly and preserves every
    // ampersand. These tests lock that behavior from a styled() entry point.

    it('preserves multiple & inside :is()', () => {
      const Comp = styled.div`
        :is(& + &, & > &) {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ":is(.a + .a, .a > .a) {
          color: red;
        }"
      `);
    });

    it('preserves multiple & inside :where()', () => {
      const Comp = styled.div`
        :where(& + &) {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ":where(.a + .a) {
          color: red;
        }"
      `);
    });

    it('preserves & inside :has() on the styled selector', () => {
      const Comp = styled.div`
        &:has(.child) {
          color: red;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a:has(.child) {
          color: red;
        }"
      `);
    });
  });

  describe('nested at-rules with pseudo-class child', () => {
    it('applies &:hover inside @container', () => {
      const Comp = styled.div`
        container-type: inline-size;
        @container (width > 500px) {
          &:hover {
            color: red;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          container-type: inline-size;
          container-name: sc-kqxcKS;
        }
        @container (width > 500px) {
          .a:hover {
            color: red;
          }
        }"
      `);
    });

    it('applies &:focus inside @media', () => {
      const Comp = styled.div`
        @media (prefers-reduced-motion: reduce) {
          &:focus {
            outline: 2px solid;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@media (prefers-reduced-motion:reduce) {
          .a:focus {
            outline: 2px solid;
          }
        }"
      `);
    });

    it('applies nested & across @supports', () => {
      const Comp = styled.div`
        @supports (display: grid) {
          & > & {
            gap: 1rem;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@supports (display:grid) {
          .sc-kqxcKS > .sc-kqxcKS {
            gap: 1rem;
          }
        }"
      `);
    });
  });

  describe('dynamic interpolations in modern CSS', () => {
    it('@container with interpolated dimension', () => {
      const minWidth = '400px';
      const Comp = styled.div`
        container-type: inline-size;
        @container (min-width: ${minWidth}) {
          font-size: 18px;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          container-type: inline-size;
          container-name: sc-kqxcKS;
        }
        @container (min-width:400px) {
          .a {
            font-size: 18px;
          }
        }"
      `);
    });

    it('cross-component query reaches deeply-nested descendants (badge inside layout inside card)', () => {
      // Mirrors the demo 3 structure: container with multiple descendants
      // each querying the named container. All three nested descendants
      // should pick up the cross-component reference.
      const Card = styled.div`
        container-type: inline-size;
      `;
      const Layout = styled.div`
        position: relative;
        display: flex;
        flex-direction: column;
        @container ${Card} (min-width: 420px) {
          flex-direction: row;
        }
      `;
      const Badge = styled.div`
        position: absolute;
        background: slategray;
        @container ${Card} (min-width: 420px) {
          background: green;
        }
      `;
      const BadgeOff = styled.span`
        display: inline;
        @container ${Card} (min-width: 420px) {
          display: none;
        }
      `;
      render(
        <Card>
          <Layout>
            <Badge>
              <BadgeOff>idle</BadgeOff>
            </Badge>
          </Layout>
        </Card>
      );
      const css = getRenderedCSS();
      const cardIdMatch = css.match(/container-name:\s*(sc-[A-Za-z]+)/);
      expect(cardIdMatch).not.toBeNull();
      const cardId = cardIdMatch![1];
      // All three queries should reference the same auto-named container.
      const queryMatches = css.match(new RegExp(`@container ${cardId} \\(min-width:420px\\)`, 'g'));
      expect(queryMatches).not.toBeNull();
      expect(queryMatches!.length).toBe(3);
    });

    it('cross-component @container query via ${Component} interpolation', () => {
      // The container declares `container-type` only; its name is auto-emitted
      // from the styledComponentId. A descendant interpolates the container
      // styled-component reference into `@container <name>`;the parser
      // strips the leading `.` from the class-selector form so the bare
      // ident lands in the @container name slot. End-to-end: cross-component
      // queries work without anyone writing a string `container-name`.
      const Card = styled.div`
        container-type: inline-size;
      `;
      const Inner = styled.div`
        color: red;
        @container ${Card} (min-width: 400px) {
          color: blue;
        }
      `;
      render(
        <Card>
          <Inner />
        </Card>
      );
      const css = getRenderedCSS();
      // Card's CSS gets auto-injected `container-name: <its componentId>`.
      expect(css).toMatch(/container-type:\s*inline-size;[\s\n]*container-name:\s*sc-/);
      // Inner's @container query references the same id (no leading dot).
      const cardIdMatch = css.match(/container-name:\s*(sc-[A-Za-z]+)/);
      expect(cardIdMatch).not.toBeNull();
      const cardId = cardIdMatch![1];
      expect(css).toContain(`@container ${cardId} (min-width:400px)`);
    });

    it('@layer with dynamic content', () => {
      const layerName = 'utilities';
      const Comp = styled.div`
        @layer ${layerName} {
          color: ${() => 'red'};
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "@layer utilities {
          .a {
            color: red;
          }
        }"
      `);
    });

    it(':has() with dynamic child selector', () => {
      const Comp = styled.div`
        &:has(> ${() => '.active'}) {
          border: 2px solid blue;
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a:has(> .active) {
          border: 2px solid blue;
        }"
      `);
    });

    it('nested @media and @container together', () => {
      const Comp = styled.div`
        color: black;
        @media (min-width: 768px) {
          container-type: inline-size;
          @container (min-width: 300px) {
            color: red;
          }
        }
      `;
      render(<Comp />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: black;
        }
        @media (min-width:768px) {
          .a {
            container-type: inline-size;
          }
          @container (min-width:300px) {
            .a {
              color: red;
            }
          }
        }"
      `);
    });

    it('theme-driven @media with nested pseudo-classes', () => {
      const Comp = styled.div`
        color: ${p => p.theme.fg};
        @media (min-width: ${p => p.theme.breakpoint}) {
          &:hover {
            color: ${p => p.theme.hoverColor};
          }
          &:focus-visible {
            outline: 2px solid ${p => p.theme.focusColor};
          }
        }
      `;
      render(
        <ThemeProvider
          theme={{ fg: '#333', breakpoint: '768px', hoverColor: 'blue', focusColor: 'orange' }}
        >
          <Comp />
        </ThemeProvider>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: #333;
        }
        @media (min-width:768px) {
          .a:hover {
            color: blue;
          }
          .a:focus-visible {
            outline: 2px solid orange;
          }
        }"
      `);
    });

    it('calc() with interpolated values', () => {
      const Comp = styled.div<{ $cols: number }>`
        width: calc(100% / ${p => p.$cols} - 16px);
      `;
      render(<Comp $cols={3} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          width: calc(100% / 3 - 16px);
        }"
      `);
    });

    it('clamp() with interpolated values', () => {
      const Comp = styled.div<{ $min: string; $preferred: string; $max: string }>`
        font-size: clamp(${p => p.$min}, ${p => p.$preferred}, ${p => p.$max});
      `;
      render(<Comp $min="12px" $preferred="2vw" $max="20px" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          font-size: clamp(12px, 2vw, 20px);
        }"
      `);
    });

    it('@supports with interpolated value inside nested rule', () => {
      const Comp = styled.div<{ $gap: string }>`
        display: flex;
        flex-wrap: wrap;
        @supports (gap: 1rem) {
          gap: ${p => p.$gap};
        }
      `;
      render(<Comp $gap="1.5rem" />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          display: flex;
          flex-wrap: wrap;
        }
        @supports (gap:1rem) {
          .a {
            gap: 1.5rem;
          }
        }"
      `);
    });
  });
});
