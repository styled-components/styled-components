/**
 * Tests for useInjectedStyle memoization.
 *
 * Verifies that the useRef-based shallow context comparison correctly
 * caches and invalidates under various scenarios.
 */
import { act, fireEvent, render } from '@testing-library/react';
import React, { useState } from 'react';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { getCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

beforeEach(() => {
  styled = resetStyled();
});

function getDivClass(container: HTMLElement): string {
  return container.querySelector('div')!.className;
}

describe('memoization correctness', () => {
  it('returns same className on re-render with identical props', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const { container, rerender, unmount } = render(<Comp $color="red" />);
    const first = getDivClass(container);

    rerender(<Comp $color="red" />);
    expect(getDivClass(container)).toBe(first);

    rerender(<Comp $color="red" />);
    expect(getDivClass(container)).toBe(first);

    unmount();
  });

  it('generates new className when a prop changes', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const { container, rerender, unmount } = render(<Comp $color="red" />);
    const redClass = getDivClass(container);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    rerender(<Comp $color="blue" />);
    const blueClass = getDivClass(container);
    expect(blueClass).not.toBe(redClass);
    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red;}
      .c{color:blue;}"
    `);

    unmount();
  });

  it('handles rapid prop toggling correctly', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      font-size: ${p => (p.$color === 'red' ? '14px' : '16px')};
    `;

    const { container, rerender, unmount } = render(<Comp $color="red" />);
    const redClass = getDivClass(container);

    for (let i = 0; i < 100; i++) {
      rerender(<Comp $color={i % 2 === 0 ? 'red' : 'blue'} />);
    }

    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red; font-size:14px;}
      .c{color:blue; font-size:16px;}"
    `);

    rerender(<Comp $color="red" />);
    expect(getDivClass(container)).toBe(redClass);

    unmount();
  });

  it('invalidates when theme changes', () => {
    const { ThemeProvider } = require('../index');
    const Comp = styled.div`
      color: ${(p: any) => p.theme.color || 'black'};
    `;

    const { container, rerender, unmount } = render(
      <ThemeProvider theme={{ color: 'red' }}>
        <Comp />
      </ThemeProvider>
    );
    const redClass = getDivClass(container);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    rerender(
      <ThemeProvider theme={{ color: 'blue' }}>
        <Comp />
      </ThemeProvider>
    );
    const blueClass = getDivClass(container);
    expect(blueClass).not.toBe(redClass);
    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red;}
      .c{color:blue;}"
    `);

    unmount();
  });

  it('handles parent re-render without prop changes', () => {
    const Child = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    let parentRenderCount = 0;

    function Parent() {
      const [count, setCount] = useState(0);
      parentRenderCount++;
      return (
        <div data-count={count}>
          <Child $color="red" />
          <button onClick={() => setCount(c => c + 1)} />
        </div>
      );
    }

    const { container, unmount } = render(<Parent />);
    const initial = parentRenderCount;
    const button = container.querySelector('button')!;

    act(() => {
      fireEvent.click(button);
    });
    act(() => {
      fireEvent.click(button);
    });
    act(() => {
      fireEvent.click(button);
    });

    expect(parentRenderCount).toBe(initial + 3);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    unmount();
  });

  it('works with static attrs', () => {
    const Comp = styled.div.attrs({ role: 'button', tabIndex: 0 })<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const { container, rerender, unmount } = render(<Comp $color="red" />);
    const first = getDivClass(container);

    rerender(<Comp $color="red" />);
    expect(getDivClass(container)).toBe(first);

    unmount();
  });

  it('works with function attrs that produce stable values', () => {
    const Comp = styled.div.attrs<{ $size: number }>(p => ({
      'data-size': p.$size,
    }))`
      color: red;
    `;

    const { container, rerender, unmount } = render(<Comp $size={100} />);
    const first = getDivClass(container);

    rerender(<Comp $size={100} />);
    expect(getDivClass(container)).toBe(first);

    unmount();
  });

  it('works with extended components', () => {
    const Base = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;
    const Extended = styled(Base)`
      font-weight: bold;
    `;

    const { container, rerender, unmount } = render(<Extended $color="red" />);
    const first = getDivClass(container);
    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".c{color:red;}
      .d{font-weight:bold;}"
    `);

    rerender(<Extended $color="red" />);
    expect(getDivClass(container)).toBe(first);

    rerender(<Extended $color="blue" />);
    expect(getDivClass(container)).not.toBe(first);
    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".c{color:red;}
      .e{color:blue;}
      .d{font-weight:bold;}"
    `);

    unmount();
  });

  it('handles many interpolations correctly', () => {
    const Comp = styled.div<{
      $a: string;
      $b: string;
      $c: string;
      $d: string;
      $e: string;
    }>`
      color: ${p => p.$a};
      background: ${p => p.$b};
      border-color: ${p => p.$c};
      outline-color: ${p => p.$d};
      text-decoration-color: ${p => p.$e};
    `;

    const props = { $a: 'red', $b: 'white', $c: 'blue', $d: 'green', $e: 'yellow' };
    const { container, rerender, unmount } = render(<Comp {...props} />);
    const first = getDivClass(container);

    rerender(<Comp {...props} />);
    expect(getDivClass(container)).toBe(first);

    rerender(<Comp {...props} $c="purple" />);
    expect(getDivClass(container)).not.toBe(first);
    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red; background:white; border-color:blue; outline-color:green; text-decoration-color:yellow;}
      .c{color:red; background:white; border-color:purple; outline-color:green; text-decoration-color:yellow;}"
    `);

    unmount();
  });

  it('handles adding/removing props', () => {
    const Comp = styled.div<{ $color?: string; $size?: string }>`
      color: ${p => p.$color || 'black'};
      font-size: ${p => p.$size || '14px'};
    `;

    const { container, rerender, unmount } = render(<Comp $color="red" />);
    const onePropsClass = getDivClass(container);

    rerender(<Comp $color="red" $size="16px" />);
    const twoPropsClass = getDivClass(container);
    expect(twoPropsClass).not.toBe(onePropsClass);

    rerender(<Comp $color="red" />);
    expect(getDivClass(container)).toBe(onePropsClass);

    unmount();
  });

  it('handles concurrent siblings with different props', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const { rerender, unmount } = render(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
        <Comp $color="green" />
      </div>
    );

    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red;}
      .c{color:blue;}
      .d{color:green;}"
    `);

    rerender(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
        <Comp $color="green" />
      </div>
    );

    expect(getCSS(document)).toMatchInlineSnapshot(`
      ".b{color:red;}
      .c{color:blue;}
      .d{color:green;}"
    `);

    unmount();
  });

  it('siblings update classNames correctly when props cycle', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const { container, rerender, unmount } = render(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
      </div>
    );

    const siblings = () => Array.from(container.firstElementChild!.children) as HTMLElement[];
    const [redEl, blueEl] = siblings();
    const redClass = redEl.className;
    const blueClass = blueEl.className;
    expect(redClass).not.toBe(blueClass);

    rerender(
      <div>
        <Comp $color="blue" />
        <Comp $color="red" />
      </div>
    );

    const [s2a, s2b] = siblings();
    expect(s2a.className).toBe(blueClass);
    expect(s2b.className).toBe(redClass);

    rerender(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
      </div>
    );

    const [s3a, s3b] = siblings();
    expect(s3a.className).toBe(redClass);
    expect(s3b.className).toBe(blueClass);

    unmount();
  });

  it('bounds dynamicNameCache size for free-form interpolations', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $value: string }>`
      color: ${p => p.$value};
    `;

    const churnCount = TOO_MANY_CLASSES_LIMIT * 2 + 100;
    const { container, rerender, unmount } = render(<Comp $value="rgb(0,0,0)" />);
    for (let i = 0; i < churnCount; i++) {
      rerender(<Comp $value={`rgb(${i},${i},${i})`} />);
    }

    const { dynamicNameCache } = Comp.componentStyle;
    expect(dynamicNameCache?.size).toBeGreaterThan(0);
    expect(dynamicNameCache?.size).toBeLessThanOrEqual(TOO_MANY_CLASSES_LIMIT);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Over ${TOO_MANY_CLASSES_LIMIT} classes`)
    );

    const recent = churnCount - 1;
    const recentValue = `rgb(${recent},${recent},${recent})`;
    rerender(<Comp $value={recentValue} />);
    const recentClass = getDivClass(container);
    rerender(<Comp $value="rgb(0,0,0)" />);
    rerender(<Comp $value={recentValue} />);
    expect(getDivClass(container)).toBe(recentClass);

    unmount();
    warnSpy.mockRestore();
  });
});
