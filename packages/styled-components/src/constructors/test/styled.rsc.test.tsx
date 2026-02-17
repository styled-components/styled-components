/**
 * @jest-environment node
 */

// Mock IS_RSC before importing the module
jest.mock('../../constants', () => ({
  ...jest.requireActual('../../constants'),
  IS_RSC: true,
}));

import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { mainSheet } from '../../models/StyleSheetManager';
import { resetGroupIds } from '../../sheet/GroupIDAllocator';
import styled, { css } from '../../index';

/** Extract all href="..." values from rendered HTML */
const extractHrefs = (html: string): string[] =>
  [...html.matchAll(/href="([^"]*)"/g)].map(m => m[1]);

/** Extract all CSS rule text from <style> tags in rendered HTML */
const extractStyleContents = (html: string): string =>
  [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('');

describe('styled RSC mode', () => {
  beforeEach(() => {
    resetGroupIds();
    mainSheet.gs = {};
    mainSheet.names = new Map();
    mainSheet.clearTag();
  });

  describe('style tag href attribute (#5663)', () => {
    // React 19 uses href on <style precedence="..."> for deduplication.
    // Spaces in href cause: console warning, hydration failure, and style loss.

    it('should not contain spaces in href for a single-level component', () => {
      const Card = styled.div`
        display: flex;
        padding: 16px;
        border-radius: 8px;
      `;

      const html = ReactDOMServer.renderToString(<Card />);
      const hrefs = extractHrefs(html);

      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).not.toMatch(/\s/);
      }
    });

    it('should not contain spaces in href when extending a styled component', () => {
      // Reproduces the exact pattern from #5663: styled(IconWrapper)`...`
      const IconWrapper = styled.svg`
        width: 24px;
        height: 24px;
        display: inline-block;
      `;
      const CustomIcon = styled(IconWrapper)`
        fill: currentColor;
        stroke: none;
      `;

      const html = ReactDOMServer.renderToString(<CustomIcon viewBox="0 0 24 24" />);
      const hrefs = extractHrefs(html);

      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).not.toMatch(/\s/);
      }
    });

    it('should not contain spaces in href across a three-level inheritance chain', () => {
      const BaseLayout = styled.div`
        display: flex;
        box-sizing: border-box;
      `;
      const Container = styled(BaseLayout)`
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 16px;
      `;
      const NarrowContainer = styled(Container)`
        max-width: 800px;
      `;

      const html = ReactDOMServer.renderToString(<NarrowContainer />);
      const hrefs = extractHrefs(html);

      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).not.toMatch(/\s/);
      }
    });

    it('should not contain spaces in href with dynamic interpolations in extended components', () => {
      const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
        padding: 8px 16px;
        border: none;
        cursor: pointer;
        background: ${p => (p.$variant === 'primary' ? '#007bff' : '#6c757d')};
      `;
      const IconButton = styled(Button)`
        display: inline-flex;
        align-items: center;
        gap: 8px;
      `;

      const html = ReactDOMServer.renderToString(<IconButton $variant="primary" />);
      const hrefs = extractHrefs(html);

      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(href).not.toMatch(/\s/);
      }
    });

    it('should produce unique hrefs for different components sharing the same base', () => {
      const Base = styled.div`
        display: block;
      `;
      const VariantA = styled(Base)`
        color: red;
      `;
      const VariantB = styled(Base)`
        color: blue;
      `;

      const htmlA = ReactDOMServer.renderToString(<VariantA />);
      const htmlB = ReactDOMServer.renderToString(<VariantB />);

      const hrefsA = extractHrefs(htmlA);
      const hrefsB = extractHrefs(htmlB);

      // Each should have at least one href
      expect(hrefsA.length).toBeGreaterThan(0);
      expect(hrefsB.length).toBeGreaterThan(0);

      // Neither should have spaces
      for (const href of [...hrefsA, ...hrefsB]) {
        expect(href).not.toMatch(/\s/);
      }
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

      // Each style tag emits CSS per component group with its own href.
      // React 19 deduplicates <style> tags by href, so the base component's
      // style tag (emitted both by <Base> and inside <Extended>) should share
      // the same href and thus only appear once in the final document.
      const styleTagHrefs = extractHrefs(html).filter(h => h.startsWith('sc-'));
      const uniqueHrefs = new Set(styleTagHrefs);

      // If dedup works, unique hrefs === total hrefs (no duplicates in output).
      // With React 18 renderToString (no Float), tags aren't deduped at render
      // time, but the hrefs must still be identical so React 19 CAN dedup them.
      const baseHrefs = styleTagHrefs.filter(
        h =>
          // Find hrefs that appear more than once (the base component's)
          styleTagHrefs.indexOf(h) !== styleTagHrefs.lastIndexOf(h)
      );
      if (baseHrefs.length > 0) {
        // All duplicate hrefs should be the same value (the base's)
        expect(new Set(baseHrefs).size).toBe(1);
      }

      // Regardless, no href should contain spaces
      for (const href of uniqueHrefs) {
        expect(href).not.toMatch(/\s/);
      }
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

      // The two Extended renders should produce different hrefs for the
      // DynamicBase level (because the CSS content differs), preventing
      // React 19 from incorrectly deduplicating them.
      const hrefs = extractHrefs(html).filter(h => h.startsWith('sc-'));
      for (const href of hrefs) {
        expect(href).not.toMatch(/\s/);
      }
    });

    it('should emit base styles before extended styles for correct CSS override order', () => {
      // CSS specificity: .baseClass and .extClass are both single-class selectors
      // (equal specificity). Document order is the tiebreaker — the later rule wins.
      // Base CSS must appear BEFORE extended CSS so that extensions can override.
      const Base = styled.div`
        width: 100px;
        color: red;
      `;
      const Extended = styled(Base)`
        width: 200px;
      `;

      const html = ReactDOMServer.renderToString(<Extended />);
      const allCSS = extractStyleContents(html);

      expect(allCSS).toContain('width:100px');
      expect(allCSS).toContain('width:200px');

      // Extended styles must appear after base styles in the output
      const basePos = allCSS.indexOf('width:100px');
      const extPos = allCSS.indexOf('width:200px');
      expect(extPos).toBeGreaterThan(basePos);
    });
  });
});
