/**
 * Tests for styled component render behavior: class-name stability across
 * re-renders, and the rules-of-hooks guarantee that interpolations, and any
 * hooks they call, run on every render (#5788).
 */
import React, { useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { LIMIT as TOO_MANY_CLASSES_LIMIT } from '../utils/createWarnTooManyClasses';
import { withHookRecording } from './recordHooks';
import { getCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

beforeEach(() => {
  styled = resetStyled();
});

describe('memoization correctness', () => {
  it('returns same className on re-render with identical props', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const renderer = TestRenderer.create(<Comp $color="red" />);
    const first = renderer.root.findByType('div').props.className;

    renderer.update(<Comp $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.update(<Comp $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.unmount();
  });

  it('generates new className when a prop changes', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const renderer = TestRenderer.create(<Comp $color="red" />);
    const redClass = renderer.root.findByType('div').props.className;
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    renderer.update(<Comp $color="blue" />);
    const blueClass = renderer.root.findByType('div').props.className;
    expect(blueClass).not.toBe(redClass);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}.c{color:blue;}"`);

    renderer.unmount();
  });

  it('handles rapid prop toggling correctly', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
      font-size: ${p => (p.$color === 'red' ? '14px' : '16px')};
    `;

    const renderer = TestRenderer.create(<Comp $color="red" />);
    const redClass = renderer.root.findByType('div').props.className;

    for (let i = 0; i < 100; i++) {
      renderer.update(<Comp $color={i % 2 === 0 ? 'red' : 'blue'} />);
    }

    // i=99 -> odd -> blue
    expect(getCSS(document)).toMatchInlineSnapshot(
      `".b{color:red;font-size:14px;}.c{color:blue;font-size:16px;}"`
    );

    // Back to red - should get the same className as the first render
    renderer.update(<Comp $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(redClass);

    renderer.unmount();
  });

  it('invalidates when theme changes', () => {
    const { ThemeProvider } = require('../index');
    const Comp = styled.div`
      color: ${(p: any) => p.theme.color || 'black'};
    `;

    const renderer = TestRenderer.create(
      <ThemeProvider theme={{ color: 'red' }}>
        <Comp />
      </ThemeProvider>
    );
    const redClass = renderer.root.findByType('div').props.className;
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    renderer.update(
      <ThemeProvider theme={{ color: 'blue' }}>
        <Comp />
      </ThemeProvider>
    );
    const blueClass = renderer.root.findByType('div').props.className;
    expect(blueClass).not.toBe(redClass);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}.c{color:blue;}"`);

    renderer.unmount();
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

    const renderer = TestRenderer.create(<Parent />);
    const initial = parentRenderCount;

    act(() => {
      renderer.root.findByType('button').props.onClick();
    });
    act(() => {
      renderer.root.findByType('button').props.onClick();
    });
    act(() => {
      renderer.root.findByType('button').props.onClick();
    });

    expect(parentRenderCount).toBe(initial + 3);
    expect(getCSS(document)).toMatchInlineSnapshot(`".b{color:red;}"`);

    renderer.unmount();
  });

  it('works with static attrs', () => {
    const Comp = styled.div.attrs({ role: 'button', tabIndex: 0 })<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const renderer = TestRenderer.create(<Comp $color="red" />);
    const first = renderer.root.findByType('div').props.className;

    renderer.update(<Comp $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.unmount();
  });

  it('works with function attrs that produce stable values', () => {
    const Comp = styled.div.attrs<{ $size: number }>(p => ({
      'data-size': p.$size,
    }))`
      color: red;
    `;

    const renderer = TestRenderer.create(<Comp $size={100} />);
    const first = renderer.root.findByType('div').props.className;

    renderer.update(<Comp $size={100} />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.unmount();
  });

  it('works with extended components', () => {
    const Base = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;
    const Extended = styled(Base)`
      font-weight: bold;
    `;

    const renderer = TestRenderer.create(<Extended $color="red" />);
    const first = renderer.root.findByType('div').props.className;
    expect(getCSS(document)).toMatchInlineSnapshot(`".c{color:red;}.d{font-weight:bold;}"`);

    renderer.update(<Extended $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.update(<Extended $color="blue" />);
    expect(renderer.root.findByType('div').props.className).not.toBe(first);
    expect(getCSS(document)).toMatchInlineSnapshot(
      `".c{color:red;}.e{color:blue;}.d{font-weight:bold;}"`
    );

    renderer.unmount();
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
    const renderer = TestRenderer.create(<Comp {...props} />);
    const first = renderer.root.findByType('div').props.className;

    renderer.update(<Comp {...props} />);
    expect(renderer.root.findByType('div').props.className).toBe(first);

    renderer.update(<Comp {...props} $c="purple" />);
    expect(renderer.root.findByType('div').props.className).not.toBe(first);
    expect(getCSS(document)).toMatchInlineSnapshot(
      `".b{color:red;background:white;border-color:blue;outline-color:green;text-decoration-color:yellow;}.c{color:red;background:white;border-color:purple;outline-color:green;text-decoration-color:yellow;}"`
    );

    renderer.unmount();
  });

  it('handles adding/removing props', () => {
    const Comp = styled.div<{ $color?: string; $size?: string }>`
      color: ${p => p.$color || 'black'};
      font-size: ${p => p.$size || '14px'};
    `;

    const renderer = TestRenderer.create(<Comp $color="red" />);
    const onePropsClass = renderer.root.findByType('div').props.className;

    renderer.update(<Comp $color="red" $size="16px" />);
    const twoPropsClass = renderer.root.findByType('div').props.className;
    expect(twoPropsClass).not.toBe(onePropsClass);

    renderer.update(<Comp $color="red" />);
    expect(renderer.root.findByType('div').props.className).toBe(onePropsClass);

    renderer.unmount();
  });

  it('handles concurrent siblings with different props', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const renderer = TestRenderer.create(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
        <Comp $color="green" />
      </div>
    );

    expect(getCSS(document)).toMatchInlineSnapshot(
      `".b{color:red;}.c{color:blue;}.d{color:green;}"`
    );

    // Re-render - each sibling caches independently
    renderer.update(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
        <Comp $color="green" />
      </div>
    );

    expect(getCSS(document)).toMatchInlineSnapshot(
      `".b{color:red;}.c{color:blue;}.d{color:green;}"`
    );

    renderer.unmount();
  });

  it('siblings update classNames correctly when props cycle', () => {
    const Comp = styled.div<{ $color: string }>`
      color: ${p => p.$color};
    `;

    const renderer = TestRenderer.create(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
      </div>
    );

    const children = renderer.root.findAllByType(Comp);
    const redClass = children[0].findByType('div').props.className;
    const blueClass = children[1].findByType('div').props.className;
    expect(redClass).not.toBe(blueClass);

    // Swap colors - each child should get the other's className
    renderer.update(
      <div>
        <Comp $color="blue" />
        <Comp $color="red" />
      </div>
    );

    const children2 = renderer.root.findAllByType(Comp);
    expect(children2[0].findByType('div').props.className).toBe(blueClass);
    expect(children2[1].findByType('div').props.className).toBe(redClass);

    // Back to original - should restore original classNames
    renderer.update(
      <div>
        <Comp $color="red" />
        <Comp $color="blue" />
      </div>
    );

    const children3 = renderer.root.findAllByType(Comp);
    expect(children3[0].findByType('div').props.className).toBe(redClass);
    expect(children3[1].findByType('div').props.className).toBe(blueClass);

    renderer.unmount();
  });

  it('bounds dynamicNameCache size for free-form interpolations', () => {
    // Regression: dynamicNameCache previously grew unbounded for components
    // with free-form string interpolations, leaking for the lifetime of
    // the component definition.
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const Comp = styled.div<{ $value: string }>`
      color: ${p => p.$value};
    `;

    const churnCount = TOO_MANY_CLASSES_LIMIT * 2 + 100;
    const renderer = TestRenderer.create(<Comp $value="rgb(0,0,0)" />);
    for (let i = 0; i < churnCount; i++) {
      renderer.update(<Comp $value={`rgb(${i},${i},${i})`} />);
    }

    const { dynamicNameCache } = Comp.componentStyle;
    expect(dynamicNameCache?.size).toBeGreaterThan(0);
    expect(dynamicNameCache?.size).toBeLessThanOrEqual(TOO_MANY_CLASSES_LIMIT);

    // Locks the single-source-of-truth invariant: the dev warning must
    // have fired before eviction began. Both share LIMIT, so a future
    // change that desyncs them would let the cache evict silently.
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Over ${TOO_MANY_CLASSES_LIMIT} classes`)
    );

    const recent = churnCount - 1;
    const recentValue = `rgb(${recent},${recent},${recent})`;
    renderer.update(<Comp $value={recentValue} />);
    const recentClass = renderer.root.findByType('div').props.className;
    renderer.update(<Comp $value="rgb(0,0,0)" />);
    renderer.update(<Comp $value={recentValue} />);
    expect(renderer.root.findByType('div').props.className).toBe(recentClass);

    renderer.unmount();
    warnSpy.mockRestore();
  });

  /**
   * A styled component must emit the same hook sequence on every render.
   * Recording React's `use*` calls across a mount, a same-props re-render, and a
   * changed-props re-render and asserting all three match catches a hook that
   * runs on one render but not another, the shape React rejects with "Rendered
   * fewer hooks than expected" (#5788). Asserting the sequence, not a count,
   * also catches a swap of two hooks that keeps the count identical.
   */
  it('emits an identical hook sequence across re-renders', () => {
    withHookRecording(record => {
      const Comp = styled.div<{ $color: string }>`
        color: ${p => p.$color};
      `;

      // Rendered as the root so every recorded hook belongs to this component.
      const [renderer, mount] = record(() => TestRenderer.create(<Comp $color="red" />));
      const [, sameProps] = record(() => renderer.update(<Comp $color="red" />));
      const [, changedProps] = record(() => renderer.update(<Comp $color="blue" />));

      // A non-empty mount doubles as a positive control on the recording.
      expect(mount.length).toBeGreaterThan(0);
      expect(sameProps).toEqual(changedProps);
      expect(mount).toEqual(sameProps);

      renderer.unmount();
    });
  });

  /**
   * A hook called inside an interpolation is one of this component's own hooks:
   * it runs synchronously in the styled component's render body. Skipping the
   * interpolation on a re-render with unchanged props drops that hook, so the
   * component emits fewer hooks than the previous render and React crashes with
   * "Rendered fewer hooks than expected" (#5788, as seen with @mui/styled-engine-sc
   * + MUI X DataGrid, which calls useGridSelector -> useContext in an interpolation).
   */
  it('runs a hook called inside an interpolation on every render (#5788)', () => {
    const Ctx = React.createContext('red');

    withHookRecording(record => {
      const Comp = styled.div<{ $pad: number }>`
        padding: ${p => p.$pad}px;
        color: ${() => React.useContext(Ctx)};
      `;

      const [renderer, mount] = record(() =>
        TestRenderer.create(
          <Ctx.Provider value="red">
            <Comp $pad={1} />
          </Ctx.Provider>
        )
      );
      // Same props: the interpolation, and the useContext it calls, still run.
      const [, reRender] = record(() =>
        renderer.update(
          <Ctx.Provider value="red">
            <Comp $pad={1} />
          </Ctx.Provider>
        )
      );

      expect(mount).toContain('useContext');
      expect(reRender).toEqual(mount);

      renderer.unmount();
    });
  });

  /**
   * An interpolation may read inputs that props and theme do not capture. The
   * class name must track the interpolation's real output, so a change to such a
   * hidden input updates the class even when props are unchanged (#5788).
   */
  it('recomputes when an interpolation reads external state that changed but props did not (#5788)', () => {
    let external = 'red';
    const Comp = styled.div<{ $pad: number }>`
      padding: ${p => p.$pad}px;
      color: ${() => external};
    `;

    const renderer = TestRenderer.create(<Comp $pad={1} />);
    const withRed = renderer.root.findByType('div').props.className;

    external = 'blue';
    // Same props, but the interpolation's external input changed.
    renderer.update(<Comp $pad={1} />);
    const withBlue = renderer.root.findByType('div').props.className;

    expect(withBlue).not.toBe(withRed);

    renderer.unmount();
  });
});
