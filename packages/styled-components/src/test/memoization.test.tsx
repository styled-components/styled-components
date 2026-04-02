/**
 * Tests for useInjectedStyle memoization.
 *
 * Verifies that the useRef-based shallow context comparison correctly
 * caches and invalidates under various scenarios.
 */
import React, { useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
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

    // Back to red — should get the same className as the first render
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

    // Re-render — each sibling caches independently
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

    // Swap colors — each child should get the other's className
    renderer.update(
      <div>
        <Comp $color="blue" />
        <Comp $color="red" />
      </div>
    );

    const children2 = renderer.root.findAllByType(Comp);
    expect(children2[0].findByType('div').props.className).toBe(blueClass);
    expect(children2[1].findByType('div').props.className).toBe(redClass);

    // Back to original — should restore original classNames
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
});
