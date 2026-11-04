import React from 'react';
import { renderToString } from 'react-dom/server';
import { act, render } from '@testing-library/react';
import keyframes from '../../constructors/keyframes';
import { resetStyled, getCSS } from '../../test/utils';
import StyleSheet from '../../sheet/Sheet';
import ServerStyleSheet from '../ServerStyleSheet';

let styled: ReturnType<typeof resetStyled>;

describe('buffered style injection (useInsertionEffect)', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  it('still produces the class name on the render path', () => {
    const Box = styled.div`
      color: red;
    `;
    const { container } = render(<Box />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toMatch(/sc-/);
    expect(el.className.split(' ').length).toBeGreaterThanOrEqual(2);
  });

  it('applies the emitted CSS after the insertion effect commits', () => {
    const Box = styled.div`
      color: rgb(1, 2, 3);
    `;
    render(<Box />);
    expect(getCSS(document)).toContain('rgb(1, 2, 3)');
  });

  it('applies styles for blocking updates without startTransition', () => {
    // Concurrent features off: a plain setState commit must still inject
    // before paint via useInsertionEffect.
    const Box = styled.div<{ $c: string }>`
      color: ${p => p.$c};
    `;
    const { rerender } = render(<Box $c="rgb(2, 2, 2)" />);
    expect(getCSS(document)).toContain('rgb(2, 2, 2)');
    rerender(<Box $c="rgb(3, 3, 3)" />);
    expect(getCSS(document)).toContain('rgb(3, 3, 3)');
  });

  it('ServerStyleSheet SSR still flushes synchronously (no insertion effects)', () => {
    // renderToString never runs useInsertionEffect; styles must land during
    // render when styleSheet.server is set.
    const sheet = new ServerStyleSheet();
    const Box = styled.div`
      color: rgb(12, 12, 12);
    `;
    try {
      renderToString(sheet.collectStyles(<Box />));
      expect(sheet.getStyleTags()).toContain('rgb(12, 12, 12)');
    } finally {
      sheet.seal();
    }
  });

  it('injects via an insertion effect, not synchronously during render', () => {
    // Probe inside the render body, after the styled component has rendered:
    // if the rule is already in the CSSOM at that point, the flush was
    // synchronous; the buffered path must still have an empty sheet here.
    let duringRenderCss = '';
    const Probe = () => {
      duringRenderCss = getCSS(document) || '';
      return null;
    };

    const Box = styled.div`
      color: rgb(9, 9, 9);
    `;

    render(
      <React.Fragment>
        <Box />
        <Probe />
      </React.Fragment>
    );

    expect(duringRenderCss).not.toContain('rgb(9, 9, 9)');
    expect(getCSS(document)).toContain('rgb(9, 9, 9)');
  });

  it('does not inject for a render that is discarded before commit', () => {
    class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    }

    const Box = styled.div`
      color: rgb(11, 11, 11);
    `;
    const Thrower = () => {
      throw new Error('boom');
    };
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <Boundary>
          <Box />
          <Thrower />
        </Boundary>
      );
      expect(getCSS(document)).not.toContain('rgb(11, 11, 11)');
    } finally {
      errSpy.mockRestore();
    }
  });

  it('injects keyframes before the component rule that references them', () => {
    const pulse = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `;
    const Box = styled.div`
      animation: ${pulse} 2s linear infinite;
      color: blue;
    `;
    render(<Box />);

    const css = getCSS(document);
    expect(css).toContain('@keyframes');
    expect(css).toContain('animation:');
    expect(css.indexOf('@keyframes')).toBeLessThan(css.indexOf('animation:'));
  });

  it('dedupes same-class siblings within one commit', () => {
    // All instances generate before any effect runs. Provisional name claims
    // make only the first compile; inject-time hasNameForId still guards
    // against duplicate CSSOM writes.
    const insertRuleSpy = jest.spyOn(CSSStyleSheet.prototype, 'insertRule');

    try {
      const Box = styled.div`
        color: rgb(4, 4, 4);
      `;
      render(
        <React.Fragment>
          <Box />
          <Box />
          <Box />
        </React.Fragment>
      );

      const forOurRule = insertRuleSpy.mock.calls.filter(([rule]) =>
        String(rule).includes('rgb(4, 4, 4)')
      );
      expect(forOurRule).toHaveLength(1);
    } finally {
      insertRuleSpy.mockRestore();
    }
  });

  it('claims a shared class only once among same-class siblings', () => {
    const Box = styled.div`
      color: rgb(6, 6, 6);
    `;
    const claimSpy = jest.spyOn(StyleSheet.prototype, 'claimNameForId');
    try {
      render(
        <React.Fragment>
          <Box />
          <Box />
          <Box />
        </React.Fragment>
      );
      expect(claimSpy.mock.results.filter(r => r.value === true)).toHaveLength(1);
      expect(claimSpy.mock.results.filter(r => r.value === false)).toHaveLength(2);
    } finally {
      claimSpy.mockRestore();
    }
  });

  it('still writes once when every same-class sibling schedules an insertion effect', () => {
    // Followers carry the winner's rules so a discarded claimer cannot leave
    // a committed sibling with an empty payload. Sheet registration still
    // dedupes the CSSOM write.
    const insertRuleSpy = jest.spyOn(CSSStyleSheet.prototype, 'insertRule');
    try {
      const Box = styled.div`
        color: rgb(7, 7, 7);
      `;
      render(
        <React.Fragment>
          <Box />
          <Box />
          <Box />
        </React.Fragment>
      );
      const forOurRule = insertRuleSpy.mock.calls.filter(([rule]) =>
        String(rule).includes('rgb(7, 7, 7)')
      );
      expect(forOurRule).toHaveLength(1);
      expect(getCSS(document)).toContain('rgb(7, 7, 7)');
    } finally {
      insertRuleSpy.mockRestore();
    }
  });

  it('injects when the claimer is discarded and a same-class sibling commits', () => {
    class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    }

    const Box = styled.div`
      color: rgb(8, 8, 8);
    `;
    const Thrower = () => {
      throw new Error('boom');
    };
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <React.Fragment>
          <Boundary>
            <Box />
            <Thrower />
          </Boundary>
          <Box />
        </React.Fragment>
      );
      expect(getCSS(document)).toContain('rgb(8, 8, 8)');
    } finally {
      errSpy.mockRestore();
    }
  });

  it('injects after a discarded concurrent attempt whose className was already claimed', async () => {
    // A transition update that suspends mid-tree claims the new class name on
    // the sheet but never runs its insertion effect, so the rules go unwritten.
    // The retry re-generates, detects the claimed-but-unwritten name, and writes
    // the rules that attempt never committed.
    let resolve: (() => void) | undefined;
    const promise = new Promise<void>(r => {
      resolve = r;
    });
    let shouldSuspend = false;

    const Box = styled.div<{ $c: string }>`
      color: ${p => p.$c};
    `;

    function Suspender() {
      if (shouldSuspend) throw promise;
      return null;
    }

    function App({ color }: { color: string }) {
      return (
        <React.Suspense fallback={null}>
          <Box $c={color} />
          <Suspender />
        </React.Suspense>
      );
    }

    const { rerender } = render(<App color="rgb(1, 1, 1)" />);
    expect(getCSS(document)).toContain('rgb(1, 1, 1)');

    shouldSuspend = true;
    React.startTransition(() => {
      rerender(<App color="rgb(14, 14, 14)" />);
    });

    // Discarded attempt generated the new class; sheet must not have it yet.
    expect(getCSS(document)).not.toContain('rgb(14, 14, 14)');

    shouldSuspend = false;
    await act(async () => {
      resolve!();
    });

    expect(getCSS(document)).toContain('rgb(14, 14, 14)');
  });

  it('dedupes a later commit whose class was already written', () => {
    const insertRuleSpy = jest.spyOn(CSSStyleSheet.prototype, 'insertRule');

    try {
      const Box = styled.div<{ $n?: number }>`
        color: rgb(5, 5, ${props => props.$n ?? 5});
      `;
      const { rerender } = render(<Box $n={5} />);
      rerender(<Box $n={5} />);

      const forOurRule = insertRuleSpy.mock.calls.filter(([rule]) =>
        String(rule).includes('rgb(5, 5, 5)')
      );
      expect(forOurRule).toHaveLength(1);
    } finally {
      insertRuleSpy.mockRestore();
    }
  });

  it('writes base rules when a discarded claimer held the base of an inheritance chain', () => {
    // Base wins the claim inside a throwing boundary; the extension outside
    // commits. inject walks every level, so the extension's StyleInjector
    // writes the base bytes it carried as a follower.
    class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
      state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    }

    const Base = styled.div`
      color: rgb(20, 20, 20);
    `;
    const Extended = styled(Base)`
      font-weight: 700;
    `;
    const Thrower = () => {
      throw new Error('boom');
    };
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <React.Fragment>
          <Boundary>
            <Base />
            <Thrower />
          </Boundary>
          <Extended />
        </React.Fragment>
      );
      const css = getCSS(document);
      expect(css).toContain('rgb(20, 20, 20)');
      expect(css).toMatch(/font-weight:\s*700/);
    } finally {
      errSpy.mockRestore();
    }
  });

  it('jsdom renderToString without ServerStyleSheet writes no CSS and warns', () => {
    // jsdom makes IS_BROWSER true, so the default sheet has server=false and
    // the buffered path schedules useInsertionEffect. renderToString never
    // runs those effects, so styles are silent without collectStyles.
    const { resetWarnOnce } = require('../../utils/warnOnce');
    resetWarnOnce();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const Box = styled.div`
        color: rgb(21, 21, 21);
      `;
      renderToString(<Box />);
      expect(getCSS(document)).not.toContain('rgb(21, 21, 21)');
      expect(warnSpy.mock.calls.some(args => String(args[0]).includes('ServerStyleSheet'))).toBe(
        true
      );
    } finally {
      warnSpy.mockRestore();
      resetWarnOnce();
    }
  });

  it('createRoot mount does not warn about ServerStyleSheet', () => {
    const { resetWarnOnce } = require('../../utils/warnOnce');
    resetWarnOnce();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const Box = styled.div`
        color: rgb(22, 22, 22);
      `;
      render(<Box />);
      expect(getCSS(document)).toContain('rgb(22, 22, 22)');
      expect(warnSpy.mock.calls.some(args => String(args[0]).includes('ServerStyleSheet'))).toBe(
        false
      );
    } finally {
      warnSpy.mockRestore();
      resetWarnOnce();
    }
  });
});
