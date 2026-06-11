// CSS Conditional Rules Module Level 3 §6, feature queries (@supports).
// Editor's draft fetched to /tmp/css-conditional-3.html for this session.
// (Spec quotes below replace the draft's em-dash separators with "-".)
//
// Native deviation (documented): a declaration leaf answers "does this
// engine produce output the platform renders". A declaration counts as
// supported when the transform pipeline emits at least one partial and
// every emitted key lands on an RN 0.85 style attribute, a component
// prop the engine lifts, or an engine-implemented sentinel. Value
// validation is only as deep as the relevant handler's grammar:
// declarations with registered handlers validate fully, while plain
// passthrough properties accept any value (RN itself tolerates and
// ignores invalid enum values at runtime).

import React from 'react';
import TestRenderer from 'react-test-renderer';
import { StyleSheet, View } from 'react-native';

import styled from '..';
import { matchSupports, resetSupportsCacheForTest } from '../supports';
import { resetWarningsForTest } from '../transform/dev';

function styleOf(El: React.ComponentType<any>, props: object = {}): any {
  const tree = TestRenderer.create(React.createElement(El, props));
  return StyleSheet.flatten(tree.root.findByType(View).props.style);
}

describe('@supports spec compliance (CSS Conditional 3 §6)', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    resetWarningsForTest();
    resetSupportsCacheForTest();
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('<supports-decl> result', () => {
    // "The result is true if the UA supports the declaration within the
    // parentheses."
    it('(color: red) is supported', () => {
      expect(matchSupports('(color: red)')).toBe(true);
    });

    it('(display: flex) is supported', () => {
      expect(matchSupports('(display: flex)')).toBe(true);
    });

    it('(display: grid) is supported (engine-implemented subset)', () => {
      expect(matchSupports('(display: grid)')).toBe(true);
    });

    it('a property the platform does not render is unsupported', () => {
      expect(matchSupports('(backdrop-filter: blur(4px))')).toBe(false);
    });

    it('a value a registered handler rejects is unsupported', () => {
      expect(matchSupports('(translate: garbage)')).toBe(false);
    });

    // "Declaration value can be empty." (grammatically valid, but no
    // engine renders an empty value)
    it('an empty declaration value is valid grammar but unsupported', () => {
      expect(matchSupports('(display:)')).toBe(false);
    });

    it('probing a declaration never fires the dev warnings of the probed handler', () => {
      // corner-shape: scoop warns + drops in normal compilation; a
      // feature query is exactly the place authors test for it, so the
      // probe itself must stay silent.
      expect(matchSupports('(corner-shape: scoop)')).toBe(false);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('boolean algebra', () => {
    // "not <supports-in-parens> - The result is the negation of the
    // <supports-in-parens> term."
    it('not negates the inner result', () => {
      expect(matchSupports('not (backdrop-filter: blur(4px))')).toBe(true);
      expect(matchSupports('not (color: red)')).toBe(false);
    });

    // "<supports-in-parens> [ and <supports-in-parens> ]* - The result is
    // true if all of the <supports-in-parens> sub-expressions are true."
    it('and requires every term', () => {
      expect(matchSupports('(color: red) and (display: flex)')).toBe(true);
      expect(matchSupports('(color: red) and (backdrop-filter: blur(4px))')).toBe(false);
    });

    // "<supports-in-parens> [ or <supports-in-parens> ]* - The result is
    // true if any of the <supports-in-parens> sub-expressions is true."
    it('or requires any term', () => {
      expect(matchSupports('(backdrop-filter: blur(4px)) or (color: red)')).toBe(true);
      expect(matchSupports('(backdrop-filter: blur(4px)) or (mask-image: none)')).toBe(false);
    });

    it('parenthesized conditions nest', () => {
      expect(matchSupports('(not (backdrop-filter: blur(4px))) and (color: red)')).toBe(true);
      expect(matchSupports('not ((color: red) and (display: flex))')).toBe(false);
    });

    // "Any @supports rule that does not parse according to the grammar
    // above ... is invalid. ... processors must ignore such a rule."
    it('mixing and / or without parentheses is invalid and never matches', () => {
      expect(matchSupports('(color: red) and (display: flex) or (color: blue)')).toBe(false);
    });

    it('a bare declaration without parentheses is invalid', () => {
      expect(matchSupports('color: red')).toBe(false);
    });
  });

  describe('<general-enclosed>', () => {
    // "<general-enclosed> - The result is false." (unrecognized but
    // grammatically valid conditions are false, not invalid)
    it('unknown function forms are false, not invalid', () => {
      expect(matchSupports('selector(a:hover)')).toBe(false);
      expect(matchSupports('font-tech(color-COLRv1)')).toBe(false);
    });

    it('a parenthesized bare ident is false, not invalid', () => {
      expect(matchSupports('(flex)')).toBe(false);
    });

    it('a false general-enclosed term still participates in the algebra', () => {
      expect(matchSupports('(color: red) or selector(a:hover)')).toBe(true);
      expect(matchSupports('not selector(a:hover)')).toBe(true);
    });
  });

  describe('render-level bucket gating', () => {
    it('a matching @supports bucket applies its styles', () => {
      const El = styled.View`
        background-color: blue;
        @supports (display: flex) {
          background-color: red;
        }
      `;
      expect(styleOf(El).backgroundColor).toBe('red');
    });

    it('a failing @supports bucket leaves the base styles alone', () => {
      const El = styled.View`
        background-color: blue;
        @supports (backdrop-filter: blur(4px)) {
          background-color: red;
        }
      `;
      expect(styleOf(El).backgroundColor).toBe('blue');
    });

    it('not-form gates the graceful-degradation bucket on', () => {
      const El = styled.View`
        background-color: blue;
        @supports not (backdrop-filter: blur(4px)) {
          background-color: red;
        }
      `;
      expect(styleOf(El).backgroundColor).toBe('red');
    });

    it('a condition that previously matched as a media query no longer does', () => {
      // The regression this suite locks: supports conditions used to be
      // routed through the media-query matcher, where `(color: red)`
      // parses as an unknown media feature and silently mismatched.
      const El = styled.View`
        background-color: blue;
        @supports (color: red) {
          background-color: red;
        }
      `;
      expect(styleOf(El).backgroundColor).toBe('red');
    });
  });
});
