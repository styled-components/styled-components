import { render } from '@testing-library/react';
import React from 'react';
import { StyleSheetManager } from '../../models/StyleSheetManager';
import { getRenderedCSS, resetStyled } from '../../test/utils';
import rtl from '../rtl';

let styled: ReturnType<typeof resetStyled>;

describe('rtl plugin', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  const renderWithRtl = (Comp: React.ComponentType) => {
    render(
      <StyleSheetManager plugins={[rtl]}>
        <Comp />
      </StyleSheetManager>
    );
  };

  describe('property swaps', () => {
    it('swaps padding-left to padding-right', () => {
      const Comp = styled.div`
        padding-left: 5px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          padding-right: 5px;
        }"
      `);
    });

    it('swaps margin-right to margin-left', () => {
      const Comp = styled.div`
        margin-right: 10px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          margin-left: 10px;
        }"
      `);
    });

    it('swaps border-left-color to border-right-color', () => {
      const Comp = styled.div`
        border-left-color: red;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          border-right-color: red;
        }"
      `);
    });

    it('swaps border-top-left-radius', () => {
      const Comp = styled.div`
        border-top-left-radius: 4px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          border-top-right-radius: 4px;
        }"
      `);
    });

    it('swaps physical `left` positional property', () => {
      const Comp = styled.div`
        position: absolute;
        left: 0;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          position: absolute;
          right: 0;
        }"
      `);
    });

    it('leaves logical properties alone', () => {
      const Comp = styled.div`
        margin-inline-start: 8px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          margin-inline-start: 8px;
        }"
      `);
    });
  });

  describe('directional value keywords', () => {
    it('flips float: left', () => {
      const Comp = styled.div`
        float: left;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          float: right;
        }"
      `);
    });

    it('flips text-align: right', () => {
      const Comp = styled.div`
        text-align: right;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          text-align: left;
        }"
      `);
    });

    it('leaves text-align: center alone', () => {
      const Comp = styled.div`
        text-align: center;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          text-align: center;
        }"
      `);
    });

    it('does NOT flip `left` inside an unrelated property value', () => {
      // Custom property names shouldn't be interpreted as direction keywords.
      const Comp = styled.div`
        content: 'left';
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          content: 'left';
        }"
      `);
    });
  });

  describe('4-value shorthand swap', () => {
    it('swaps position 1 and 3 of padding: t r b l', () => {
      const Comp = styled.div`
        padding: 1px 2px 3px 4px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          padding: 1px 4px 3px 2px;
        }"
      `);
    });

    it('swaps 4-value margin', () => {
      const Comp = styled.div`
        margin: 0 8px 0 16px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          margin: 0 16px 0 8px;
        }"
      `);
    });

    it('leaves 2-value shorthand alone (symmetric)', () => {
      const Comp = styled.div`
        padding: 8px 16px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          padding: 8px 16px;
        }"
      `);
    });

    it('leaves 1-value shorthand alone', () => {
      const Comp = styled.div`
        margin: 4px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          margin: 4px;
        }"
      `);
    });

    it('preserves parens when tokenizing 4-value shorthand', () => {
      const Comp = styled.div`
        padding: calc(1px + 2px) 2px 3px 4px;
      `;
      renderWithRtl(Comp);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".b {
          padding: calc(1px + 2px) 4px 3px 2px;
        }"
      `);
    });
  });

  describe('scoping', () => {
    it('is opt-in per StyleSheetManager subtree', () => {
      const A = styled.div`
        padding-left: 5px;
      `;
      const B = styled.div`
        padding-left: 10px;
      `;
      render(
        <>
          <StyleSheetManager plugins={[rtl]}>
            <A />
          </StyleSheetManager>
          <B />
        </>
      );
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".c {
          padding-right: 5px;
        }
        .d {
          padding-left: 10px;
        }"
      `);
    });
  });
});
