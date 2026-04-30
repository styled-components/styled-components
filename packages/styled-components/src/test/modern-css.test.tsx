import { render } from '@testing-library/react';
import React from 'react';
import { getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

describe('modern CSS', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('@layer', () => {
    // Block-less `@layer reset, framework, utilities;` is exercised by the
    // parser parity suite (src/parser/parity.test.ts) — jsdom's CSSOM drops
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
          .b {
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
            .b {
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
        ".b {
          opacity: 1;
          transition: opacity 0.3s allow-discrete;
        }
        @starting-style {
          .b {
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
        ".b {
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
        ".b {
          color-scheme: light dark;
          background: light-dark(white, #111);
        }"
      `);
    });
  });

  describe(':has() / :where() / :is() with self-reference', () => {
    // Regression: stylis#350 — multiple `&` inside :is()/:where()/:has() dropped some
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
        ":is(.b + .b, .b > .b) {
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
        ":where(.b + .b) {
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
        ".b:has(.child) {
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
        ".b {
          container-type: inline-size;
        }
        @container (width > 500px) {
          .b:hover {
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
          .b:focus {
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
          .sc-a > .sc-a {
            gap: 1rem;
          }
        }"
      `);
    });
  });
});
