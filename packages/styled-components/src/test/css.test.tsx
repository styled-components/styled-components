import { render } from '@testing-library/react';
import React from 'react';
import { getRenderedCSS, resetStyled } from './utils';

// Disable isStaticRules optimisation since we're not
// testing for ComponentStyle specifics here
jest.mock('../utils/isStaticRules', () => () => false);

let styled: ReturnType<typeof resetStyled>;

describe('css features', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('should add vendor prefixes in the right order', () => {
    const Comp = styled.div`
      transition: opacity 0.3s;
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        transition: opacity 0.3s;
      }"
    `);
  });

  it('should add vendor prefixes for display', () => {
    const Comp = styled.div`
      display: flex;
      flex-direction: column;
      align-items: center;
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        display: flex;
        flex-direction: column;
        align-items: center;
      }"
    `);
  });

  it('should generate styles for nested media queries', () => {
    const Comp = styled.div`
      @media (min-width: 10px) {
        @media (min-height: 20px) {
          color: red;
        }
      }
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      "@media (min-width:10px) {
        @media (min-height:20px) {
          .b {
            color: red;
          }
        }
      }"
    `);
  });

  it('should pass through custom properties', () => {
    const Comp = styled.div`
      --custom-prop: some-val;
    `;
    render(<Comp />);
    expect(getRenderedCSS()).toMatchInlineSnapshot(`
      ".b {
        --custom-prop: some-val;
      }"
    `);
  });
});
