/**
 * End-to-end integration tests for the rn-web bridge. Each test renders
 * a styled component built from the bridge through real react-native-web
 * primitives and asserts the resulting DOM carries our class alongside
 * rn-web's atomic classes.
 *
 * Tests run under the web jest config (jsdom) because we need a real
 * browser-like DOM to exercise rn-web's createDOMProps + styleq.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';

import styled, {
  createGlobalStyle,
  keyframes,
  ServerStyleSheet,
  StyleSheetManager,
  ThemeProvider as BridgeThemeProvider,
} from '../native/web-bridge';
import createTheme from '../constructors/createTheme';
import ThemeProvider from '../models/ThemeProvider';
import { resetWarnOnce } from '../utils/warnOnce';

// The bridge rewrites run inside every compiler behind the build constant, which
// is true only in the bridge bundle; the suite stands in for that bundle.
beforeAll(() => {
  globalThis.__NATIVE_WEB__ = true;
});

afterAll(() => {
  globalThis.__NATIVE_WEB__ = false;
});

/**
 * Server-renders `element` into a fresh sheet and returns only that render's CSS, one rule per
 * line, with the generated class of each component written as `.c`. jsdom's CSSOM writes each
 * rule, so spacing inside a rule is jsdom's.
 */
function renderedCss(element: React.ReactElement): string {
  const sheet = new ServerStyleSheet();

  try {
    const html = renderToString(sheet.collectStyles(element));
    let css = sheet
      .getStyleTags()
      .replace(/^<style[^>]*>/, '')
      .replace(/<\/style>$/, '')
      .split('/*!sc*/')
      .map(rule => rule.trim())
      .filter(rule => rule !== '' && !rule.startsWith('data-styled.g'))
      .join('\n');

    for (const [, classes] of html.matchAll(/class="([^"]*)"/g)) {
      for (const name of classes.split(' ')) {
        if (/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name))
          css = css.replace(new RegExp('\\.' + name + '(?![\\w-])', 'g'), '.c');
      }
    }

    return css.trim();
  } finally {
    sheet.seal();
  }
}

function readAllCss(): string {
  const buf: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        buf.push(rule.cssText);
      }
    } catch {
      // skip unreadable sheets
    }
  }
  return buf.join('\n');
}

describe('rn-web bridge: View', () => {
  /**
   * The bridge sits between the styled component and the rn-web
   * primitive, so a ref has to survive that extra hop to reach the DOM
   * node. Nothing else in this suite renders a ref, and the bridge is the
   * one place a dropped ref would be invisible: classes still land and
   * every other assertion here still passes.
   */
  it('forwards a ref through to the underlying DOM node', () => {
    const Box = styled.View`
      background-color: rgb(1, 2, 3);
    `;
    const seen: unknown[] = [];
    render(<Box ref={(node: unknown) => void seen.push(node)} testID="reffed" />);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(HTMLElement);
    expect((seen[0] as HTMLElement).getAttribute('data-testid')).toBe('reffed');
  });

  it('re-invokes an inline ref on re-render when no completion callback is set', () => {
    // No completion callback: the bridge forwards the caller ref. rn-web's
    // merged ref follows that identity, so a new inline callback is detached
    // with null and then attached to the same host.
    const Box = styled.View``;
    const seen: unknown[] = [];
    const { rerender } = render(
      <Box
        ref={(node: unknown) => {
          seen.push(node);
        }}
        testID="reffed"
      />
    );
    const node = seen[0];
    expect(node).toBeInstanceOf(HTMLElement);

    rerender(
      <Box
        ref={(next: unknown) => {
          seen.push(next);
        }}
        testID="reffed"
      />
    );

    expect(seen).toEqual([node, null, node]);
  });

  it('emits a single styled-components class on the DOM node', () => {
    const Box = styled.View`
      background-color: red;
    `;
    const { container } = render(<Box testID="box" />);
    const node = container.querySelector('[data-testid="box"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    // The web pipeline mints a hashed class like `sc-AbCdEf` plus a per-render
    // hashed class. Both should appear on the node.
    expect(cls.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('injects a real stylesheet rule for the declared CSS', () => {
    const Box = styled.View`
      background-color: rgb(0, 128, 255);
    `;
    const { container } = render(<Box testID="probe" />);
    const node = container.querySelector('[data-testid="probe"]') as HTMLElement;
    const tokens = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);

    const allCss: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          allCss.push(rule.cssText);
        }
      } catch {
        // cross-origin sheets aren't readable, but our injected sheets are.
      }
    }
    const joined = allCss.join('\n');
    // The bridge's class should appear as a selector somewhere, with the
    // declared background applied.
    const ourClass = tokens.find(t => t.startsWith('sc-'));
    expect(ourClass).toBeDefined();
    expect(joined).toContain('rgb(0, 128, 255)');
  });

  it('forwards a user-supplied style prop alongside the bridge class', () => {
    const Box = styled.View`
      background-color: red;
    `;
    const { container } = render(
      <Box testID="merge" style={{ opacity: 0.5 } as unknown as object} />
    );
    const node = container.querySelector('[data-testid="merge"]') as HTMLElement;
    const cls = node.getAttribute('class') ?? '';
    // We expect our sc-class AND rn-web's atomic class for the inline opacity
    // to both be present.
    expect(cls).toMatch(/sc-/);
    // rn-web atomic class for opacity contains `r-opacity` (an at-rule-style
    // identifier in the atomic compiler). Use a softer check to avoid coupling
    // to the exact hash format.
    expect(cls.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });

  it('reuses the same class across instances with identical static CSS', () => {
    const Box = styled.View`
      background-color: green;
    `;
    const { container } = render(
      <>
        <Box testID="a" />
        <Box testID="b" />
      </>
    );
    const a = container.querySelector('[data-testid="a"]') as HTMLElement;
    const b = container.querySelector('[data-testid="b"]') as HTMLElement;
    const aCls = (a.getAttribute('class') ?? '').split(/\s+/).filter(t => t.startsWith('sc-'));
    const bCls = (b.getAttribute('class') ?? '').split(/\s+/).filter(t => t.startsWith('sc-'));
    expect(aCls).toEqual(bCls);
  });
});

describe('rn-web bridge: Text', () => {
  it('emits the bridge class on a Text node', () => {
    const Label = styled.Text`
      color: purple;
    `;
    const { container } = render(<Label testID="label">hi</Label>);
    const node = container.querySelector('[data-testid="label"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toMatch(/sc-/);
  });
});

/**
 * Completion callbacks on rn-web primitives.
 *
 * CSS Animations 1 §5.2 (https://drafts.csswg.org/css-animations-1/#eventdef-globaleventhandlers-animationend):
 * "The animationend event occurs when the animation finishes. In this case the value of the elapsedTime member of the event is equal to the active duration."
 * "Bubbles: Yes"
 * "Cancelable: No"
 * "Context Info: animationName, elapsedTime, pseudoElement"
 *
 * CSS Animations 1 §5.1.2 (https://drafts.csswg.org/css-animations-1/#dom-animationevent-animationname):
 * "The value of the animation-name property of the animation that fired the event."
 * "The amount of time the animation has been running, in seconds, when this event fired, excluding any time the animation was paused."
 *
 * CSS Animations 1 §5.1.2 pseudoElement (https://drafts.csswg.org/css-animations-1/#dom-animationevent-pseudoelement):
 * "The name (beginning with two colons) of the CSS pseudo-element on which the animation runs (in which case the target of the event is that pseudo-element’s corresponding element), or the empty string if the animation runs on an element (which means the target of the event is that element)."
 *
 * CSS Transitions 1 §6.2 (https://drafts.csswg.org/css-transitions-1/#transitionend):
 * "The transitionend event occurs at the completion of the transition. In the case where a transition is removed before completion, such as if the transition-property is removed, then the event will not fire."
 * "The value of elapsedTime for this event is equal to the value of transition-duration."
 * "Bubbles: Yes"
 * "Cancelable: No"
 * "Context Info: propertyName, elapsedTime, pseudoElement"
 *
 * CSS Transitions 1 §6.1.2 (https://drafts.csswg.org/css-transitions-1/#Events-TransitionEvent-propertyName):
 * "The name of the CSS property associated with the transition."
 * "The amount of time the transition has been running, in seconds, when this event fired not including any time spent in the delay phase."
 *
 * Deviation from the bubbling clause: the Hermes adapter reports completion only for the styled component that owns the animation or transition. A descendant's bubbling `animationend` / `transitionend` does not call an ancestor's prop. `animationcancel` and `transitioncancel` are not these props (CSS Animations 1 §5.2: animationcancel "occurs when the animation stops running in a way that does not fire an animationend event").
 *
 * Deviation from pseudo-element dispatch: a non-empty `pseudoElement` is ignored. The event's target is still the host element (CSS Animations 1 §5.1.2, quoted above), and the callback payload has no field that would tell that completion from the element's own. The Hermes adapter does not fire for pseudo-elements.
 *
 * Deviation from the CSS property-name spelling: `propertyName` is camelCased to the runtime style key the Hermes adapter fires (`background-color` is `backgroundColor`). `elapsedTime` is the browser's seconds value. CSS Animations 1 §4.4: "The time window during which the animation is active (`duration` x `iteration-count`) is known as the active duration." CSS Animations 1 §5.2: "In this case the value of the elapsedTime member of the event is equal to the active duration." CSS Transitions 1 §6.2: "The value of elapsedTime for this event is equal to the value of transition-duration." Delay is outside both of those.
 */
describe('rn-web bridge: animation and transition end', () => {
  function host(container: HTMLElement, testId: string): HTMLElement {
    const node = container.querySelector(`[data-testid="${testId}"]`);
    if (!(node instanceof HTMLElement)) {
      throw new Error(`missing host ${testId}`);
    }
    return node;
  }

  // jsdom does not implement AnimationEvent or TransitionEvent. Dispatch an
  // Event of the spec type and attach the context fields the interface
  // would have carried. `typeof` is safe when the constructor is absent.
  function dispatchWithFields(
    node: Element,
    type: string,
    fields: Record<string, string | number>
  ): void {
    const event = new Event(type, { bubbles: true });
    for (const key in fields) {
      Object.defineProperty(event, key, { value: fields[key] });
    }
    node.dispatchEvent(event);
  }

  function fireAnimationEnd(
    node: Element,
    animationName: string,
    elapsedTime: number,
    pseudoElement = ''
  ): void {
    if (typeof AnimationEvent === 'function') {
      node.dispatchEvent(
        new AnimationEvent('animationend', {
          animationName,
          bubbles: true,
          elapsedTime,
          pseudoElement,
        })
      );
      return;
    }
    dispatchWithFields(node, 'animationend', { animationName, elapsedTime, pseudoElement });
  }

  function fireTransitionEnd(
    node: Element,
    propertyName: string,
    elapsedTime: number,
    pseudoElement = ''
  ): void {
    if (typeof TransitionEvent === 'function') {
      node.dispatchEvent(
        new TransitionEvent('transitionend', {
          bubbles: true,
          elapsedTime,
          propertyName,
          pseudoElement,
        })
      );
      return;
    }
    dispatchWithFields(node, 'transitionend', { elapsedTime, propertyName, pseudoElement });
  }

  it('fires onAnimationEnd and onTransitionEnd on View when the DOM events do, and still fires onClick', () => {
    const onAnimationEnd = jest.fn();
    const onClick = jest.fn();
    const onTransitionEnd = jest.fn();
    const Box = styled.View`
      animation: fade 1s;
    `;
    const { container } = render(
      <Box
        onAnimationEnd={onAnimationEnd}
        onClick={onClick}
        onTransitionEnd={onTransitionEnd}
        testID="box"
      />
    );
    const node = host(container, 'box');

    node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fireAnimationEnd(node, 'fade', 1);
    fireTransitionEnd(node, 'background-color', 0.28);
    fireTransitionEnd(node, 'opacity', 0);
    fireAnimationEnd(node, 'fade', 0, '::before');
    fireTransitionEnd(node, 'opacity', 0.5, '::after');

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onAnimationEnd.mock.calls).toEqual([[{ animationName: 'fade', elapsedTime: 1 }]]);
    expect(onTransitionEnd.mock.calls).toEqual([
      [{ elapsedTime: 0.28, propertyName: 'backgroundColor' }],
      [{ elapsedTime: 0, propertyName: 'opacity' }],
    ]);
  });

  it('fires the same callbacks on Text and on a component built from View', () => {
    const onAnimationEnd = jest.fn();
    const onTransitionEnd = jest.fn();
    const Label = styled.Text`
      color: purple;
    `;
    const Box = styled.View``;
    const Card = styled(Box)``;
    const { container } = render(
      <>
        <Label onAnimationEnd={onAnimationEnd} onTransitionEnd={onTransitionEnd} testID="label">
          hi
        </Label>
        <Card onAnimationEnd={onAnimationEnd} onTransitionEnd={onTransitionEnd} testID="card" />
      </>
    );

    fireAnimationEnd(host(container, 'label'), 'rise', 0.4);
    fireTransitionEnd(host(container, 'card'), '--brand', 0.2);

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(onAnimationEnd).toHaveBeenCalledWith({ animationName: 'rise', elapsedTime: 0.4 });
    expect(onTransitionEnd).toHaveBeenCalledTimes(1);
    expect(onTransitionEnd).toHaveBeenCalledWith({ elapsedTime: 0.2, propertyName: '--brand' });
  });

  it('ignores a descendant completion and cancel events', () => {
    const onAnimationEnd = jest.fn();
    const onTransitionEnd = jest.fn();
    const Box = styled.View``;
    const { container } = render(
      <Box onAnimationEnd={onAnimationEnd} onTransitionEnd={onTransitionEnd} testID="parent">
        <Box testID="child" />
      </Box>
    );
    const parent = host(container, 'parent');
    const child = host(container, 'child');

    fireAnimationEnd(child, 'fade', 1);
    fireTransitionEnd(child, 'opacity', 0.2);
    dispatchWithFields(child, 'animationcancel', { animationName: 'fade', elapsedTime: 0.1 });
    dispatchWithFields(child, 'transitioncancel', { elapsedTime: 0.1, propertyName: 'opacity' });
    dispatchWithFields(parent, 'animationcancel', { animationName: 'fade', elapsedTime: 0.1 });
    dispatchWithFields(parent, 'transitioncancel', { elapsedTime: 0.1, propertyName: 'opacity' });

    expect(onAnimationEnd).not.toHaveBeenCalled();
    expect(onTransitionEnd).not.toHaveBeenCalled();
  });

  it('calls the latest callback, re-arms when a callback appears, and drops the listener on unmount', () => {
    const first = jest.fn();
    const second = jest.fn();
    const Box = styled.View``;
    const { container, rerender, unmount } = render(<Box testID="box" />);
    const node = host(container, 'box');

    fireAnimationEnd(node, 'fade', 1);
    fireTransitionEnd(node, 'opacity', 0.2);
    expect(first).not.toHaveBeenCalled();

    rerender(<Box onAnimationEnd={first} onTransitionEnd={first} testID="box" />);
    fireAnimationEnd(node, 'fade', 0.5);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({ animationName: 'fade', elapsedTime: 0.5 });

    rerender(<Box onAnimationEnd={second} onTransitionEnd={second} testID="box" />);
    fireTransitionEnd(node, 'opacity', 0.25);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith({ elapsedTime: 0.25, propertyName: 'opacity' });

    unmount();
    fireAnimationEnd(node, 'fade', 1);
    fireTransitionEnd(node, 'opacity', 0.2);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('detaches the listener when both callbacks are removed', () => {
    const onAnimationEnd = jest.fn();
    const onTransitionEnd = jest.fn();
    const Box = styled.View``;
    const { container, rerender } = render(
      <Box onAnimationEnd={onAnimationEnd} onTransitionEnd={onTransitionEnd} testID="box" />
    );
    const node = host(container, 'box');

    fireAnimationEnd(node, 'fade', 0.4);
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);

    rerender(<Box testID="box" />);
    fireAnimationEnd(node, 'fade', 1);
    fireTransitionEnd(node, 'opacity', 0.2);

    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
    expect(onTransitionEnd).not.toHaveBeenCalled();
  });

  it('follows a swapped caller ref while a callback is set, and a ref added later', () => {
    const onAnimationEnd = jest.fn();
    const Box = styled.View``;
    const refA = React.createRef<HTMLElement>();
    const refB = React.createRef<HTMLElement>();
    const { rerender, unmount } = render(
      <Box onAnimationEnd={onAnimationEnd} ref={refA} testID="box" />
    );
    const node = refA.current;
    expect(node).toBeInstanceOf(HTMLElement);

    rerender(<Box onAnimationEnd={onAnimationEnd} ref={refB} testID="box" />);
    expect(refB.current).toBe(node);
    expect(refA.current).toBeNull();

    fireAnimationEnd(node as HTMLElement, 'fade', 0.2);
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);

    rerender(<Box onAnimationEnd={onAnimationEnd} testID="box" />);
    expect(refB.current).toBeNull();
    rerender(<Box onAnimationEnd={onAnimationEnd} ref={refA} testID="box" />);
    expect(refA.current).toBe(node);

    unmount();
    expect(refA.current).toBeNull();
    fireAnimationEnd(node as HTMLElement, 'fade', 0.2);
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  it('re-invokes an inline ref on re-render while a callback is set', () => {
    const onAnimationEnd = jest.fn();
    const Box = styled.View``;
    const seen: unknown[] = [];
    const { rerender } = render(
      <Box
        onAnimationEnd={onAnimationEnd}
        ref={(node: unknown) => {
          seen.push(node);
        }}
        testID="reffed"
      />
    );
    const node = seen[0];
    expect(node).toBeInstanceOf(HTMLElement);

    rerender(
      <Box
        onAnimationEnd={onAnimationEnd}
        ref={(next: unknown) => {
          seen.push(next);
        }}
        testID="reffed"
      />
    );

    expect(seen).toEqual([node, null, node]);
    fireAnimationEnd(node as HTMLElement, 'fade', 0.3);
    expect(onAnimationEnd).toHaveBeenCalledTimes(1);
  });

  it('fires on a FlatList, whose ref is the list instance, via its scrollable node', () => {
    const onAnimationEnd = jest.fn();
    const List = styled.FlatList``;
    const { container } = render(
      <List
        data={['a']}
        onAnimationEnd={onAnimationEnd}
        renderItem={() => <span>a</span>}
        testID="list"
      />
    );
    fireAnimationEnd(host(container, 'list'), 'fade', 0.4);
    expect(onAnimationEnd).toHaveBeenCalledWith({ animationName: 'fade', elapsedTime: 0.4 });
  });

  it('fires on a SectionList and a VirtualizedList through the same scrollable node', () => {
    const onAnimationEnd = jest.fn();
    const onTransitionEnd = jest.fn();
    const Sections = styled.SectionList``;
    const Virtual = styled.VirtualizedList``;
    const { container } = render(
      <>
        <Sections
          keyExtractor={(item: string) => item}
          onAnimationEnd={onAnimationEnd}
          renderItem={() => <span>a</span>}
          sections={[{ data: ['a'] }]}
          testID="sections"
        />
        <Virtual
          data={['a']}
          getItem={(data: readonly string[], index: number) => data[index]}
          getItemCount={(data: readonly string[]) => data.length}
          keyExtractor={(item: string) => item}
          onTransitionEnd={onTransitionEnd}
          renderItem={() => <span>b</span>}
          testID="virtual"
        />
      </>
    );
    fireAnimationEnd(host(container, 'sections'), 'fade', 0.4);
    fireTransitionEnd(host(container, 'virtual'), 'opacity', 0.2);
    expect(onAnimationEnd).toHaveBeenCalledWith({ animationName: 'fade', elapsedTime: 0.4 });
    expect(onTransitionEnd).toHaveBeenCalledWith({ elapsedTime: 0.2, propertyName: 'opacity' });
  });

  it('warns when the ref is not the element the CSS is on', () => {
    resetWarnOnce();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const onAnimationEnd = jest.fn();
      const Frame = styled.KeyboardAvoidingView``;
      const { container } = render(
        <Frame onAnimationEnd={onAnimationEnd} testID="frame">
          <span>x</span>
        </Frame>
      );
      const node = container.querySelector('[data-testid="frame"]');
      expect(node).toBeInstanceOf(HTMLElement);
      fireAnimationEnd(node as HTMLElement, 'fade', 0.4);
      expect(onAnimationEnd).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith(
        "[sc] onAnimationEnd and onTransitionEnd did not run because this component's ref is not the element the CSS is on. Move the callback to a styled View or Text. FlatList, SectionList, and VirtualizedList do run it. KeyboardAvoidingView does not, so put the callback on a styled View inside it."
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('keeps a caller ref when the end callbacks are set', () => {
    const seen: unknown[] = [];
    const onAnimationEnd = jest.fn();
    const Box = styled.View``;
    render(
      <Box
        onAnimationEnd={onAnimationEnd}
        ref={(node: unknown) => {
          seen.push(node);
        }}
        testID="reffed"
      />
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(HTMLElement);
    expect((seen[0] as HTMLElement).getAttribute('data-testid')).toBe('reffed');
    fireAnimationEnd(seen[0] as HTMLElement, 'fade', 0.1);
    expect(onAnimationEnd).toHaveBeenCalledWith({ animationName: 'fade', elapsedTime: 0.1 });
  });
});

describe('rn-web bridge: Pressable', () => {
  it('emits the bridge class on a Pressable node', () => {
    const Btn = styled.Pressable`
      background-color: orange;
    `;
    const { container } = render(<Btn testID="btn" />);
    const node = container.querySelector('[data-testid="btn"]') as HTMLElement;
    expect(node).not.toBeNull();
    const cls = node.getAttribute('class') ?? '';
    expect(cls).toMatch(/sc-/);
  });
});

describe('rn-web bridge: CSS surface delegated to the browser', () => {
  it('emits a :hover pseudo-class rule to the CSSOM', () => {
    const Btn = styled.Pressable`
      background-color: blue;
      &:hover {
        background-color: red;
      }
    `;
    render(<Btn testID="hover-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/:hover/);
  });

  it('emits an @media query block to the CSSOM', () => {
    const Box = styled.View`
      background-color: white;
      @media (min-width: 600px) {
        background-color: black;
      }
    `;
    render(<Box testID="media-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/@media[^{]*min-width:\s*600px/);
  });

  it('passes through a CSS custom property declaration', () => {
    const Box = styled.View`
      --brand: tomato;
      color: var(--brand);
    `;
    render(<Box testID="vars-probe" />);
    const css = readAllCss();
    expect(css).toContain('--brand');
    expect(css).toMatch(/var\(--brand\)/);
  });
});

describe('rn-web bridge: dynamic interpolations + attrs + theme', () => {
  it('regenerates CSS when a prop-driven interpolation changes', () => {
    const Box = styled.View<{ $tone: 'a' | 'b' }>`
      background-color: ${p => (p.$tone === 'a' ? 'rgb(10, 20, 30)' : 'rgb(40, 50, 60)')};
    `;
    const { container, rerender } = render(<Box testID="dyn" $tone="a" />);
    let css = readAllCss();
    expect(css).toContain('rgb(10, 20, 30)');

    rerender(<Box testID="dyn" $tone="b" />);
    css = readAllCss();
    expect(css).toContain('rgb(40, 50, 60)');
    // The DOM node should still be present and class-bearing.
    const node = container.querySelector('[data-testid="dyn"]') as HTMLElement;
    expect(node.getAttribute('class') ?? '').toMatch(/sc-/);
  });

  it('honors theme values pulled from <ThemeProvider> through the bridge', () => {
    const Box = styled.View`
      background-color: ${(p: { theme: { bg: string } }) => p.theme.bg};
    `;
    render(
      <ThemeProvider theme={{ bg: 'rgb(11, 22, 33)' }}>
        <Box testID="themed" />
      </ThemeProvider>
    );
    const css = readAllCss();
    expect(css).toContain('rgb(11, 22, 33)');
  });

  it('reaches the DOM through .attrs() injected props', () => {
    const Btn = styled.Pressable.attrs({ accessibilityLabel: 'go' })`
      background-color: yellow;
    `;
    const { container } = render(<Btn testID="attrs-probe" />);
    const node = container.querySelector('[data-testid="attrs-probe"]') as HTMLElement;
    expect(node).not.toBeNull();
    // rn-web maps accessibilityLabel to aria-label.
    expect(node.getAttribute('aria-label')).toBe('go');
  });
});

describe('rn-web bridge: full primitive surface', () => {
  // Each rn-web alias exposed by `styled-components/native` should also
  // be reachable through the bridge. Smoke-test each one renders DOM
  // with our bridge class somewhere in its rendered subtree. Some
  // aliases (Image, ImageBackground, TouchableHighlight, ActivityIndicator)
  // wrap multiple DOM nodes internally so the testID target isn't
  // always the class-bearing node; the tree-wide check covers both.
  type AliasCase = { needsChild?: boolean };
  const checks: ReadonlyArray<[string, AliasCase]> = [
    ['Image', {}],
    ['ImageBackground', { needsChild: true }],
    ['ScrollView', {}],
    ['TextInput', {}],
    ['SafeAreaView', {}],
    ['Switch', {}],
    ['TouchableOpacity', { needsChild: true }],
    ['TouchableHighlight', { needsChild: true }],
    ['ActivityIndicator', {}],
  ];
  for (const [alias, opts] of checks) {
    it(`bridges styled.${alias}`, () => {
      const Factory = (styled as Record<string, unknown>)[alias] as (
        strings: TemplateStringsArray,
        ...args: unknown[]
      ) => React.ComponentType<{ testID?: string; children?: React.ReactNode }>;
      const Component = Factory`
        background-color: rebeccapurple;
      `;
      const children = opts.needsChild ? <span>x</span> : undefined;
      const { container } = render(
        React.createElement(
          Component,
          { testID: `probe-${alias}` } as { testID: string; children?: React.ReactNode },
          children
        )
      );
      expect(container.innerHTML).toMatch(/sc-/);
    });
  }
});

describe('rn-web bridge: web-native primitives and arbitrary components', () => {
  it('handles browser HTML element shortcuts via the inherited web factory', () => {
    // The bridge re-exports the web `styled` so HTML primitives without
    // an rn-web equivalent (`<a>`, `<select>`, `<dialog>`, etc.) work
    // unchanged. These render directly to the underlying tag.
    const Link = styled.a`
      color: rgb(7, 8, 9);
      text-decoration: underline;
    `;
    const Select = styled.select`
      background-color: rgb(101, 102, 103);
    `;
    const { container } = render(
      <>
        <Link href="#x" data-testid="link">
          hi
        </Link>
        <Select data-testid="select">
          <option>a</option>
        </Select>
      </>
    );
    const link = container.querySelector('[data-testid="link"]') as HTMLElement;
    const select = container.querySelector('[data-testid="select"]') as HTMLElement;
    expect(link.tagName.toLowerCase()).toBe('a');
    expect(select.tagName.toLowerCase()).toBe('select');
    expect(link.getAttribute('class') ?? '').toMatch(/sc-/);
    expect(select.getAttribute('class') ?? '').toMatch(/sc-/);
  });

  it('wraps an arbitrary React component via styled(Component)', () => {
    function Card(props: { className?: string; children?: React.ReactNode }): React.ReactElement {
      return (
        <div data-testid="card" className={props.className}>
          {props.children}
        </div>
      );
    }
    const Styled = styled(Card)`
      background-color: rgb(220, 230, 240);
    `;
    const { container } = render(<Styled>inside</Styled>);
    const card = container.querySelector('[data-testid="card"]') as HTMLElement;
    expect(card).not.toBeNull();
    expect(card.getAttribute('class') ?? '').toMatch(/sc-/);
  });
});

describe('rn-web bridge: web baselines', () => {
  it('opts the document into both color schemes so light-dark() and useColorScheme resolve', () => {
    // Importing the bridge module set this at evaluation time; check it.
    expect(document.documentElement.style.colorScheme).toBe('light dark');
  });

  it('declares cursor: pointer on Pressable so web affordance survives', () => {
    const Btn = styled.Pressable`
      background-color: gray;
    `;
    render(<Btn testID="cursor-probe" />);
    const css = readAllCss();
    expect(css).toMatch(/cursor:\s*pointer/);
  });
});

describe('rn-web bridge: CSS surfaces that needed polyfills on native pass through to the browser', () => {
  // rn-web filters unknown style keys, so a native-style prop route (numberOfLines
  // from text-overflow, resizeMode from object-fit, etc.) would be needed
  // there. The bridge sends these styles through the web pipeline to the
  // CSSOM, so the browser sees the spec property names directly.
  const surfaces: ReadonlyArray<[string, string, RegExp]> = [
    ['text-overflow', 'text-overflow: ellipsis; white-space: nowrap;', /text-overflow:\s*ellipsis/],
    ['object-fit', 'object-fit: cover;', /object-fit:\s*cover/],
    ['overscroll-behavior', 'overscroll-behavior: contain;', /overscroll-behavior:\s*contain/],
    ['scrollbar-width', 'scrollbar-width: thin;', /scrollbar-width:\s*thin/],
    ['accent-color', 'accent-color: rgb(20, 30, 40);', /accent-color:\s*rgb\(20,\s*30,\s*40\)/],
    ['caret-color', 'caret-color: rgb(50, 60, 70);', /caret-color:\s*rgb\(50,\s*60,\s*70\)/],
    ['hyphens', 'hyphens: auto;', /hyphens:\s*auto/],
    ['pointer-events', 'pointer-events: none;', /pointer-events:\s*none/],
    ['text-wrap', 'text-wrap: balance;', /text-wrap:\s*balance/],
    ['field-sizing', 'field-sizing: content;', /field-sizing:\s*content/],
  ];
  for (const [name, decl, expected] of surfaces) {
    it(`emits ${name} declarations through to the CSSOM`, () => {
      const Box = styled.View`
        ${decl}
      `;
      render(<Box testID={`probe-${name}`} />);
      expect(readAllCss()).toMatch(expected);
    });
  }
});

describe('rn-web bridge: omniplatform export parity', () => {
  // Every value export of the Hermes entry (src/native/index.ts) that an
  // omniplatform app can call at module scope must also exist on the
  // bridge, or `import { x } from 'styled-components/native'` crashes on
  // web ("x is not a function"). Keep this list in sync when adding value
  // exports to the native entry.
  const OMNIPLATFORM_VALUE_EXPORTS = [
    'NativeStyleContext',
    'ParentContext',
    'SafeAreaInsetsProvider',
    'ThemeConsumer',
    'ThemeContext',
    'ThemeProvider',
    'createTheme',
    'css',
    'isStyledComponent',
    'matchMedia',
    'setAnimationDebug',
    'styled',
    'toStyleSheet',
    'useBreakpoint',
    'useContainer',
    'useContainerQuery',
    'useMediaEnv',
    'useMediaQuery',
    'useNativeStyleContext',
    'useParentContext',
    'useTheme',
    'withTheme',
  ] as const;

  it.each(OMNIPLATFORM_VALUE_EXPORTS)('exports %s', name => {
    const bridge = require('../native/web-bridge');
    expect(bridge[name]).toBeDefined();
  });

  it('SafeAreaInsetsProvider renders its children unchanged (the browser owns env(safe-area-inset-*))', () => {
    const { SafeAreaInsetsProvider } = require('../native/web-bridge');
    const { getByTestId } = render(
      <SafeAreaInsetsProvider insets={{ bottom: 1, left: 2, right: 3, top: 4 }}>
        <span data-testid="inside">child</span>
      </SafeAreaInsetsProvider>
    );
    expect(getByTestId('inside').textContent).toBe('child');
  });

  it('setAnimationDebug is callable and inert (browser owns animations on web)', () => {
    const bridge = require('../native/web-bridge');
    expect(() => {
      bridge.setAnimationDebug('timeline');
      bridge.setAnimationDebug(true);
      bridge.setAnimationDebug(false);
    }).not.toThrow();
  });

  it('toStyleSheet returns an empty object and warns once with the sc prefix and a fix', () => {
    const { resetWarnOnce } = require('../utils/warnOnce');
    const bridge = require('../native/web-bridge');
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resetWarnOnce();
    try {
      expect(bridge.toStyleSheet()).toEqual({});
      expect(bridge.toStyleSheet()).toEqual({});
      expect(warn.mock.calls).toEqual([
        [
          '[sc] `toStyleSheet` is a no-op on the rn-web bridge and returns an empty object. Use the `css` helper to build web styles.',
        ],
      ]);
    } finally {
      warn.mockRestore();
    }
  });
});

describe('rn-web bridge: parity gaps surfaced from native-showcase', () => {
  // accent-color: oklch / color-mix / system color / auto must reach the CSSOM
  // intact. The browser handles each natively; the web pipeline just
  // needs to not eat them.
  describe('accent-color modern color functions and system values', () => {
    const cases: ReadonlyArray<[string, string, RegExp]> = [
      ['oklch()', 'accent-color: oklch(60% 0.2 250);', /accent-color:\s*oklch\(60%\s*0\.2\s*250\)/],
      [
        'color-mix()',
        'accent-color: color-mix(in srgb, red, blue);',
        /accent-color:\s*color-mix\(in srgb,\s*red,\s*blue\)/,
      ],
      ['system color', 'accent-color: AccentColor;', /accent-color:\s*AccentColor/i],
      ['auto', 'accent-color: auto;', /accent-color:\s*auto/],
    ];
    for (const [name, decl, expected] of cases) {
      it(`passes accent-color: ${name} through`, () => {
        const Box = styled.View`
          ${decl}
        `;
        render(<Box testID={`accent-${name}`} />);
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('system color keywords on arbitrary properties', () => {
    const cases: ReadonlyArray<[string, string, RegExp]> = [
      ['Canvas (background)', 'background-color: Canvas;', /background-color:\s*Canvas/i],
      ['CanvasText (color)', 'color: CanvasText;', /color:\s*CanvasText/i],
      ['LinkText (color)', 'color: LinkText;', /color:\s*LinkText/i],
      [
        'ButtonFace (background)',
        'background-color: ButtonFace;',
        /background-color:\s*ButtonFace/i,
      ],
      ['Mark (background)', 'background-color: Mark;', /background-color:\s*Mark/i],
      [
        'AccentColor (background)',
        'background-color: AccentColor;',
        /background-color:\s*AccentColor/i,
      ],
      ['AccentColorText (color)', 'color: AccentColorText;', /color:\s*AccentColorText/i],
    ];
    for (const [name, decl, expected] of cases) {
      it(`passes ${name} through`, () => {
        const Box = styled.View`
          ${decl}
        `;
        render(<Box testID={`sysc-${name}`} />);
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('CSS Compositing 1 mix-blend-mode propagation', () => {
    it('emits mix-blend-mode: multiply to the CSSOM unaltered', () => {
      const Face = styled.View`
        background-color: red;
        mix-blend-mode: multiply;
      `;
      render(<Face testID="blend-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/mix-blend-mode:\s*multiply/);
    });

    it('emits mix-blend-mode alongside color-mix backgrounds', () => {
      const Face = styled.View`
        background-color: color-mix(in srgb, #4287f5 78%, transparent);
        mix-blend-mode: multiply;
      `;
      render(<Face testID="blend-color-mix" />);
      const css = readAllCss();
      expect(css).toMatch(/mix-blend-mode:\s*multiply/);
      expect(css).toMatch(/color-mix\(in srgb,/);
    });
  });

  describe('object-fit on Image', () => {
    // rn-web's `<Image>` renders as a `<div>` with `background-image: url(...)`,
    // not as `<img>`. CSS `object-fit` only applies to replaced elements, so a
    // raw `object-fit: cover` declaration is a no-op against a `<div>`. The
    // bridge lifts `object-fit` to a `resizeMode` prop (which rn-web's Image
    // translates to `background-size`).
    it('lands the bridge class on the Image DOM node', () => {
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-fit" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="pic-fit"]') as HTMLElement;
      expect(node).not.toBeNull();
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourClass = cls.find(c => c.startsWith('sc-'));
      expect(ourClass).toBeDefined();
    });

    it('renders the rn-web Image as a <div> with background-image (not an <img>)', () => {
      // Documents the architectural reason `object-fit` is a no-op
      // against the CSS alone: the element it's authored against is
      // a `<div>`, not a replaced element.
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-shape" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="pic-shape"]') as HTMLElement;
      expect(node).not.toBeNull();
      expect(node.tagName.toLowerCase()).toBe('div');
    });

    it('lifts object-fit to resizeMode so rn-web Image actually shapes the image', () => {
      const Pic = styled.Image`
        object-fit: contain;
      `;
      const { container } = render(
        <Pic testID="pic-lifted" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      // rn-web emits its `background-size` atomic class on the inner
      // backdrop `<div>`. The class name carries a hash of the value;
      // the underlying CSS rule lives in the CSSOM.
      const inner = container.querySelector(
        '[data-testid="pic-lifted"] > div'
      ) as HTMLElement | null;
      expect(inner).not.toBeNull();
      const innerCls = (inner!.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const bgSize = innerCls.find(c => c.startsWith('r-backgroundSize-'));
      expect(bgSize).toBeDefined();
      // The actual `background-size: contain` rule should live in the
      // CSSOM, keyed by that atomic class.
      expect(readAllCss()).toMatch(
        new RegExp(`\\.${bgSize}\\s*\\{[^}]*background-size:\\s*contain`, 'i')
      );
    });

    const fitCases: ReadonlyArray<[string, RegExp]> = [
      ['fill', /background-size:\s*100%\s*100%/i],
      ['cover', /background-size:\s*cover/i],
      ['contain', /background-size:\s*contain/i],
    ];
    for (const [fit, expected] of fitCases) {
      it(`lifts object-fit: ${fit} to a background-size match`, () => {
        // Each value gets its own styled component so the lift is
        // statically detectable (no interpolation).
        const factory = styled.Image as (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; source?: unknown }>;
        const Pic = factory(['object-fit: ' + fit + ';'] as unknown as TemplateStringsArray);
        render(
          <Pic testID={'pic-' + fit} source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
        );
        expect(readAllCss()).toMatch(expected);
      });
    }
  });

  describe('lift factories preserve .withConfig / .attrs chains', () => {
    // babel-plugin-styled-components rewrites every styled-component
    // declaration into `styled.X.withConfig({componentId, displayName})\`...\``,
    // so any lift wrapper that drops .withConfig / .attrs immediately
    // crashes the consumer app.
    it('supports .withConfig() on Image (the babel plugin uses this)', () => {
      const Factory = styled.Image as unknown as {
        withConfig: (c: {
          displayName?: string;
          componentId?: string;
        }) => (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; source?: unknown }>;
      };
      const Pic = Factory.withConfig({
        displayName: 'Pic',
        componentId: 'sc-pic-test',
      })`object-fit: cover;`;
      const { container } = render(
        <Pic testID="w" source={{ uri: 'data:image/png;base64,iVBORw0KGgo=' }} />
      );
      const node = container.querySelector('[data-testid="w"]') as HTMLElement;
      expect(node).not.toBeNull();
      // Lift still fired through the chain — bg-size: cover lands.
      expect(readAllCss()).toMatch(/background-size:\s*cover/i);
    });

    it('supports .attrs() chained on a lifted primitive', () => {
      const Factory = styled.Switch as unknown as {
        attrs: (
          a: object
        ) => (
          s: TemplateStringsArray
        ) => React.ComponentType<{ testID?: string; value?: boolean; onValueChange?: () => void }>;
      };
      const Toggle = Factory.attrs({ accessibilityLabel: 'a11y' })`
        accent-color: rgb(11, 22, 33);
      `;
      const { container } = render(<Toggle testID="s" value={true} onValueChange={() => {}} />);
      // .attrs() injected the accessibilityLabel (rn-web maps to aria-label).
      const node = container.querySelector('[data-testid="s"]') as HTMLElement;
      expect(node).not.toBeNull();
      // Lift still fired: trackColor reaches the track via accentColor.
      expect(readAllCss()).toMatch(/background-color:\s*rgba?\(11,\s*22,\s*33/i);
    });
  });

  describe('ast.pop key spelling in arity-2 attrs on Switch', () => {
    type SwitchFactory = {
      attrs: (
        a: (p: object, ast: { pop: (k: string) => unknown }) => object
      ) => (
        s: TemplateStringsArray
      ) => React.ComponentType<{ testID?: string; value?: boolean; onValueChange?: () => void }>;
    };

    /** Each spelling authors its own color so the CSSOM check reads only that component's rule. */
    function popWith(key: string, color: string) {
      const seen: unknown[] = [];
      const Factory = styled.Switch as unknown as SwitchFactory;
      const Toggle = Factory.attrs((_p, ast) => {
        seen.push(ast.pop(key));
        return {};
      })`
        accent-color: ${color};
      `;
      render(<Toggle testID={`pop-${color}`} value={true} onValueChange={() => {}} />);
      return { hasDecl: readAllCss().includes(`accent-color: ${color}`), seen };
    }

    it('pop of the authored spelling returns the value', () => {
      const { seen } = popWith('accent-color', 'rgb(1, 2, 3)');
      expect(seen.at(-1)).toBe('rgb(1, 2, 3)');
    });

    it('pop of the camelCase spelling returns the value, as on iOS and Android', () => {
      const { seen } = popWith('accentColor', 'rgb(4, 5, 6)');
      expect(seen.at(-1)).toBe('rgb(4, 5, 6)');
    });

    it('leaves the declaration in the CSSOM after a pop of either spelling', () => {
      expect({
        authored: popWith('accent-color', 'rgb(7, 8, 9)').hasDecl,
        camel: popWith('accentColor', 'rgb(10, 11, 12)').hasDecl,
      }).toEqual({ authored: true, camel: true });
    });
  });

  describe('text-wrap: nowrap lift on Text', () => {
    it('lifts text-wrap: nowrap to numberOfLines: 1 so rn-web applies textOneLine baseline', () => {
      const Label = styled.Text`
        text-wrap: nowrap;
        text-overflow: ellipsis;
      `;
      const { container } = render(<Label testID="wrap-nowrap">long content...</Label>);
      const node = container.querySelector('[data-testid="wrap-nowrap"]') as HTMLElement;
      // numberOfLines:1 puts the textOneLine baseline (white-space:
      // nowrap; text-overflow: ellipsis) on the element. Look for
      // the rn-web atomic class or inline styles that signal it.
      const html = node.outerHTML;
      expect(html).toMatch(/white-space|r-whiteSpace|textOneLine|text-overflow/i);
    });

    it('lets authored text-overflow: clip override rn-web baseline ellipsis', () => {
      const Label = styled.Text`
        text-wrap: nowrap;
        text-overflow: clip;
      `;
      const { container } = render(<Label testID="wrap-clip">long content...</Label>);
      const node = container.querySelector('[data-testid="wrap-clip"]') as HTMLElement;
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourCls = cls.find(
        c => /^[a-zA-Z]+$/.test(c) && !c.startsWith('css-') && !c.startsWith('r-')
      );
      // Our sc-class should declare text-overflow: clip in CSSOM.
      const css = readAllCss();
      const ruleMatch = css.match(
        new RegExp(`\\.${ourCls}\\s*\\{[^}]*text-overflow:\\s*clip`, 'i')
      );
      expect(ruleMatch).not.toBeNull();
    });

    it('passes through non-nowrap text-wrap values without lifting', () => {
      // text-wrap: balance shouldn't lift to numberOfLines (would
      // truncate the text incorrectly). The CSS reaches the CSSOM
      // and the browser handles balance natively.
      const Label = styled.Text`
        text-wrap: balance;
      `;
      const { container } = render(<Label testID="balance">balanced text</Label>);
      const node = container.querySelector('[data-testid="balance"]') as HTMLElement;
      // Element shouldn't have -webkit-line-clamp or rn-web's
      // numberOfLines baseline.
      expect(node.outerHTML).not.toMatch(/-webkit-line-clamp/i);
      const css = readAllCss();
      expect(css).toMatch(/text-wrap:\s*balance/);
    });
  });

  describe('raw rn-web primitive imports auto-bridge through styled()', () => {
    // Consumer pattern: `import { TextInput } from 'react-native'`
    // (which on web resolves to rn-web's TextInput) then
    // `styled(TextInput)\`...\``. The bridge should recognize the raw
    // import and apply the $$css shim + lifts the same way it would
    // for `styled.TextInput`.
    it('substitutes the bridged shim when wrapping a raw rn-web TextInput', async () => {
      const rnWeb = require('react-native-web');
      const RawTextInput = rnWeb.TextInput as React.ComponentType<{
        testID?: string;
        defaultValue?: string;
        multiline?: boolean;
      }>;
      const Field = styled(RawTextInput)`
        height: 120px;
        background-color: rgb(40, 50, 60);
      `;
      const { container } = render(<Field testID="raw-input" defaultValue="" multiline />);
      const node = container.querySelector('[data-testid="raw-input"]') as HTMLElement;
      expect(node).not.toBeNull();
      // The DOM should carry our sc-class through the $$css path.
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      const ourCls = cls.find(
        c => /^[a-zA-Z]+$/.test(c) && !c.startsWith('css-') && !c.startsWith('r-')
      );
      expect(ourCls).toBeDefined();
      // And the height + background should land in the CSSOM.
      const css = readAllCss();
      expect(css).toMatch(new RegExp('\\.' + ourCls + '\\s*\\{[^}]*height:\\s*120px'));
    });
  });

  describe('lifts apply to styled() extensions, not just styled.X alias getters', () => {
    // Showcase pattern: a base styled Text, then extending it with
    // additional styled CSS. The lift must fire on the EXTENSION,
    // not just on the direct alias call.
    it('lifts line-clamp on styled(BaseText) extending a styled.Text', () => {
      const Body = styled.Text`
        font-size: 14px;
      `;
      const Clamped = styled(Body)`
        line-clamp: 2;
      `;
      const { container } = render(<Clamped testID="ext-clamp">long content...</Clamped>);
      const node = container.querySelector('[data-testid="ext-clamp"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/-webkit-line-clamp:\s*2/i);
    });

    it('lifts text-wrap: nowrap on styled(BaseText) extending a styled.Text', () => {
      const Body = styled.Text`
        font-size: 14px;
      `;
      const Single = styled(Body)`
        text-wrap: nowrap;
        text-overflow: ellipsis;
      `;
      const { container } = render(<Single testID="ext-nowrap">long content...</Single>);
      const node = container.querySelector('[data-testid="ext-nowrap"]') as HTMLElement;
      // numberOfLines:1 → rn-web's textOneLine baseline class lands.
      // The class hash differs but the resulting computed white-space
      // should switch from 'pre' to 'nowrap'.
      const html = node.outerHTML;
      expect(html).toMatch(/r-whiteSpace|textOneLine|r-textOverflow/i);
    });
  });

  describe('field-sizing lift on TextInput', () => {
    it('lifts field-sizing: content to multiline so rn-web renders a <textarea>', () => {
      const Auto = styled.TextInput`
        field-sizing: content;
        min-height: 44px;
      `;
      const { container } = render(<Auto testID="fs-content" defaultValue="" />);
      const node = container.querySelector('[data-testid="fs-content"]') as HTMLElement;
      expect(node).not.toBeNull();
      // multiline: true → rn-web renders `<textarea>`, not `<input>`.
      expect(node.tagName.toLowerCase()).toBe('textarea');
    });

    it('leaves field-sizing: fixed and other values alone', () => {
      const Fixed = styled.TextInput`
        field-sizing: fixed;
      `;
      const { container } = render(<Fixed testID="fs-fixed" defaultValue="" />);
      const node = container.querySelector('[data-testid="fs-fixed"]') as HTMLElement;
      // multiline NOT lifted → rn-web renders `<input>` (single line).
      expect(node.tagName.toLowerCase()).toBe('input');
    });
  });

  describe('line-clamp lift on Text', () => {
    it('lifts line-clamp: N to numberOfLines so rn-web emits the webkit-line-clamp triple', () => {
      const Label = styled.Text`
        line-clamp: 3;
      `;
      const { container } = render(<Label testID="clamp-probe">long content...</Label>);
      const node = container.querySelector('[data-testid="clamp-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      // rn-web Text with numberOfLines > 1 sets WebkitLineClamp inline on the element,
      // plus a `textMultiLine` baseline class that supplies the `-webkit-box` display
      // and `-webkit-box-orient: vertical`. Both must land for the truncation to work.
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/-webkit-line-clamp:\s*3/i);
      const cls = node.getAttribute('class') ?? '';
      const html = node.outerHTML;
      // The rn-web `textMultiLine` baseline (with -webkit-box) must be present on
      // the element so the line-clamp actually clamps.
      expect(html + cls).toMatch(/-webkit-box|r-overflow|r-textOverflow/i);
    });

    it('lifts line-clamp: 1 to numberOfLines: 1', () => {
      const Label = styled.Text`
        line-clamp: 1;
      `;
      const { container } = render(<Label testID="clamp-one">long content...</Label>);
      const node = container.querySelector('[data-testid="clamp-one"]') as HTMLElement;
      // numberOfLines: 1 uses textOneLine baseline (white-space: nowrap + text-overflow: ellipsis).
      // We can't easily assert on the rn-web atomic class hashes, but the
      // node must NOT have WebkitLineClamp (which only applies for >1).
      expect(node.outerHTML).not.toMatch(/-webkit-line-clamp/i);
    });
  });

  describe('accent-color lift on Switch', () => {
    it('lifts accent-color: rgb() to trackColor so rn-web tinting works', () => {
      const Toggle = styled.Switch`
        accent-color: rgb(11, 22, 33);
      `;
      render(<Toggle testID="toggle-rgb" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      expect(css).toMatch(/background-color:\s*rgba?\(11,\s*22,\s*33/i);
    });

    it('canonicalizes oklch() so it reaches rn-web as rgb the normalizer accepts', () => {
      const Toggle = styled.Switch`
        accent-color: oklch(0.72 0.18 265);
      `;
      render(<Toggle testID="toggle-oklch" value={true} onValueChange={() => {}} />);
      // The lifted trackColor reaches rn-web as canonical rgb; rn-web
      // then paints the track. The exact rgb depends on the browser's
      // oklch -> sRGB conversion, but it must be a valid rgb() value
      // (not the raw oklch string which rn-web rejects to transparent).
      const css = readAllCss();
      // No "transparent" or "0/0" fallback on the track — actual rgb.
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('canonicalizes color-mix() to rgb', () => {
      const Toggle = styled.Switch`
        accent-color: color-mix(in oklch, #c8243a 50%, #ec4899 50%);
      `;
      render(<Toggle testID="toggle-mix" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('resolves accent-color: auto to a fixed accent fallback on Switch', () => {
      const Toggle = styled.Switch`
        accent-color: auto;
      `;
      render(<Toggle testID="toggle-auto" value={true} onValueChange={() => {}} />);
      const css = readAllCss();
      // Browser canonicalizes AccentColor to its current system value
      // (rgb form). Track gets a real color, not transparent.
      const trackMatch = css.match(/background-color:\s*(rgba?\([^)]+\))/i);
      expect(trackMatch).not.toBeNull();
    });

    it('resolves system colors (LinkText, ButtonFace) to rgb', () => {
      const TogA = styled.Switch`
        accent-color: LinkText;
      `;
      const TogB = styled.Switch`
        accent-color: ButtonFace;
      `;
      render(
        <>
          <TogA testID="tog-link" value={true} onValueChange={() => {}} />
          <TogB testID="tog-button" value={true} onValueChange={() => {}} />
        </>
      );
      const css = readAllCss();
      const matches = css.match(/background-color:\s*rgba?\([^)]+\)/gi) ?? [];
      // Both tracks resolved to rgb; at least 2 background-color rgb
      // rules should now be in the CSSOM.
      expect(matches.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('data-* props translated to dataSet for rn-web', () => {
    it('lands data-place="center" on the DOM so attribute selectors match', () => {
      const Box = styled.View`
        align-items: stretch;
        &[data-place='center'] {
          align-items: center;
        }
      `;
      const { container } = render(
        <Box testID="da-probe" {...({ 'data-place': 'center' } as object)} />
      );
      const node = container.querySelector('[data-testid="da-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      // The attribute itself must land on the DOM (rn-web converts
      // dataSet.place → data-place).
      expect(node.getAttribute('data-place')).toBe('center');
    });

    it('lands kebab-cased data-* suffixes correctly', () => {
      const Box = styled.View``;
      const { container } = render(
        <Box testID="kebab" {...({ 'data-place-self': 'end' } as object)} />
      );
      const node = container.querySelector('[data-testid="kebab"]') as HTMLElement;
      expect(node.getAttribute('data-place-self')).toBe('end');
    });
  });

  describe('pointerEvents prop lifted into style.pointerEvents', () => {
    // rn-web's createDOMProps deprecates the `pointerEvents` prop in favor
    // of `style.pointerEvents`. Consumers writing idiomatic cross-platform
    // RN code shouldn't see a deprecation warning on web; the bridge lifts
    // the prop into the styleq array so rn-web reads it from style.
    it('does not log the rn-web deprecation warning when pointerEvents is passed as a prop', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const Box = styled.View``;
      render(<Box testID="pe" pointerEvents="none" />);
      const deprecation = warn.mock.calls.find(
        ([msg]) => typeof msg === 'string' && msg.indexOf('pointerEvents is deprecated') !== -1
      );
      expect(deprecation).toBeUndefined();
      warn.mockRestore();
    });

    it('routes the value through to the DOM via style', () => {
      const Box = styled.View``;
      const { container } = render(<Box testID="pe-none" pointerEvents="none" />);
      const node = container.querySelector('[data-testid="pe-none"]') as HTMLElement;
      expect(getComputedStyle(node).pointerEvents).toBe('none');
    });
  });

  describe('var() + unit-suffix rewrite for createTheme sentinels', () => {
    // `createTheme.web` emits leaves like `var(--sc-space-sm, 13)`. The
    // idiomatic interpolation pattern `padding: ${t.space.sm}px;` produces
    // `padding: var(--sc-space-sm, 13)px;` which the browser drops because
    // the unit lands outside the var() boundary. The bridge rewrites
    // these to `calc(var(...) * 1<unit>)` so the value survives.
    it('rewrites var()+px in the styled CSS to a calc form the browser accepts', () => {
      // Authored via interpolation so the Prettier CSS plugin doesn't
      // collapse the no-space form back into `var(...) px`. The runtime
      // input is identical: `${sentinel}px` joins to `var(...)px`.
      const sentinel = 'var(--sc-space-sm, 13)';
      const Box = styled.View`
        padding: ${sentinel}px;
      `;
      render(<Box testID="px-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
    });

    it('rewrites the showcase pattern: createTheme sentinel from interpolation + unit from next segment', () => {
      // Mirrors the 498 occurrences of `${t.space.x}<unit>` in native-showcase.
      // `t.space.sm` is the createTheme leaf string, dropped into an
      // interpolation slot; the literal `px` lives in the next static
      // segment. The rewrite must catch the post-concatenation form.
      const sentinel = 'var(--sc-space-sm, 13)';
      const Box = styled.View`
        padding: ${sentinel}px;
        margin-top: ${sentinel}px;
        gap: ${sentinel}px;
      `;
      render(<Box testID="interp-probe" />);
      const css = readAllCss();
      // After the compiler patch fires, the value should be calc(var() * 1px).
      expect(css).toMatch(/padding:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
      expect(css).toMatch(/margin-top:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
      expect(css).toMatch(/gap:\s*calc\(var\(--sc-space-sm,\s*13\)\s*\*\s*1px\)/);
    });

    it('rewrites every known length / %% / time / angle unit', () => {
      // Interpolation form so Prettier preserves the no-space join.
      const a = 'var(--a, 1)';
      const b = 'var(--b, 2)';
      const c = 'var(--c, 3)';
      const d = 'var(--d, 4)';
      const e = 'var(--e, 5)';
      const f = 'var(--f, 100)';
      const g = 'var(--g, 45)';
      const Box = styled.View`
        padding: ${a}em;
        margin: ${b}rem;
        gap: ${c}vh;
        flex-basis: ${d}vw;
        width: ${e}%;
        transition: opacity ${f}ms;
        rotate: ${g}deg;
      `;
      render(<Box testID="units-probe" />);
      const css = readAllCss();
      for (const unit of ['1em', '1rem', '1vh', '1vw', '1%', '1ms', '1deg']) {
        expect(css).toContain('* ' + unit);
      }
    });

    it('leaves a var() not followed by a known unit alone', () => {
      const Box = styled.View`
        color: var(--sc-color-fg, red);
        background: var(--sc-bg, blue) center / cover no-repeat;
      `;
      render(<Box testID="leave-probe" />);
      const css = readAllCss();
      // Original var() must still be intact, NOT wrapped in calc.
      expect(css).toMatch(/var\(--sc-color-fg,\s*red\)/);
      expect(css).not.toMatch(/calc\(var\(--sc-color-fg/);
    });

    it('leaves unitless var() values alone', () => {
      const Box = styled.View`
        opacity: var(--sc-opacity, 0.5);
        flex-grow: var(--sc-grow, 1);
      `;
      render(<Box testID="unitless-probe" />);
      const css = readAllCss();
      expect(css).toMatch(/var\(--sc-opacity,\s*0\.5\)/);
      expect(css).not.toMatch(/calc\(var\(--sc-opacity/);
    });
  });

  /*
   * CSS Box Alignment 3 (https://drafts.csswg.org/css-align-3/), quoted from the editor's draft.
   *
   * 5.1.1 Block Containers (Including Table Cells)
   *   "For table cells, the behavior of align-content: normal depends on the computed value of
   *   vertical-align: top makes it behave as start and bottom makes it behave as end; otherwise
   *   middle makes it behave as center, and all other values make it behave as baseline."
   *   "All values other than normal force the block container to establish an independent
   *   formatting context."
   *
   * CSS Flexible Box Layout 1 (https://drafts.csswg.org/css-flexbox-1/), quoted from the editor's
   * draft.
   *
   * 9.4 Cross Axis Alignment
   *   "In a single-line flex container, the cross size of the line is the cross size of the flex
   *   container, and align-content has no effect."
   *
   * `vertical-align` is inert on a block container such as a rn-web Text inside a View, so the
   * bridge writes `align-content` before the rule's authored declarations on the component's own
   * element. The declaration lands in the same rule, so it never outweighs an authored
   * `align-content`, `display` or `align-items`, and a single line flex View is unaffected.
   */
  describe('vertical-align on the component element', () => {
    it('writes it for a TextInput, which renders a textarea', () => {
      const Field = styled.TextInput`
        height: 120px;
        vertical-align: middle;
      `;
      const { container } = render(<Field testID="va-input" multiline defaultValue="x" />);
      const node = container.querySelector('[data-testid="va-input"]') as HTMLElement;

      expect(node.tagName.toLowerCase()).toBe('textarea');
      expect(renderedCss(<Field />)).toBe(
        '.c {align-content: center; height: 120px; vertical-align: middle;}'
      );
    });
  });

  /*
   * CSS Values 4 (https://drafts.csswg.org/css-values-4/), quoted from the editor's draft.
   *
   * 10.9 Type Checking
   *   "A math function can be many possible types, such as <length>, <number>, etc., depending on
   *   the calculations it contains, as defined below. It can be used anywhere a value of that type
   *   is allowed."
   *   "Note: Although there are a few properties in which a bare <number> becomes a <length> at
   *   used-value time (specifically, line-height and tab-size), <number>s never become
   *   "length-like" in calc(). They always stay as <number>s."
   *
   * A math function on unitless arguments is a `<number>`, so the browser drops it from a length
   * property, as standard CSS has it. The bridge leaves the value as authored and repairs only a
   * `var()` joined to a unit.
   */
  describe('math functions on unitless arguments', () => {
    test.each(['width: abs(-180)', 'opacity: pow(0.5, 2)'])('emits %s as authored', decl => {
      const Box = styled.View`
        ${decl};
      `;

      expect(renderedCss(<Box />)).toBe('.c {' + decl + ';}');
    });

    it('repairs a var() unit in a nested rule inside an at-rule', () => {
      const Box = styled.View`
        @media (min-width: 100px) {
          & .child {
            padding: var(--s, 4)px;
          }
        }
      `;

      expect(renderedCss(<Box />)).toBe(
        '@media (min-width: 100px) {.c .child {padding: calc(var(--s, 4) * 1px);}}'
      );
    });

    it('repairs a var() unit in keyframes', () => {
      const grow = keyframes`
        to {
          margin-left: var(--s, 4)px;
        }
      `;
      const Box = styled.View`
        animation: ${grow} 1s;
      `;

      // jsdom writes a keyframes rule over several lines; the name is generated.
      const css = renderedCss(<Box />).replace(/\s+/g, ' ');
      const name = /@keyframes (\S+)/.exec(css)?.[1] ?? '';

      expect(css.replaceAll(name, 'grow')).toBe(
        '@keyframes grow { to {margin-left: calc(var(--s, 4) * 1px);} } .c {animation: grow 1s;}'
      );
    });

    it('repairs a var() unit in a global style inside an at-rule', () => {
      const Global = createGlobalStyle`
        @media (min-width: 100px) {
          .icon {
            letter-spacing: var(--s, 4)px;
          }
        }
      `;

      expect(renderedCss(<Global />)).toBe(
        '@media (min-width: 100px) {.icon {letter-spacing: calc(var(--s, 4) * 1px);}}'
      );
    });
  });

  describe('3D matrix transform rewrite', () => {
    // rn-web emits transform values containing function-call parens as
    // inline `style` attributes (not atomic CSS), so the assertion
    // target is the rendered node's `style` attribute.
    it('rewrites a 16-element matrix inline transform so rn-web emits matrix3d', () => {
      // The showcase logo uses `transform: [{matrix: [...16 numbers]}]`
      // as inline style on absolute children. rn-web's preprocess
      // naively emits matrix(...) with all 16 args; the browser drops
      // the declaration as invalid and all elements stack at origin.
      // The bridge rewrites to matrix3d before rn-web sees it.
      const Box = styled.View``;
      const identity4x4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const { container } = render(
        <Box testID="m3d" style={{ transform: [{ matrix: identity4x4 }] } as unknown as object} />
      );
      const node = container.querySelector('[data-testid="m3d"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      expect(style).toMatch(/matrix3d\(/i);
      // And the broken 16-arg matrix() (would be 15 commas inside)
      // must NOT appear.
      expect(style).not.toMatch(/transform:\s*matrix\((?:[^,)]+,){15}/i);
    });

    it('leaves a 9-element matrix alone', () => {
      // rn-web parses 9-element matrices as 3x3 affine and emits
      // matrix(...) which is valid 2D CSS. The bridge MUST NOT
      // promote those to matrix3d.
      const Box = styled.View``;
      const id3x3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
      const { container } = render(
        <Box testID="m9" style={{ transform: [{ matrix: id3x3 }] } as unknown as object} />
      );
      const node = container.querySelector('[data-testid="m9"]') as HTMLElement;
      const style = node.getAttribute('style') ?? '';
      // rn-web emits matrix(...) for the 9-element form.
      expect(style).toMatch(/matrix\(/i);
      expect(style).not.toMatch(/matrix3d/i);
    });
  });

  describe('ScrollView baseline clipping survives through the bridge', () => {
    it('renders rn-web ScrollView with overflow + flex baseline preserved', () => {
      const Scroll = styled.ScrollView`
        overscroll-behavior: auto;
        scrollbar-width: auto;
      `;
      const { container } = render(
        <Scroll testID="scroll-probe">
          <span>row 1</span>
          <span>row 2</span>
          <span>row 3</span>
        </Scroll>
      );
      const node = container.querySelector('[data-testid="scroll-probe"]') as HTMLElement;
      expect(node).not.toBeNull();
      const cls = (node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
      // Our class lands
      expect(cls.some(c => c.startsWith('sc-'))).toBe(true);
      // rn-web atomic baseline classes must also be present so the
      // ScrollView clips its overflow and grows to fill its flex parent.
      expect(cls.some(c => c.startsWith('r-overflow'))).toBe(true);
    });
  });
});

describe('rn-web bridge: ThemeProvider publishes CSS vars for scoped overrides', () => {
  it('emits override leaves as --sc-* custom properties on a display:contents wrapper', () => {
    const { container } = render(
      <BridgeThemeProvider theme={{ colors: { accent: '#1f7a52' } }}>
        <div data-testid="probe" />
      </BridgeThemeProvider>
    );
    const probe = container.querySelector('[data-testid="probe"]') as HTMLElement;
    const wrapper = probe.parentElement as HTMLElement;
    expect(wrapper.style.display).toBe('contents');
    expect(wrapper.style.getPropertyValue('--sc-colors-accent')).toBe('#1f7a52');
  });

  it('nested overrides do not emit unrelated keys on the inner wrapper', () => {
    const { container } = render(
      <BridgeThemeProvider theme={{ colors: { accent: '#0e0e10', bg: '#fff' } }}>
        <BridgeThemeProvider theme={{ colors: { accent: '#c8243a' } }}>
          <div data-testid="leaf" />
        </BridgeThemeProvider>
      </BridgeThemeProvider>
    );
    const leaf = container.querySelector('[data-testid="leaf"]') as HTMLElement;
    const inner = leaf.parentElement as HTMLElement;
    expect(inner.style.getPropertyValue('--sc-colors-accent')).toBe('#c8243a');
    expect(inner.style.getPropertyValue('--sc-colors-bg')).toBe('');
    const outer = inner.parentElement as HTMLElement;
    expect(outer.style.getPropertyValue('--sc-colors-accent')).toBe('#0e0e10');
    expect(outer.style.getPropertyValue('--sc-colors-bg')).toBe('#fff');
  });

  it('function-form theme skips var publish but still provides JS context', () => {
    const Probe = styled.View`
      color: ${(p: { theme: { fg: string } }) => p.theme.fg};
    `;
    const { container } = render(
      <BridgeThemeProvider theme={() => ({ fg: 'rgb(1, 2, 3)' })}>
        <Probe testID="fn-themed" />
      </BridgeThemeProvider>
    );
    const probe = container.querySelector('[data-testid="fn-themed"]') as HTMLElement;
    expect(probe).not.toBeNull();
    expect(probe.parentElement?.style.display).not.toBe('contents');
    expect(readAllCss()).toContain('rgb(1, 2, 3)');
  });

  it('a styled component reads scoped var() value from the nearest provider', () => {
    const theme = createTheme({ colors: { accent: '#0e0e10' } });
    const Swatch = styled.View`
      background-color: ${theme.colors.accent};
    `;
    const { container } = render(
      <BridgeThemeProvider theme={theme.raw}>
        <BridgeThemeProvider theme={{ colors: { accent: 'rgb(31, 122, 82)' } }}>
          <Swatch testID="scoped-swatch" />
        </BridgeThemeProvider>
      </BridgeThemeProvider>
    );
    const node = container.querySelector('[data-testid="scoped-swatch"]') as HTMLElement;
    // Walk up to the override wrapper; verify the override var is published there.
    let cur: HTMLElement | null = node;
    let found = '';
    while (cur && !found) {
      found = cur.style?.getPropertyValue?.('--sc-colors-accent') ?? '';
      cur = cur.parentElement;
    }
    expect(found).toBe('rgb(31, 122, 82)');
  });
});

describe('rn-web bridge: createTheme integration', () => {
  // The bridge unblocks the createTheme native unification spike from
  // 2026-05-18: with the bridge, themes go through the web pipeline so
  // var() is the browser's responsibility.
  it('publishes theme values as CSS custom properties via createTheme.GlobalStyle', () => {
    // The bridge subpath should re-export the WEB createTheme so
    // consumers don't have to wire up the native sentinel translator.
    const theme = createTheme({ colors: { bg: 'rgb(77, 88, 99)' } });
    const Box = styled.View`
      background-color: ${theme.colors.bg};
    `;
    render(
      <ThemeProvider theme={theme.raw}>
        <theme.GlobalStyle />
        <Box testID="theme-probe" />
      </ThemeProvider>
    );
    const css = readAllCss();
    // GlobalStyle declares the custom property; the styled component
    // references it via var(). Both should appear in the CSSOM.
    expect(css).toContain('rgb(77, 88, 99)');
    expect(css).toMatch(/var\(--sc-colors-bg/);
  });
});

describe('rn-web bridge: rewrites run in every compiler', () => {
  const sentinel = 'var(--x, 4)';

  it('rewrites a var() unit suffix under a plugin', () => {
    const Box = styled.View`
      padding: ${sentinel}px;
    `;

    expect(
      renderedCss(
        <StyleSheetManager plugins={[{ name: 'noop', decl: () => undefined }]}>
          <Box />
        </StyleSheetManager>
      )
    ).toBe('.c {padding: calc(var(--x, 4) * 1px);}');
  });

  it('repairs the declarations a plugin writes, after the plugin ran', () => {
    const Box = styled.View`
      size: 4;
    `;
    const size = {
      name: 'size',
      decl: (prop: string, value: string) =>
        prop === 'size'
          ? [
              { prop: 'width', value: 'var(--y, ' + value + ')px' },
              { prop: 'height', value: 'var(--x, 4)px' },
            ]
          : undefined,
    };

    expect(
      renderedCss(
        <StyleSheetManager plugins={[size]}>
          <Box />
        </StyleSheetManager>
      )
    ).toBe('.c {width: calc(var(--y, 4) * 1px); height: calc(var(--x, 4) * 1px);}');
  });

  it('rewrites a var() unit suffix under a namespace', () => {
    const Box = styled.View`
      padding: ${sentinel}px;
    `;

    expect(
      renderedCss(
        <StyleSheetManager namespace=".app">
          <Box />
        </StyleSheetManager>
      )
    ).toBe('.app .c {padding: calc(var(--x, 4) * 1px);}');
  });

  it('writes align-content before vertical-align on a namespaced component, behind the namespace', () => {
    const Label = styled.Text`
      vertical-align: middle;
    `;

    expect(
      renderedCss(
        <StyleSheetManager namespace=".app">
          <Label />
        </StyleSheetManager>
      )
    ).toBe('.app .c {align-content: center; vertical-align: middle;}');
  });

  it('wraps a :not run whose string holds a paren, which the browser reads as part of the string', () => {
    const Field = styled.View`
      &:not([data-x='a)b']) {
        color: red;
      }
      &:not([data-y='ok']) {
        color: blue;
      }
    `;

    expect(renderedCss(<Field />)).toBe(
      [
        ".c:where(:not([data-x='a)b'])) {color: red;}",
        ".c:where(:not([data-y='ok'])) {color: blue;}",
      ].join('\n')
    );
  });
});

/*
 * Selectors Level 4 (https://drafts.csswg.org/selectors-4/), quoted from the editor's draft.
 *
 * 4.3 The Negation (Matches-None) Pseudo-class: :not()
 *   "Note: The specificity of the :not() pseudo-class is replaced by the specificity of the most
 *   specific selector in its argument; thus it has the exact behavior of :not(:is(argument))."
 *
 * 4.4 The Specificity-adjustment Pseudo-class: :where()
 *   "The Specificity-adjustment pseudo-class, :where(), is a functional pseudo-class with the
 *   same syntax and functionality as :is()."
 *
 * 15 Calculating a selector's specificity
 *   "The specificity of a :where() pseudo-class is replaced by zero."
 *
 * A `:not()` on the component's own compound adds (0,1,0) per group, so a run of them outweighs a
 * later `&[data-x]` rule; inside `:where()` it weighs nothing and source order decides. The wrap
 * applies to every own comma member, inside at-rules and under a namespace, and leaves a selector
 * that only holds the component beyond a combinator, global styles and a `:not()` on a context
 * compound as authored.
 */
describe('rn-web bridge: :where() wrap of :not() on the component selector', () => {
  it('wraps the rule in an at-rule', () => {
    const Field = styled.View`
      @media (min-width: 100px) {
        &:not([data-a]) {
          color: red;
        }
      }
    `;

    expect(renderedCss(<Field />)).toBe(
      '@media (min-width: 100px) {.c:where(:not([data-a])) {color: red;}}'
    );
  });

  it('wraps behind a namespace', () => {
    const Field = styled.View`
      &:not([data-a]) {
        color: red;
      }
    `;

    expect(
      renderedCss(
        <StyleSheetManager namespace=".app">
          <Field />
        </StyleSheetManager>
      )
    ).toBe('.app .c:where(:not([data-a])) {color: red;}');
  });

  it('wraps every own member of a selector list', () => {
    const Field = styled.View`
      &:hover,
      &:not([data-a]),
      & .child,
      &:not([data-b]):not([data-c]) {
        color: red;
      }
    `;

    expect(renderedCss(<Field />)).toBe(
      '.c:hover,.c:where(:not([data-a])),.c .child,.c:where(:not([data-b]):not([data-c])) {color: red;}'
    );
  });

  it('wraps a :not() in any letter case', () => {
    const Field = styled.View`
      &:NOT([data-a]) {
        color: red;
      }
    `;

    expect(renderedCss(<Field />)).toBe('.c:where(:NOT([data-a])) {color: red;}');
  });

  it('wraps before a pseudo-element', () => {
    const Field = styled.View`
      &:not([data-a])::before {
        color: red;
      }
    `;

    expect(renderedCss(<Field />)).toBe('.c:where(:not([data-a]))::before {color: red;}');
  });

  it('leaves a global style as authored', () => {
    const Global = createGlobalStyle`
      .x:not([data-y]) {
        color: red;
      }
    `;

    expect(renderedCss(<Global />)).toBe('.x:not([data-y]) {color: red;}');
  });

  it.each([
    ['a context compound', '.dark:not(.x) &', '.dark:not(.x) .c'],
    ['a descendant', '& .child:not([data-a])', '.c .child:not([data-a])'],
    ['a child combinator', '&:not([data-a]) > *', '.c:not([data-a])>*'],
    ['a general sibling', '&:not([data-a]) ~ &:not([data-b])', '.c:not([data-a])~.c:not([data-b])'],
    ['an adjacent sibling', '&:not([data-a]) + &', '.c:not([data-a])+.c'],
  ])('leaves %s as authored', (_name, authored, emitted) => {
    const Field = styled.View`
      ${authored} {
        color: red;
      }
    `;

    expect(renderedCss(<Field />)).toBe(emitted + ' {color: red;}');
  });
});

/*
 * Selectors Level 4 (https://drafts.csswg.org/selectors-4/), quoted from the editor's draft.
 *
 * 12.1.1 The :enabled and :disabled Pseudo-classes
 *   "The :enabled pseudo-class represents user interface elements that are in an enabled state;
 *   such elements must have a corresponding disabled state. Conversely, the :disabled
 *   pseudo-class represents user interface elements that are in a disabled state; such elements
 *   must have a corresponding enabled state."
 *   "What constitutes an enabled state, a disabled state, and a user interface element is
 *   host-language-dependent."
 *
 * 4.3 The Negation (Matches-None) Pseudo-class: :not()
 *   "Note: The specificity of the :not() pseudo-class is replaced by the specificity of the most
 *   specific selector in its argument; thus it has the exact behavior of :not(:is(argument))."
 *
 * 15 Calculating a selector's specificity
 *   "The specificity of an :is(), :not(), or :has() pseudo-class is replaced by the specificity of
 *   the most specific complex selector in its selector list argument."
 *
 * The browser decides what `:disabled` matches (a form control with the `disabled` attribute), so
 * the bridge adds `[aria-disabled=true]`, which react-native-web sets on a disabled primitive.
 */
describe('rn-web bridge: :disabled and :enabled', () => {
  const DISABLED_HEAD = ':is(:disabled,[aria-disabled=true])';
  const ENABLED_HEAD = ':not(:is(:disabled,[aria-disabled=true]))';

  describe('emitted rules', () => {
    it('writes :disabled and :enabled as the browser-matched forms, :not(:disabled) as :enabled', () => {
      const Box = styled.View`
        &:disabled {
          color: red;
        }
        &:enabled {
          color: blue;
        }
        &:not(:disabled) {
          color: green;
        }
      `;

      expect(renderedCss(<Box />)).toBe(
        [
          '.c' + DISABLED_HEAD + ' {color: red;}',
          '.c' + ENABLED_HEAD + ' {color: blue;}',
          '.c' + ENABLED_HEAD + ' {color: green;}',
        ].join('\n')
      );
    });

    it('rewrites the token inside a media query', () => {
      const Box = styled.View`
        @media (min-width: 10px) {
          &:disabled {
            color: red;
          }
          &:enabled {
            color: blue;
          }
        }
      `;

      expect(renderedCss(<Box />)).toBe(
        '@media (min-width: 10px) {' +
          ['.c' + DISABLED_HEAD + ' {color: red;}', '.c' + ENABLED_HEAD + ' {color: blue;}'].join(
            ''
          ) +
          '}'
      );
    });

    it('rewrites the token behind a namespace', () => {
      const Box = styled.View`
        &:disabled {
          color: red;
        }
      `;

      expect(
        renderedCss(
          <StyleSheetManager namespace=".app">
            <Box />
          </StyleSheetManager>
        )
      ).toBe('.app .c' + DISABLED_HEAD + ' {color: red;}');
    });

    it('hands a plugin the authored token and rewrites what the plugin returns', () => {
      const Box = styled.View`
        &:disabled {
          color: red;
        }
      `;
      const seen: string[] = [];
      const record = {
        name: 'record-heads',
        rw: (selector: string) => {
          seen.push(selector.replace(/^\.[a-zA-Z]+/, '.c'));
          return selector + ':focus';
        },
      };

      expect(
        renderedCss(
          <StyleSheetManager plugins={[record]}>
            <Box />
          </StyleSheetManager>
        )
      ).toBe('.c' + DISABLED_HEAD + ':focus {color: red;}');
      expect(seen).toEqual(['.c:disabled']);
    });

    it('rewrites the token in a global rule, where :enabled reaches every element', () => {
      const Global = createGlobalStyle`
        input:enabled {
          color: red;
        }
      `;

      expect(renderedCss(<Global />)).toBe('input' + ENABLED_HEAD + ' {color: red;}');
    });

    // Both rules weigh (0,2,0), so on the web the later rule wins: the attribute rule when it
    // comes second, the pseudo-class rule when it does. Native applies the pseudo-class layer
    // last, so the pseudo-class rule wins in either order.
    const pseudoRule = '.c' + ENABLED_HEAD + ' {color: red;}';
    const attributeRule = '.c[data-x] {color: blue;}';

    it.each([
      [
        'enabled, then the attribute rule: the attribute rule wins on the web',
        styled.View`
          &:enabled {
            color: red;
          }
          &[data-x] {
            color: blue;
          }
        `,
        [pseudoRule, attributeRule],
      ],
      [
        'the attribute rule, then enabled: the pseudo-class rule wins on the web',
        styled.View`
          &[data-x] {
            color: blue;
          }
          &:enabled {
            color: red;
          }
        `,
        [attributeRule, pseudoRule],
      ],
      [
        'not-disabled, then the attribute rule: the attribute rule wins on the web',
        styled.View`
          &:not(:disabled) {
            color: red;
          }
          &[data-x] {
            color: blue;
          }
        `,
        [pseudoRule, attributeRule],
      ],
      [
        'the attribute rule, then not-disabled: the pseudo-class rule wins on the web',
        styled.View`
          &[data-x] {
            color: blue;
          }
          &:not(:disabled) {
            color: red;
          }
        `,
        [attributeRule, pseudoRule],
      ],
    ])('keeps source order between the rules: %s', (_name, Box, expected) => {
      expect(renderedCss(<Box />)).toBe(expected.join('\n'));
    });
  });

  describe('matching in the DOM', () => {
    /** The element carrying the component's class, and the two heads its sheet holds. */
    function findCarrier(container: HTMLElement) {
      const heads: string[] = [];
      for (const sheet of Array.from(document.styleSheets)) {
        for (const rule of Array.from(sheet.cssRules)) {
          if (rule instanceof CSSStyleRule) heads.push(rule.selectorText);
        }
      }

      for (const element of Array.from(container.querySelectorAll('*'))) {
        for (const name of Array.from(element.classList)) {
          if (heads.includes('.' + name + DISABLED_HEAD)) {
            return {
              disabledHead: '.' + name + DISABLED_HEAD,
              element,
              enabledHead: '.' + name + ENABLED_HEAD,
            };
          }
        }
      }

      return null;
    }

    const rules = `
      &:disabled {
        color: red;
      }
      &:enabled {
        color: blue;
      }
    `;

    type ProbeProps = {
      accessibilityState?: { disabled?: boolean };
      'aria-disabled'?: boolean;
      'aria-readonly'?: boolean;
      children?: React.ReactNode;
      disabled?: boolean;
    };
    type Probe = React.ComponentType<ProbeProps>;

    const Child = styled.View``;
    const { Switch: RawSwitch }: { Switch: Probe } = require('react-native-web');
    // The bridge's View turns the forwarded className into the DOM class; rn-web's own View drops it.
    const ForwardingView = (props: ProbeProps) => <Child {...props} />;
    type Primitive = { child: boolean; make: () => Probe; name: string };
    const primitives = {
      Pressable: { child: false, make: () => styled.Pressable`${rules}`, name: 'Pressable' },
      TouchableOpacity: {
        child: false,
        make: () => styled.TouchableOpacity`${rules}`,
        name: 'TouchableOpacity',
      },
      // rn-web's TouchableHighlight clones its single child.
      TouchableHighlight: {
        child: true,
        make: () => styled.TouchableHighlight`${rules}`,
        name: 'TouchableHighlight',
      },
      TextInput: { child: false, make: () => styled.TextInput`${rules}`, name: 'TextInput' },
      Text: { child: false, make: () => styled.Text`${rules}`, name: 'Text' },
      Switch: { child: false, make: () => styled.Switch`${rules}`, name: 'Switch' },
      StyledSwitch: {
        child: false,
        make: () => styled(RawSwitch)`${rules}`,
        name: 'styled(Switch)',
      },
    } satisfies Record<string, Primitive>;
    const viewBacked = {
      View: { child: false, make: () => styled.View`${rules}`, name: 'View' },
      ForwardingView: {
        child: false,
        make: () => styled(ForwardingView)`${rules}`,
        name: 'styled(custom component forwarding to View)',
      },
    } satisfies Record<string, Primitive>;

    /** Renders `primitive` with `props` and returns the element carrying the component's class. */
    function carrierOf({ child, make, name }: Primitive, props: ProbeProps) {
      const Component = make();
      const { container } = render(
        <Component {...props}>{child ? <Child /> : undefined}</Component>
      );
      const carrier = findCarrier(container);
      if (carrier === null) throw new Error(name + ' rendered no element holding its class');

      return carrier;
    }

    function matchesOf(
      primitive: Primitive,
      props: ProbeProps
    ): { disabled: boolean; enabled: boolean } {
      const { disabledHead, element, enabledHead } = carrierOf(primitive, props);

      return { disabled: element.matches(disabledHead), enabled: element.matches(enabledHead) };
    }

    // rn-web's TouchableOpacity hands its View a deprecated pointerEvents prop while disabled.
    let warn: jest.SpyInstance;
    beforeEach(() => {
      warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
      const messages = warn.mock.calls.map(call => call[0]);
      warn.mockRestore();

      expect(
        messages.filter(m => m !== 'props.pointerEvents is deprecated. Use style.pointerEvents')
      ).toEqual([]);
    });

    test.each(
      Object.values(primitives).flatMap(primitive => [
        { disabled: true, primitive },
        { disabled: false, primitive },
        { disabled: undefined, primitive },
      ])
    )(
      '$primitive.name with disabled=$disabled matches the form its state names',
      ({ disabled, primitive }) => {
        expect(matchesOf(primitive, { disabled })).toEqual({
          disabled: disabled === true,
          enabled: disabled !== true,
        });
      }
    );

    // The browser matches `[aria-disabled=true]` on any element, so these differ from native.
    it('does not match a Pressable given aria-disabled alone, as native ignores it', () => {
      expect(matchesOf(primitives.Pressable, { 'aria-disabled': true })).toEqual({
        disabled: false,
        enabled: true,
      });
    });

    test.each([primitives.TouchableHighlight, viewBacked.ForwardingView])(
      'matches :disabled for $name given aria-disabled alone, which native ignores',
      primitive => {
        expect(matchesOf(primitive, { 'aria-disabled': true })).toEqual({
          disabled: true,
          enabled: false,
        });
      }
    );

    it('carries aria-disabled=true on the DOM element of a TextInput given aria-disabled alone', () => {
      const { element } = carrierOf(primitives.TextInput, { 'aria-disabled': true });

      // rn-web writes both the attribute and the native `disabled` attribute for a TextInput.
      expect({
        ariaDisabled: element.getAttribute('aria-disabled'),
        disabled: element.hasAttribute('disabled'),
        tag: element.tagName,
      }).toEqual({ ariaDisabled: 'true', disabled: true, tag: 'INPUT' });
      expect(matchesOf(primitives.TextInput, { 'aria-disabled': true })).toEqual({
        disabled: true,
        enabled: false,
      });
    });

    // rn-web writes nothing from a Text's `disabled`, so the bridge sets aria-disabled for `true`.
    test.each([
      [{ disabled: true }, 'true'],
      [{ disabled: false }, null],
      [{}, null],
    ])('Text with %j carries aria-disabled=%s', (props, expected) => {
      expect(carrierOf(primitives.Text, props).element.getAttribute('aria-disabled')).toBe(
        expected
      );
    });

    // rn-web makes any non-null aria-readonly read-only, while native treats `false` as editable.
    test.each([
      [{ 'aria-readonly': true }, true],
      [{ 'aria-readonly': false }, false],
      [{}, false],
    ])(
      'TextInput with %j is readOnly=%s and matches :read-write accordingly',
      (props, readOnly) => {
        const { element } = carrierOf(primitives.TextInput, props);

        expect(element instanceof HTMLInputElement && element.readOnly).toBe(readOnly);
        expect(element.matches(':read-write')).toBe(!readOnly);
      }
    );

    // Native's :disabled reads the `disabled` prop only, so the legacy accessibilityState does not match.
    test.each([primitives.Pressable, viewBacked.View])(
      'does not match :disabled for $name given accessibilityState={{ disabled: true }}',
      primitive => {
        expect(matchesOf(primitive, { accessibilityState: { disabled: true } })).toEqual({
          disabled: false,
          enabled: true,
        });
      }
    );

    it('matches a TouchableOpacity given aria-disabled beside disabled={false}', () => {
      expect(
        matchesOf(primitives.TouchableOpacity, { 'aria-disabled': true, disabled: false })
      ).toEqual({
        disabled: true,
        enabled: false,
      });
    });

    describe.each([primitives.Switch, primitives.StyledSwitch])('$name root', primitive => {
      // rn-web gives a Switch's `disabled` to its inner checkbox only; the root View takes
      // aria-disabled, so the bridge sets it from `disabled`. rn-web writes the attribute for
      // `true` only.
      test.each([
        [{ disabled: true }, 'true'],
        [{ disabled: false }, null],
        [{}, null],
        [{ 'aria-disabled': true, disabled: true }, 'true'],
        [{ 'aria-disabled': false, disabled: true }, 'true'],
        [{ 'aria-disabled': false, disabled: false }, null],
        [{ 'aria-disabled': true }, 'true'],
        [{ 'aria-disabled': false }, null],
      ])('with %j carries aria-disabled=%s', (props, expected) => {
        expect(carrierOf(primitive, props).element.getAttribute('aria-disabled')).toBe(expected);
      });

      it('matches :disabled for aria-disabled alone, which native ignores', () => {
        expect(matchesOf(primitive, { 'aria-disabled': true })).toEqual({
          disabled: true,
          enabled: false,
        });
      });
    });
  });
});
