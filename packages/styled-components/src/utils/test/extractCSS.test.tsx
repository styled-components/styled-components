import { render } from '@testing-library/react';
import React from 'react';
import { resetStyled } from '../../test/utils';
import extractCSS from '../extractCSS';

describe('extractCSS', () => {
  let styled: ReturnType<typeof resetStyled>;

  beforeEach(() => {
    styled = resetStyled();
  });

  it('returns empty string when no styles are registered', () => {
    expect(extractCSS()).toBe('');
  });

  it('returns the rendered CSS for components mounted to the main sheet', () => {
    const Heading = styled.h1`
      color: red;
    `;
    const Body = styled.p`
      color: blue;
    `;

    render(
      <>
        <Heading>Hi</Heading>
        <Body>There</Body>
      </>
    );

    // Strip whitespace so we don't depend on jsdom vs Blink CSS serialization quirks.
    const css = extractCSS().replace(/\s+/g, '');
    expect(css).toContain('color:red');
    expect(css).toContain('color:blue');
    // No rehydration markers (those are emitted by ServerStyleSheet, not extractCSS).
    expect(css).not.toContain('data-styled.g');
    expect(css).not.toContain('content:"');
  });

  it('returns rules for components rendered into the main sheet', () => {
    const Comp = styled.div`
      padding: 8px;
    `;
    render(<Comp />);

    const css = extractCSS().replace(/\s+/g, '');
    expect(css).toContain('padding:8px');
  });
});
