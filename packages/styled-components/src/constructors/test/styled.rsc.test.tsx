/**
 * @jest-environment node
 */

// Mock React.cache (not available in React 18 test env, but needed for RSC dedup)
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
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { mainSheet } from '../../models/StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';
import styled, { css, keyframes } from '../../index';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import stylisPluginRSC from '../../utils/stylisPluginRSC';

/** Extract all CSS rule text from <style> tags in rendered HTML */
const extractStyleContents = (html: string): string =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('');

/** Count <style> tags in rendered HTML */
const countStyleTags = (html: string): number => (html.match(/<style[^>]*>/g) || []).length;

describe('styled RSC mode', () => {
  beforeEach(() => {
    mockCacheStore.clear();
    resetGroupIds();
    mainSheet.gs = {};
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  describe('RSC style tag emission (#5672)', () => {
    it('should emit inline style tags without precedence', () => {
      const Button = styled.button`
        padding: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Button />);

      // Inline <style> tag emitted (no precedence — server component output
      // isn't hydrated, so no mismatch; inline body styles come after
      // registry <head> styles for correct cascade ordering)
      expect(html).toContain('<style');
      expect(html).not.toContain('precedence');
      expect(html).not.toContain('data-styled-rsc');
    });

    it('should emit base and extension CSS in one tag with :where() on base (#5672)', () => {
      const Base = styled.div`
        display: flex;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Both base and extension CSS present
      expect(allCSS).toContain('display:flex');
      expect(allCSS).toContain('color:red');

      // Base CSS wrapped in :where() for zero specificity — prevents
      // duplicate base CSS in sibling extensions from overriding
      // earlier extensions' styles
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:flex/);
      // Extension CSS uses normal selector
      expect(allCSS).toMatch(/\.\w+\{[^}]*color:red/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
    });
  });

  describe('base component CSS in RSC output (#5663)', () => {
    // In RSC mode, each component's CSS is retrieved via getGroup() which only
    // returns rules for that component's own group. When extending a base component,
    // the base's CSS is injected into the sheet but never output in a <style> tag
    // unless the base is also rendered independently. This causes missing styles.

    it('should include base component CSS when only the extended component renders', () => {
      // This is the core bug from #5663: IconWrapper's width/height lost
      // when only the extended component is rendered in RSC mode.
      const IconWrapper = styled.svg`
        width: 24px;
        height: 24px;
        display: inline-block;
        vertical-align: middle;
      `;
      const BrandIcon = styled(IconWrapper)`
        fill: currentColor;
        color: #007bff;
      `;

      const html = ReactDOMServer.renderToString(
        <BrandIcon viewBox="0 0 24 24">
          <path d="M12 2L2 22h20z" />
        </BrandIcon>
      );
      const allCSS = extractStyleContents(html);

      // All CSS from both base and extended must be present in the RSC output.
      // The element has class names for both, so both rulesets must exist.
      expect(allCSS).toContain('width:24px');
      expect(allCSS).toContain('height:24px');
      expect(allCSS).toContain('display:inline-block');
      expect(allCSS).toContain('vertical-align:middle');
      expect(allCSS).toContain('fill:currentColor');
      expect(allCSS).toContain('color:#007bff');
    });

    it('should include all ancestor CSS across a three-level inheritance chain', () => {
      const BaseText = styled.span`
        font-family: system-ui, sans-serif;
        line-height: 1.5;
      `;
      const Heading = styled(BaseText).attrs({ as: 'h2' })`
        font-weight: 700;
        font-size: 24px;
      `;
      const PageTitle = styled(Heading)`
        color: #1a1a2e;
        margin-bottom: 16px;
      `;

      const html = ReactDOMServer.renderToString(<PageTitle>Hello World</PageTitle>);
      const allCSS = extractStyleContents(html);

      // Every level in the chain must contribute its CSS rules
      expect(allCSS).toContain('font-family:system-ui,sans-serif');
      expect(allCSS).toContain('line-height:1.5');
      expect(allCSS).toContain('font-weight:700');
      expect(allCSS).toContain('font-size:24px');
      expect(allCSS).toContain('color:#1a1a2e');
      expect(allCSS).toContain('margin-bottom:16px');
    });

    it('should preserve base CSS with dynamic interpolations in the extended component', () => {
      const Card = styled.div`
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        overflow: hidden;
      `;
      const StatusCard = styled(Card)<{ $status: 'success' | 'error' }>`
        border-left: 4px solid ${p => (p.$status === 'success' ? '#28a745' : '#dc3545')};
        padding: 16px;
      `;

      const html = ReactDOMServer.renderToString(<StatusCard $status="error" />);
      const allCSS = extractStyleContents(html);

      // Base Card styles must be present even though only StatusCard renders
      expect(allCSS).toContain('border-radius:8px');
      expect(allCSS).toContain('overflow:hidden');
      // Extended styles with resolved interpolation
      expect(allCSS).toContain('#dc3545');
      expect(allCSS).toContain('padding:16px');
    });

    it('should include base CSS with the css helper used in interpolation', () => {
      const truncate = css`
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      `;
      const BaseLabel = styled.span`
        font-size: 14px;
        ${truncate}
      `;
      const BadgeLabel = styled(BaseLabel)`
        background: #e9ecef;
        border-radius: 12px;
        padding: 2px 8px;
      `;

      const html = ReactDOMServer.renderToString(<BadgeLabel>Status</BadgeLabel>);
      const allCSS = extractStyleContents(html);

      // Base CSS (including interpolated css`` helper) must be present
      expect(allCSS).toContain('font-size:14px');
      expect(allCSS).toContain('text-overflow:ellipsis');
      expect(allCSS).toContain('white-space:nowrap');
      // Extended styles
      expect(allCSS).toContain('border-radius:12px');
      expect(allCSS).toContain('padding:2px 8px');
    });

    it('should correctly output CSS when base and extended render on the same page', () => {
      const Avatar = styled.img`
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      `;
      const LargeAvatar = styled(Avatar)`
        width: 96px;
        height: 96px;
        border: 3px solid #fff;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Avatar src="/small.jpg" alt="small" />
          <LargeAvatar src="/large.jpg" alt="large" />
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Avatar's base styles should be present
      expect(allCSS).toContain('border-radius:50%');
      expect(allCSS).toContain('object-fit:cover');
      // LargeAvatar's own styles
      expect(allCSS).toContain('border:3px solid #fff');
    });

    it('should not duplicate base CSS when base and extended render on the same page', () => {
      const Base = styled.div`
        display: flex;
        padding: 16px;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Base />
          <Extended />
        </div>
      );

      // Base and Extended produce different CSS strings (Extended has :where()
      // wrapping on base CSS), so both emit their own <style> tag.
      expect(countStyleTags(html)).toBe(2);

      // All CSS should be present
      const allCSS = extractStyleContents(html);
      expect(allCSS).toContain('display:flex');
      expect(allCSS).toContain('padding:16px');
      expect(allCSS).toContain('color:red');
    });

    it('should preserve CSS for multiple siblings extending the same base', () => {
      const BaseButton = styled.button`
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      `;
      const PrimaryButton = styled(BaseButton)`
        background: #007bff;
        color: #fff;
      `;
      const DangerButton = styled(BaseButton)`
        background: #dc3545;
        color: #fff;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <PrimaryButton>Save</PrimaryButton>
          <DangerButton>Delete</DangerButton>
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Base styles must be present for both variants
      expect(allCSS).toContain('cursor:pointer');
      expect(allCSS).toContain('border-radius:4px');
      expect(allCSS).toContain('font-size:14px');
      // Each variant's own styles
      expect(allCSS).toContain('#007bff');
      expect(allCSS).toContain('#dc3545');
    });

    it('should not lose CSS when a dynamic base renders with different props', () => {
      // Regression: if href is only componentId (not content-aware), React 19
      // deduplicates all <style> tags for the same base component, keeping only
      // the first one. Later prop variants' CSS would be lost.
      const DynamicBase = styled.div<{ $bg: string }>`
        background: ${p => p.$bg};
        padding: 16px;
      `;
      const Extended = styled(DynamicBase)`
        border: 1px solid #ccc;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Extended $bg="red" />
          <Extended $bg="blue" />
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Both dynamic variants must be present
      expect(allCSS).toContain('background:red');
      expect(allCSS).toContain('background:blue');
      expect(allCSS).toContain('border:1px solid #ccc');
    });
  });

  describe(':where() wrapping', () => {
    /** Assert every :where() in the CSS contains a valid, complete class selector */
    function assertValidWhereSelectors(allCSS: string) {
      const whereMatches = [...allCSS.matchAll(/:where\((\.[^)]+)\)/g)];
      expect(whereMatches.length).toBeGreaterThan(0);
      for (const match of whereMatches) {
        expect(match[1]).toMatch(/^\.\w[\w-]*$/);
      }
    }

    it('should wrap base selectors and keep extension selectors normal (#5672)', () => {
      const Base = styled.div`
        width: 100px;
      `;
      const Extended = styled(Base)`
        width: 200px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*width:100px/);
      expect(allCSS).toMatch(/\.\w+\{[^}]*width:200px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*width:200px/);
      expect(allCSS).not.toMatch(/\.(\w+)\.\1/);
    });

    it('should wrap pseudo-class selectors on the base', () => {
      const Base = styled.button`
        color: blue;
        &:hover {
          color: darkblue;
        }
        &:focus {
          outline: 2px solid blue;
        }
      `;
      const Extended = styled(Base)`
        background: white;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Base hover/focus selectors should be :where()-wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\):hover/);
      expect(allCSS).toMatch(/:where\(\.\w+\):focus/);
      // Base root selector also wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:blue/);
      // Extension CSS not wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*background:white/);
    });

    it('should wrap pseudo-element selectors on the base', () => {
      const Base = styled.div`
        &::before {
          content: '';
          display: block;
        }
        &::after {
          content: '';
          clear: both;
        }
      `;
      const Extended = styled(Base)`
        overflow: hidden;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatch(/:where\(\.\w+\)::before/);
      expect(allCSS).toMatch(/:where\(\.\w+\)::after/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*overflow:hidden/);
    });

    it('should wrap base selectors inside media queries', () => {
      const Base = styled.div`
        font-size: 14px;
        @media (min-width: 768px) {
          font-size: 16px;
        }
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Both the root and media query base selectors should be wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*font-size:14px/);
      expect(allCSS).toContain('@media');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*font-size:16px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
    });

    it('should wrap nested descendant selectors on the base', () => {
      const Base = styled.div`
        & > span {
          font-weight: bold;
        }
        & .child {
          margin: 4px;
        }
      `;
      const Extended = styled(Base)`
        padding: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Descendant/child combinators should have base class wrapped
      // renderToString HTML-encodes `>` as `&gt;`
      expect(allCSS).toMatch(/:where\(\.\w+\)&gt;span/);
      expect(allCSS).toMatch(/:where\(\.\w+\) \.child/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*padding:8px/);
    });

    it('should wrap all levels in a 3-deep chain except the leaf', () => {
      const A = styled.div`
        color: red;
      `;
      const B = styled(A)`
        color: green;
      `;
      const C = styled(B)`
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(<C />);
      const allCSS = extractStyleContents(html);

      // A (grandparent) and B (parent) are base levels → :where()
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:green/);
      // C (leaf) is the component being rendered → normal selector
      expect(allCSS).toMatch(/\.\w+\{[^}]*color:blue/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:blue/);
    });

    it('should not wrap period-prefixed strings inside CSS values', () => {
      const Base = styled.div`
        &::before {
          content: '.item';
        }
        background: url('./bg.png');
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // renderToString HTML-encodes quotes (&#x27;)
      expect(allCSS).toContain('content:&#x27;.item&#x27;');
      expect(allCSS).toContain('url(&#x27;./bg.png&#x27;)');
      expect(allCSS).not.toMatch(/:where\([^)]*\.item/);
      expect(allCSS).not.toMatch(/:where\([^)]*\.\/bg/);
      assertValidWhereSelectors(allCSS);
    });

    it('should not corrupt longer class names that share a prefix with shorter ones', () => {
      const DynamicBase = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;
      const Extended = styled(DynamicBase)`
        font-size: 16px;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Extended $color="red" />
          <Extended $color="blue" />
        </div>
      );
      const allCSS = extractStyleContents(html);

      assertValidWhereSelectors(allCSS);
      expect(allCSS).toContain('color:red');
      expect(allCSS).toContain('color:blue');
      expect(allCSS).toContain('font-size:16px');
    });

    it('should handle siblings extending the same base with overriding properties', () => {
      const BaseBox = styled.div`
        display: flex;
        padding: 16px;
        background: white;
      `;
      const RedBox = styled(BaseBox)`
        background: red;
      `;
      const BlueBox = styled(BaseBox)`
        background: blue;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <RedBox />
          <BlueBox />
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Base CSS wrapped in :where() so it doesn't override extensions
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*background:white/);
      // Extension CSS uses normal selectors and wins the cascade
      expect(allCSS).toContain('background:red');
      expect(allCSS).toContain('background:blue');
      // Both extension selectors must NOT be wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*background:red/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*background:blue/);
    });

    it('should wrap base with compound selectors (multiple pseudo-classes)', () => {
      const Base = styled.input`
        border: 1px solid gray;
        &:focus:not(:disabled) {
          border-color: blue;
        }
        &:disabled {
          opacity: 0.5;
        }
      `;
      const Extended = styled(Base)`
        padding: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Compound pseudo-class selectors should be wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\):focus:not\(:disabled\)/);
      expect(allCSS).toMatch(/:where\(\.\w+\):disabled/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*padding:8px/);
    });

    it('should wrap base selectors with attribute selectors', () => {
      const Base = styled.div`
        &[data-active] {
          background: yellow;
        }
        &[role='button'] {
          cursor: pointer;
        }
      `;
      const Extended = styled(Base)`
        display: inline;
      `;

      const html = ReactDOMServer.renderToString(<Extended data-active role="button" />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toMatch(/:where\(\.\w+\)\[data-active\]/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*display:inline/);
    });

    it('should wrap base with multiple comma-separated selectors', () => {
      const Base = styled.div`
        &:hover,
        &:focus {
          outline: 2px solid blue;
        }
      `;
      const Extended = styled(Base)`
        color: black;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Both selectors in the comma list should be wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\):hover/);
      expect(allCSS).toMatch(/:where\(\.\w+\):focus/);
      expect(allCSS).toContain('outline:2px solid blue');
    });

    it('should wrap dynamic base that changes class names across renders', () => {
      const DynamicBase = styled.div<{ $size: string }>`
        width: ${p => p.$size};
        height: ${p => p.$size};
      `;
      const Card = styled(DynamicBase)`
        border: 1px solid gray;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Card $size="100px" />
          <Card $size="200px" />
          <Card $size="300px" />
        </div>
      );
      const allCSS = extractStyleContents(html);

      // All three base variants should be :where()-wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*width:100px/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*width:200px/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*width:300px/);
      // Extension CSS not wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*border:1px solid gray/);
      // All :where() selectors must be valid
      assertValidWhereSelectors(allCSS);
    });

    it('should wrap base with nested @supports queries', () => {
      const Base = styled.div`
        display: flex;
        @supports (display: grid) {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
      `;
      const Extended = styled(Base)`
        gap: 16px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('@supports');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:flex/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:grid/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*gap:16px/);
    });

    it('should only wrap the top-most component when rendering mid-chain', () => {
      const A = styled.div`
        color: red;
      `;
      const B = styled(A)`
        color: green;
      `;

      // Render B directly (not C extending B) — A is base, B is leaf
      const html = ReactDOMServer.renderToString(<B />);
      const allCSS = extractStyleContents(html);

      // A (base) is wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
      // B (leaf being rendered) is NOT wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:green/);
    });

    it('should not wrap a standalone component with no base', () => {
      const Solo = styled.div`
        color: purple;
      `;

      const html = ReactDOMServer.renderToString(<Solo />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('color:purple');
      // No :where() at all — no base to wrap
      expect(allCSS).not.toContain(':where(');
    });
  });

  describe('cross-boundary extension (#5672)', () => {
    // Simulates the RSC boundary: styled(ClientComponent) where the target
    // is a non-styled React component (like an RSC client reference proxy).
    // isStyledComponent(target) returns false, baseStyle is undefined,
    // but the extension should still produce correct CSS.

    it('should generate CSS when extending a non-styled component', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const DangerButton = styled(ClientButton)`
        background: #dc2626;
        color: white;
      `;

      const html = ReactDOMServer.renderToString(<DangerButton>Delete</DangerButton>);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('background:#dc2626');
      expect(allCSS).toContain('color:white');
    });

    it('should pass className through to the wrapped component', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const ExtButton = styled(ClientButton)`
        padding: 12px;
      `;

      const html = ReactDOMServer.renderToString(<ExtButton>Click</ExtButton>);

      // The rendered button should have the generated className
      expect(html).toMatch(/class="[^"]*sc-[^"]*"/);
      // CSS should be in a style tag
      expect(html).toContain('<style');
      expect(html).toContain('padding:12px');
    });

    it('should not use precedence on cross-boundary style tags', () => {
      const ClientComp = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const Extended = styled(ClientComp)`
        margin: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);

      // No precedence — inline style tags avoid Float merging/stripping
      expect(html).not.toContain('precedence');
      expect(html).not.toContain('data-precedence');
      expect(html).toContain('margin:8px');
    });

    it('should handle multiple cross-boundary extensions of different components', () => {
      const ClientCard = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const DangerCard = styled(ClientCard)`
        border: 2px solid red;
      `;
      const PrimaryButton = styled(ClientButton)`
        background: blue;
      `;

      const html = ReactDOMServer.renderToString(
        <DangerCard>
          <PrimaryButton>Click</PrimaryButton>
        </DangerCard>
      );
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('border:2px solid red');
      expect(allCSS).toContain('background:blue');
    });

    it('should forward props through cross-boundary extensions', () => {
      const ClientInput = (props: React.JSX.IntrinsicElements['input']) => <input {...props} />;

      const StyledInput = styled(ClientInput)`
        border: 1px solid gray;
      `;

      const html = ReactDOMServer.renderToString(
        <StyledInput type="email" placeholder="test@example.com" />
      );

      expect(html).toContain('type="email"');
      expect(html).toContain('placeholder="test@example.com"');
    });

    it('should support dynamic interpolations in cross-boundary extensions', () => {
      const ClientBox = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;

      const ColorBox = styled(ClientBox)<{ $bg: string }>`
        background: ${p => p.$bg};
        padding: 16px;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <ColorBox $bg="red">Red</ColorBox>
          <ColorBox $bg="blue">Blue</ColorBox>
        </div>
      );
      const allCSS = extractStyleContents(html);

      // Both dynamic variants should have their CSS emitted
      expect(allCSS).toContain('background:red');
      expect(allCSS).toContain('background:blue');
      expect(allCSS).toContain('padding:16px');
    });

    it('should support attrs on cross-boundary extensions', () => {
      const ClientButton = (props: React.JSX.IntrinsicElements['button']) => <button {...props} />;

      const SubmitButton = styled(ClientButton).attrs({ type: 'submit' })`
        font-weight: bold;
      `;

      const html = ReactDOMServer.renderToString(<SubmitButton>Submit</SubmitButton>);

      expect(html).toContain('type="submit"');
      expect(extractStyleContents(html)).toContain('font-weight:bold');
    });

    it('should produce each style tag after its component element for correct source ordering', () => {
      const ClientBase = (props: React.JSX.IntrinsicElements['div']) => <div {...props} />;

      const Extended = styled(ClientBase)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);

      // The <style> tag should appear before the element in the HTML
      // (Fragment renders style first, then element) so it's available
      // before the element that references it
      const styleIdx = html.indexOf('<style');
      const divIdx = html.indexOf('<div');
      expect(styleIdx).toBeGreaterThan(-1);
      expect(divIdx).toBeGreaterThan(-1);
      expect(styleIdx).toBeLessThan(divIdx);
    });
  });

  describe(':where() adversarial CSS fuzzing', () => {
    /** Assert every :where() in the CSS contains a valid, complete class selector */
    function assertValidWhereSelectors(allCSS: string) {
      const whereMatches = [...allCSS.matchAll(/:where\((\.[^)]+)\)/g)];
      for (const match of whereMatches) {
        expect(match[1]).toMatch(/^\.\w[\w-]*$/);
      }
    }

    /** Assert no :where() wrapping exists inside CSS string values (content, url, attr selectors) */
    function assertNoWhereInValues(allCSS: string, ...substrings: string[]) {
      for (const s of substrings) {
        // The substring should appear verbatim (possibly HTML-encoded) without :where() corruption
        expect(allCSS).not.toMatch(
          new RegExp(':where\\([^)]*' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')')
        );
      }
    }

    it('should not corrupt CSS content property with class-name-like strings', () => {
      const Base = styled.div`
        &::before {
          content: '.sc-something';
        }
        padding: 8px;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // The content value should be preserved (HTML-encoded quotes)
      expect(allCSS).toContain('.sc-something');
      // Base CSS should be :where()-wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*padding:8px/);
      // Extension CSS not wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
      assertValidWhereSelectors(allCSS);
    });

    it('should not corrupt CSS url() values with dots', () => {
      const Base = styled.div`
        background: url(./../image.png);
        display: block;
      `;
      const Extended = styled(Base)`
        color: green;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // url() value should not be corrupted by :where() wrapping
      // (dots in paths are not class selectors)
      expect(allCSS).toContain('image.png');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:block/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:green/);
      assertValidWhereSelectors(allCSS);
    });

    it('should not corrupt attribute selectors with dot-prefixed values', () => {
      const Base = styled.div`
        &[data-value='.foo'] {
          background: yellow;
        }
        margin: 4px;
      `;
      const Extended = styled(Base)`
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // The attribute value .foo should not become :where(.foo)
      expect(allCSS).toContain('background:yellow');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*margin:4px/);
      assertValidWhereSelectors(allCSS);
    });

    it('should not double-wrap user CSS that already contains :where()', () => {
      const Base = styled.div`
        :where(.other) {
          color: red;
        }
        padding: 12px;
      `;
      const Extended = styled(Base)`
        margin: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // The user's :where(.other) should not become :where(:where(.other))
      expect(allCSS).not.toContain(':where(:where(');
      expect(allCSS).toContain('color:red');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*padding:12px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*margin:8px/);
    });

    it('should not corrupt @supports selector() at-rules', () => {
      const Base = styled.div`
        display: flex;
        @supports selector(.test) {
          display: grid;
        }
      `;
      const Extended = styled(Base)`
        gap: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // @supports content should be preserved
      expect(allCSS).toContain('@supports');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:flex/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*gap:8px/);
      assertValidWhereSelectors(allCSS);
    });

    it('should handle @container queries with nested selectors', () => {
      const Base = styled.div`
        container-type: inline-size;
        @container (min-width: 300px) {
          & {
            font-size: 18px;
          }
        }
      `;
      const Extended = styled(Base)`
        color: navy;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('container-type:inline-size');
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:navy/);
      assertValidWhereSelectors(allCSS);
    });

    it('should not corrupt CSS custom properties with class-name-like values', () => {
      const Base = styled.div`
        --my-var: .something;
        color: var(--my-var);
      `;
      const Extended = styled(Base)`
        font-size: 14px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // The custom property value .something should be preserved
      expect(allCSS).toContain('.something');
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*font-size:14px/);
      assertValidWhereSelectors(allCSS);
    });

    it('should handle many comma-separated selectors on the base', () => {
      const Base = styled.div`
        &:hover,
        &:focus,
        &:active,
        &:visited,
        &:first-child,
        &:last-child,
        &:nth-child(2),
        &:nth-child(3),
        &:nth-child(4),
        &:nth-child(5),
        &:not(:disabled) {
          outline: none;
        }
      `;
      const Extended = styled(Base)`
        border: 1px solid black;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // All pseudo-class selectors in the comma list should be :where()-wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\):hover/);
      expect(allCSS).toMatch(/:where\(\.\w+\):focus/);
      expect(allCSS).toMatch(/:where\(\.\w+\):active/);
      expect(allCSS).toMatch(/:where\(\.\w+\):first-child/);
      expect(allCSS).toMatch(/:where\(\.\w+\):last-child/);
      expect(allCSS).toMatch(/:where\(\.\w+\):not\(:disabled\)/);
      expect(allCSS).toContain('outline:none');
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*border:1px solid black/);
    });

    it('should not corrupt animation-name that looks like a class prefix', () => {
      const Base = styled.div`
        animation-name: sc-keyframes-abc;
        animation-duration: 1s;
      `;
      const Extended = styled(Base)`
        opacity: 1;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // animation-name value should not be wrapped
      expect(allCSS).toContain('sc-keyframes-abc');
      expect(allCSS).not.toContain(':where(sc-keyframes-abc)');
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*opacity:1/);
      assertValidWhereSelectors(allCSS);
    });

    it('should wrap base class at all nesting levels in deep at-rule nesting', () => {
      const Base = styled.div`
        color: black;
        @media (min-width: 768px) {
          color: gray;
          @supports (display: grid) {
            display: grid;
          }
        }
      `;
      const Extended = styled(Base)`
        font-weight: bold;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Base selectors at all nesting levels should be wrapped
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:black/);
      expect(allCSS).toContain('@media');
      expect(allCSS).toContain('@supports');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:gray/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:grid/);
      // Extension not wrapped
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*font-weight:bold/);
    });

    it('should not interfere with !important declarations', () => {
      const Base = styled.div`
        color: red !important;
        display: flex;
      `;
      const Extended = styled(Base)`
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // !important should be preserved on the :where()-wrapped base rule
      // (stylis minifies the space before !important)
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*color:red\s?!important/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*display:flex/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:blue/);
    });

    it('should handle unicode escapes near class references', () => {
      const Base = styled.div`
        &::before {
          content: '\\2022';
        }
        margin: 0;
      `;
      const Extended = styled(Base)`
        padding: 4px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('2022');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*margin:0/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*padding:4px/);
      assertValidWhereSelectors(allCSS);
    });

    it('should wrap all base levels correctly in A -> B -> C chain', () => {
      const A = styled.div`
        font-size: 12px;
        &:hover {
          font-size: 14px;
        }
      `;
      const B = styled(A)`
        font-size: 16px;
        &:hover {
          font-size: 18px;
        }
      `;
      const C = styled(B)`
        font-size: 20px;
        &:hover {
          font-size: 22px;
        }
      `;

      const html = ReactDOMServer.renderToString(<C />);
      const allCSS = extractStyleContents(html);

      // A and B are base levels -> :where()
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*font-size:12px/);
      expect(allCSS).toMatch(/:where\(\.\w+\):hover\{[^}]*font-size:14px/);
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*font-size:16px/);
      expect(allCSS).toMatch(/:where\(\.\w+\):hover\{[^}]*font-size:18px/);
      // C is the leaf -> NOT wrapped
      expect(allCSS).toMatch(/\.\w+\{[^}]*font-size:20px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*font-size:20px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\):hover\{[^}]*font-size:22px/);
    });

    it('should handle component selector interpolation in base CSS', () => {
      const OtherComponent = styled.span`
        color: purple;
      `;
      const Base = styled.div`
        ${OtherComponent} {
          font-weight: bold;
        }
        padding: 8px;
      `;
      const Extended = styled(Base)`
        margin: 16px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // The OtherComponent's class selector should appear in the CSS
      // and the base's own class should be :where()-wrapped
      expect(allCSS).toContain('font-weight:bold');
      expect(allCSS).toMatch(/:where\(\.\w+\)\{[^}]*padding:8px/);
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*margin:16px/);
      assertValidWhereSelectors(allCSS);
    });

    it('should handle base with empty/whitespace-only CSS', () => {
      const Base = styled.div``;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      // Extension CSS should be present and not wrapped
      expect(allCSS).toContain('color:red');
      expect(allCSS).not.toMatch(/:where\(\.\w+\)\{[^}]*color:red/);
    });
  });

  describe('RSC style tag deduplication', () => {
    it('should emit only one style tag for multiple instances of the same static component', () => {
      const Button = styled.button`
        padding: 8px;
        color: blue;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Button>A</Button>
          <Button>B</Button>
          <Button>C</Button>
          <Button>D</Button>
          <Button>E</Button>
        </div>
      );

      expect(countStyleTags(html)).toBe(1);
      expect(extractStyleContents(html)).toContain('padding:8px');
    });

    it('should emit only one style tag for dynamic components with identical props', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Box $color="red" />
          <Box $color="red" />
          <Box $color="red" />
        </div>
      );

      expect(countStyleTags(html)).toBe(1);
      expect(extractStyleContents(html)).toContain('color:red');
    });

    it('should emit separate style tags for dynamic components with different props', () => {
      const Box = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Box $color="red" />
          <Box $color="blue" />
          <Box $color="green" />
        </div>
      );

      expect(countStyleTags(html)).toBe(3);
      const allCSS = extractStyleContents(html);
      expect(allCSS).toContain('color:red');
      expect(allCSS).toContain('color:blue');
      expect(allCSS).toContain('color:green');
    });

    it('should deduplicate across multiple instances of extended component', () => {
      const Base = styled.div`
        display: flex;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Extended />
          <Extended />
          <Extended />
        </div>
      );

      // All three Extended instances produce the same CSS → one tag
      expect(countStyleTags(html)).toBe(1);
      const allCSS = extractStyleContents(html);
      expect(allCSS).toContain('display:flex');
      expect(allCSS).toContain('color:red');
    });

    it('should emit separate tags for base and extended rendered together', () => {
      const Base = styled.div`
        display: flex;
      `;
      const Extended = styled(Base)`
        color: red;
      `;

      const html = ReactDOMServer.renderToString(
        <div>
          <Base />
          <Extended />
        </div>
      );

      // Base emits its own CSS, Extended emits base(:where())+extension
      // These are different CSS strings, so both get their own tag
      expect(countStyleTags(html)).toBe(2);
    });
  });

  describe('RSC keyframe emission', () => {
    it('should emit keyframes in a dedicated style tag', () => {
      const pulse = keyframes`
        0% { opacity: 1; }
        100% { opacity: 0; }
      `;

      const Dot = styled.div`
        animation: ${pulse} 2s infinite;
      `;

      const html = ReactDOMServer.renderToString(<Dot />);

      expect(extractStyleContents(html)).toMatchInlineSnapshot(`
        "@keyframes gZZrBJ{0%{opacity:1;}100%{opacity:0;}}/*!sc*/
        .gFlEQA{animation:gZZrBJ 2s infinite;}/*!sc*/
        "
      `);
      expect(countStyleTags(html)).toBe(2);
    });

    it('should deduplicate keyframes across multiple components', () => {
      const fade = keyframes`
        0% { opacity: 1; }
        100% { opacity: 0; }
      `;

      const A = styled.div`
        animation: ${fade} 1s;
      `;
      const B = styled.span`
        animation: ${fade} 2s;
      `;

      const html = ReactDOMServer.renderToString(
        <>
          <A />
          <B />
        </>
      );

      // @keyframes should appear exactly once despite two components using it
      expect(extractStyleContents(html)).toMatchInlineSnapshot(`
        "@keyframes gZZrBJ{0%{opacity:1;}100%{opacity:0;}}/*!sc*/
        .ckIbam{animation:gZZrBJ 1s;}/*!sc*/
        .ggSqLC{animation:gZZrBJ 2s;}/*!sc*/
        "
      `);
      expect(countStyleTags(html)).toBe(3);
    });

    it('should emit keyframes even when component CSS is deduped', () => {
      const spin = keyframes`
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      `;

      const Spinner = styled.div`
        animation: ${spin} 1s linear infinite;
      `;

      const html = ReactDOMServer.renderToString(
        <>
          <Spinner />
          <Spinner />
        </>
      );

      // Two instances, but only one set of styles (component CSS + keyframe both deduped)
      expect(extractStyleContents(html)).toMatchInlineSnapshot(`
        "@keyframes dnfVul{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}/*!sc*/
        .JSmtD{animation:dnfVul 1s linear infinite;}/*!sc*/
        "
      `);
      expect(countStyleTags(html)).toBe(2);
    });
  });

  describe('StyleSheetManager in RSC', () => {
    it('should apply stylisPlugins to RSC output', () => {
      const Item = styled.li`
        &:first-child {
          color: red;
        }
        &:last-child {
          color: blue;
        }
        &:nth-child(2) {
          color: green;
        }
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement(
          StyleSheetManager,
          { stylisPlugins: [stylisPluginRSC] },
          React.createElement(
            'ul',
            null,
            React.createElement(Item, null, 'First'),
            React.createElement(Item, null, 'Second'),
            React.createElement(Item, null, 'Third')
          )
        )
      );

      const allCSS = extractStyleContents(html);
      expect(allCSS).toContain(':nth-child(1 of :not(style[data-styled]))');
      expect(allCSS).toContain(':nth-last-child(1 of :not(style[data-styled]))');
      expect(allCSS).toContain(':nth-child(2 of :not(style[data-styled]))');
      expect(allCSS).not.toContain(':first-child');
      expect(allCSS).not.toContain(':last-child');
    });

    it('should use default stylis when no plugins provided', () => {
      const Item = styled.li`
        &:first-child {
          color: red;
        }
      `;

      const html = ReactDOMServer.renderToString(
        React.createElement('ul', null, React.createElement(Item, null, 'First'))
      );

      const allCSS = extractStyleContents(html);
      expect(allCSS).toContain(':first-child');
      expect(allCSS).not.toContain(':not(style');
    });
  });
});
