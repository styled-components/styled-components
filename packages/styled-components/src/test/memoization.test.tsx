/**
 * Render-path correctness under repeated renders.
 *
 * A styled component re-renders to a stable class name when its inputs are
 * unchanged and a fresh one when they change, across prop, theme, sibling, and
 * extension scenarios. Interpolations and attrs run every render (they are the
 * component's own render-body code), so a hook called inside one keeps a stable
 * hook sequence and a value read inside one always reflects its current state
 * (#5788); the class name stays stable across renders through `webStyle`'s
 * content-addressed caches, not by skipping evaluation.
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

  it('bounds per-instance caches for free-form interpolations', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $value: string }>`
      color: ${p => p.$value};
    `;

    const churnCount = TOO_MANY_CLASSES_LIMIT * 2 + 100;
    const { container, rerender, unmount } = render(<Comp $value="rgb(0,0,0)" />);
    for (let i = 0; i < churnCount; i++) {
      rerender(<Comp $value={`rgb(${i},${i},${i})`} />);
    }

    const { interpKeyCache, cssKeyCache } = Comp.webStyle;
    expect(interpKeyCache?.size).toBeGreaterThan(0);
    expect(interpKeyCache?.size).toBeLessThanOrEqual(TOO_MANY_CLASSES_LIMIT);
    expect(cssKeyCache?.size).toBeGreaterThan(0);
    expect(cssKeyCache?.size).toBeLessThanOrEqual(TOO_MANY_CLASSES_LIMIT);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`over ${TOO_MANY_CLASSES_LIMIT} classes`)
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

  /**
   * An interpolation may call a hook (MUI X DataGrid reads a grid selector via
   * `useContext` inside one). That hook is one of the component's hooks and must
   * run on every render; skipping evaluation on any render drops it, the hook
   * count diverges, and React crashes with "Rendered fewer hooks than expected"
   * (#5788).
   *
   * StrictMode is the instrument: React invokes the render body twice back to
   * back, so a mount runs two full render passes. The recorded hook sequence of
   * the two passes must be identical, including the `useContext` the
   * interpolation calls. A render path that skipped evaluation on the second
   * pass would drop that hook and the two halves would differ (in practice React
   * throws first).
   *
   * Asserting the sequence rather than a count: a swap of two hooks keeps the
   * count identical and still breaks React's ordering rule. The recording wraps
   * React's own `use*` exports, so a hook added to the render path later is
   * picked up without this test being told about it, as long as it is called as
   * `React.useX`; a named `import { useX } from 'react'` is invisible here.
   */
  it('runs a hook called inside an interpolation on every render pass (#5788)', () => {
    // React's module namespace, typed as what it is here: a bag of hook
    // functions keyed by name. Spelling it once keeps the casts out of the body.
    const reactHooks = React as unknown as Record<string, (...args: unknown[]) => unknown>;
    const hookNames = Object.keys(React).filter(
      key => key.startsWith('use') && typeof reactHooks[key] === 'function'
    );
    // React still exports hooks under `use*` names, so there is something to
    // wrap. That the wrapping actually intercepts the component's calls is a
    // separate question, answered by the non-empty segment assertion below.
    expect(hookNames).toContain('useRef');

    let recording: string[] | null = null;
    // Restored in `finally`, which the install loop is inside: a throw partway
    // through installation must not leave React half-patched for later tests.
    const originals = new Map<string, (...args: unknown[]) => unknown>();

    function record<T>(renderFn: () => T): [T, string[]] {
      const calls: string[] = [];
      recording = calls;
      try {
        return [renderFn(), calls];
      } finally {
        // Cleared even when the render throws, so a later render cannot append
        // to a dead array and turn one failure into a confusing second one.
        recording = null;
      }
    }

    /**
     * The styled component renders before `StyleInjector`, so everything up to
     * the injector's first hook belongs to the component, across both StrictMode
     * passes. Splitting that segment in half yields one pass each.
     */
    function splitStrictModePasses(sequence: string[]): [string[], string[]] {
      const injectorStart = sequence.indexOf('useSyncExternalStore');
      // Asserted rather than defaulted. Were the boundary hook to move out of
      // StyleInjector, a fallback to the whole sequence would still split into
      // two symmetric halves and pass while measuring the wrong thing.
      expect(injectorStart).toBeGreaterThan(0);
      const own = sequence.slice(0, injectorStart);
      // An odd total is itself the defect: the two passes cannot have called the
      // same hooks, so one of them ran a hook the other skipped.
      expect({ hooks: own, oddMeansOnePassSkippedAHook: own.length % 2 }).toEqual({
        hooks: own,
        oddMeansOnePassSkippedAHook: 0,
      });
      return [own.slice(0, own.length / 2), own.slice(own.length / 2)];
    }

    try {
      for (const name of hookNames) {
        const original = reactHooks[name];
        originals.set(name, original);
        reactHooks[name] = (...args) => {
          if (recording) recording.push(name);
          return original(...args);
        };
      }

      const ColorContext = React.createContext('red');
      const Comp = styled.div`
        color: ${() => React.useContext(ColorContext)};
      `;

      const [{ rerender, unmount }, mountSeq] = record(() =>
        render(
          <React.StrictMode>
            <ColorContext.Provider value="red">
              <Comp />
            </ColorContext.Provider>
          </React.StrictMode>
        )
      );
      const [, updateSeq] = record(() =>
        rerender(
          <React.StrictMode>
            <ColorContext.Provider value="blue">
              <Comp />
            </ColorContext.Provider>
          </React.StrictMode>
        )
      );

      const [mountMiss, mountHit] = splitStrictModePasses(mountSeq);
      const [updateMiss, updateHit] = splitStrictModePasses(updateSeq);

      expect(mountHit).toEqual(mountMiss);
      expect(updateHit).toEqual(updateMiss);
      expect(updateMiss).toEqual(mountMiss);

      unmount();
    } finally {
      for (const [name, original] of originals) reactHooks[name] = original;
    }
  });

  /**
   * An interpolation may read a value the props and theme do not capture (here a
   * React context). When that value changes, the component re-renders with
   * unchanged props; the class name must follow the new value rather than a
   * stale one carried over from the previous render (#5788).
   */
  it('updates the class name when an interpolation reads changed external state (#5788)', () => {
    const ColorContext = React.createContext('red');
    const Comp = styled.div`
      color: ${() => React.useContext(ColorContext)};
    `;

    function App({ color }: { color: string }) {
      return (
        <ColorContext.Provider value={color}>
          <Comp />
        </ColorContext.Provider>
      );
    }

    const { container, rerender, unmount } = render(<App color="red" />);
    const redClass = getDivClass(container);
    expect(getCSS(document)).toContain('color:red;');

    rerender(<App color="blue" />);
    expect(getDivClass(container)).not.toBe(redClass);
    expect(getCSS(document)).toContain('color:blue;');

    unmount();
  });

  /**
   * `attrs` functions run in the same render body as interpolations, so the same
   * rule holds: a hook called inside one runs every render, and a value it reads
   * outside props and theme is reflected on every render rather than served
   * stale (#5788).
   */
  it('runs a hook called inside an attrs function on every render (#5788)', () => {
    const RoleContext = React.createContext('button');
    const Comp = styled.div.attrs(() => ({ role: React.useContext(RoleContext) }))`
      color: red;
    `;

    function App({ role }: { role: string }) {
      return (
        <RoleContext.Provider value={role}>
          <Comp />
        </RoleContext.Provider>
      );
    }

    const { container, rerender, unmount } = render(<App role="button" />);
    expect(container.querySelector('div')!.getAttribute('role')).toBe('button');

    rerender(<App role="listbox" />);
    expect(container.querySelector('div')!.getAttribute('role')).toBe('listbox');

    unmount();
  });
});
