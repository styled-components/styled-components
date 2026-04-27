import { render } from '@testing-library/react';
import React from 'react';
import createGlobalStyle from '../constructors/createGlobalStyle';
import keyframes from '../constructors/keyframes';
import { StyleSheetManager } from '../models/StyleSheetManager';
import { getCSS, getRenderedCSS, resetStyled } from './utils';

let styled: ReturnType<typeof resetStyled>;

/**
 * Helper: find position of a substring in beautified CSS output.
 * getRenderedCSS() beautifies (e.g. "color: red" not "color:red"),
 * so we search using the beautified form.
 */
const posIn = (css: string, needle: string) => {
  const pos = css.indexOf(needle);
  if (pos === -1) throw new Error(`"${needle}" not found in CSS:\n${css}`);
  return pos;
};

describe('CSS injection ordering', () => {
  beforeEach(() => {
    styled = resetStyled();
  });

  describe('global styles before component styles', () => {
    it('should inject global styles before component styles when global is defined first', () => {
      const GlobalStyle = createGlobalStyle`body { background: papayawhip; }`;
      const Heading = styled.h1`
        color: red;
      `;

      render(
        <>
          <GlobalStyle />
          <Heading>Hello</Heading>
        </>
      );

      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        "body {
          background: papayawhip;
        }
        .a {
          color: red;
        }"
      `);
    });

    it('should follow definition order: component defined first appears before global defined second', () => {
      // Group IDs are allocated at definition time (styled() or createGlobalStyle()).
      // Whichever is defined first gets the lower group ID and appears first in CSS.
      const Heading = styled.h1`
        color: red;
      `;
      const GlobalStyle = createGlobalStyle`body { background: papayawhip; }`;

      render(
        <>
          <Heading>Hello</Heading>
          <GlobalStyle />
        </>
      );

      const css = getRenderedCSS();
      // Heading was defined first → lower group → appears first
      expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'background: papayawhip'));
    });

    it('should inject multiple globals and components in definition order', () => {
      const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
      const GlobalB = createGlobalStyle`body { margin: 0; }`;
      const Comp = styled.div`
        color: blue;
      `;

      // Render in reverse order — CSS should still follow definition order
      render(
        <>
          <Comp />
          <GlobalB />
          <GlobalA />
        </>
      );

      const css = getRenderedCSS();
      expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'margin: 0'));
      expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));
    });
  });

  describe('keyframes ordering relative to components', () => {
    it('should inject keyframes before the component when keyframes is defined first', () => {
      // Keyframes eagerly register their group ID at construction time,
      // so keyframes defined before a component get a lower group ID.
      const fadeIn = keyframes`
        from { opacity: 0; }
        to { opacity: 1; }
      `;

      const FadingDiv = styled.div`
        animation: ${fadeIn} 1s ease-in;
      `;

      render(<FadingDiv />);

      const css = getRenderedCSS();
      expect(css).toMatchInlineSnapshot(`
        "@keyframes bdINEB {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .a {
          animation: bdINEB 1s ease-in;
        }"
      `);
      expect(posIn(css, '@keyframes')).toBeLessThan(posIn(css, 'animation:'));
    });

    it('should deduplicate keyframes when multiple components use the same animation', () => {
      const slideIn = keyframes`
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      `;

      const CompA = styled.div`
        animation: ${slideIn} 0.3s;
      `;
      const CompB = styled.span`
        animation: ${slideIn} 0.5s;
      `;

      render(
        <>
          <CompA />
          <CompB />
        </>
      );

      const css = getRenderedCSS();
      const firstKF = css.indexOf('@keyframes');
      expect(firstKF).toBeGreaterThanOrEqual(0);
      // Only one @keyframes block (deduplication via hasNameForId)
      expect(css.indexOf('@keyframes', firstKF + 1)).toBe(-1);
    });

    it('should inject multiple different keyframes in encounter order', () => {
      const fadeIn = keyframes`
        from { opacity: 0; }
        to { opacity: 1; }
      `;
      const fadeOut = keyframes`
        from { opacity: 1; }
        to { opacity: 0; }
      `;

      const Comp = styled.div`
        animation:
          ${fadeIn} 1s,
          ${fadeOut} 1s 1s;
      `;

      render(<Comp />);

      const css = getRenderedCSS();
      const allKF = [...css.matchAll(/@keyframes\s+(\S+)\s*\{/g)];
      expect(allKF.length).toBe(2);
      // Both keyframes are defined before the component, so they appear first
      expect(allKF[0].index!).toBeLessThan(posIn(css, 'animation:'));
      expect(allKF[1].index!).toBeLessThan(posIn(css, 'animation:'));
    });
  });

  describe('re-insertion ordering after unmount/remount', () => {
    it('should preserve CSS rules when a styled component unmounts (rules persist)', () => {
      // Styled components do NOT remove their CSS rules on unmount.
      // The class name just stops being applied to the DOM element.
      const First = styled.div`
        color: red;
      `;
      const Second = styled.div`
        color: blue;
      `;
      const Third = styled.div`
        color: green;
      `;

      function App({ showSecond }: { showSecond: boolean }) {
        return (
          <>
            <First />
            {showSecond && <Second />}
            <Third />
          </>
        );
      }

      const { rerender } = render(<App showSecond={true} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: red;
        }
        .b {
          color: blue;
        }
        .c {
          color: green;
        }"
      `);

      // Unmount Second — its CSS rules remain in the sheet
      rerender(<App showSecond={false} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: red;
        }
        .b {
          color: blue;
        }
        .c {
          color: green;
        }"
      `);

      // Remount Second — order is preserved since rules never left
      rerender(<App showSecond={true} />);
      const css = getRenderedCSS();
      expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'color: blue'));
      expect(posIn(css, 'color: blue')).toBeLessThan(posIn(css, 'color: green'));
    });

    it('should re-inject global styles at their original group position after unmount/remount', () => {
      // All instances share one group registered at definition time.
      // On remount, a new instance inserts into the same shared group,
      // which retains its original position in the stylesheet.
      const GlobalStyle = createGlobalStyle`body { background: coral; }`;
      const Comp = styled.div`
        color: navy;
      `;

      function App({ showGlobal }: { showGlobal: boolean }) {
        return (
          <>
            {showGlobal && <GlobalStyle />}
            <Comp />
          </>
        );
      }

      // First mount — shared group was pre-registered → appears before Comp
      const { rerender } = render(<App showGlobal={true} />);
      let css = getRenderedCSS();
      expect(posIn(css, 'background: coral')).toBeLessThan(posIn(css, 'color: navy'));

      // Unmount global style — its CSS is removed
      rerender(<App showGlobal={false} />);
      expect(getRenderedCSS()).toMatchInlineSnapshot(`
        ".a {
          color: navy;
        }"
      `);

      // Remount — new instance inserts into same shared group → still before Comp
      rerender(<App showGlobal={true} />);
      css = getRenderedCSS();
      expect(css).toMatchInlineSnapshot(`
        "body {
          background: coral;
        }
        .a {
          color: navy;
        }"
      `);
      expect(posIn(css, 'background: coral')).toBeLessThan(posIn(css, 'color: navy'));
    });

    it('should preserve styled(Base) inheritance order after Base unmounts and remounts', () => {
      const Base = styled.div`
        color: red;
      `;
      const Extended = styled(Base)`
        color: blue;
      `;

      function App({ showBase }: { showBase: boolean }) {
        return (
          <>
            {showBase && <Base />}
            <Extended />
          </>
        );
      }

      const { rerender } = render(<App showBase={true} />);
      let css = getRenderedCSS();
      // Base defined first → lower group → appears first
      expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'color: blue'));

      // Unmount and remount Base — styled component rules persist, order preserved
      rerender(<App showBase={false} />);
      rerender(<App showBase={true} />);

      css = getRenderedCSS();
      expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'color: blue'));
    });
  });

  describe('multiple StyleSheetManager targets', () => {
    it('should maintain definition ordering within a custom target', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const First = styled.div`
        color: red;
      `;
      const Second = styled.div`
        color: blue;
      `;
      const Third = styled.div`
        color: green;
      `;

      // Render in reverse order
      render(
        <StyleSheetManager target={target}>
          <>
            <Third />
            <Second />
          </>
        </StyleSheetManager>
      );

      const css = getCSS(target);
      const bluePos = css.indexOf('color:blue');
      const greenPos = css.indexOf('color:green');
      expect(bluePos).toBeGreaterThanOrEqual(0);
      expect(greenPos).toBeGreaterThanOrEqual(0);
      expect(bluePos).toBeLessThan(greenPos);

      document.body.removeChild(target);
    });

    it('should maintain global-before-component ordering within a custom target when global is defined first', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const GlobalStyle = createGlobalStyle`body { margin: 0; }`;
      const Comp = styled.div`
        color: red;
      `;

      render(
        <StyleSheetManager target={target}>
          <>
            <Comp />
            <GlobalStyle />
          </>
        </StyleSheetManager>
      );

      const css = getCSS(target);
      const globalPos = css.indexOf('margin:0');
      const compPos = css.indexOf('color:red');
      expect(globalPos).toBeGreaterThanOrEqual(0);
      expect(compPos).toBeGreaterThanOrEqual(0);
      expect(globalPos).toBeLessThan(compPos);

      document.body.removeChild(target);
    });

    it('should maintain base-before-extended ordering within a custom target', () => {
      const target = document.createElement('div');
      document.body.appendChild(target);

      const Base = styled.div`
        color: red;
      `;
      const Extended = styled(Base)`
        color: blue;
      `;

      render(
        <StyleSheetManager target={target}>
          <Extended />
        </StyleSheetManager>
      );

      const source = getCSS(target);
      const redPos = source.indexOf('color:red');
      const bluePos = source.indexOf('color:blue');
      expect(redPos).toBeGreaterThanOrEqual(0);
      expect(bluePos).toBeGreaterThanOrEqual(0);
      expect(redPos).toBeLessThan(bluePos);

      document.body.removeChild(target);
    });
  });

  describe('global style multi-instance ordering', () => {
    it('should place all global instances in the same group before later-defined components', () => {
      // All instances share a single group registered at definition time.
      // Since GlobalStyle is defined before Comp, all instances appear before Comp.
      const GlobalStyle = createGlobalStyle`body { background: teal; }`;
      const Comp = styled.div`
        color: white;
      `;

      render(
        <>
          <GlobalStyle />
          <GlobalStyle />
          <Comp />
        </>
      );

      const css = getRenderedCSS();
      const firstGlobal = posIn(css, 'background: teal');
      const compStyle = posIn(css, 'color: white');
      const secondGlobal = css.indexOf('background: teal', firstGlobal + 1);

      // Both instances appear before the component
      expect(firstGlobal).toBeLessThan(compStyle);
      expect(secondGlobal).toBeLessThan(compStyle);
    });

    it('should maintain ordering after later instances unmount', () => {
      const GlobalStyle = createGlobalStyle`body { background: teal; }`;
      const Comp = styled.div`
        color: white;
      `;

      function App({ count }: { count: number }) {
        return (
          <>
            {Array.from({ length: count }, (_, i) => (
              <GlobalStyle key={i} />
            ))}
            <Comp />
          </>
        );
      }

      const { rerender } = render(<App count={3} />);
      let css = getRenderedCSS();
      // All instances should be before component
      const compPos = posIn(css, 'color: white');
      const firstGlobal = posIn(css, 'background: teal');
      expect(firstGlobal).toBeLessThan(compPos);

      // Remove two instances (keys 1 and 2 unmount, key 0 stays)
      rerender(<App count={1} />);
      css = getRenderedCSS();
      expect(css).toMatchInlineSnapshot(`
        "body {
          background: teal;
        }
        .a {
          color: white;
        }"
      `);
      // Surviving instance still before component
      expect(posIn(css, 'background: teal')).toBeLessThan(posIn(css, 'color: white'));

      // Remove all
      rerender(<App count={0} />);
      css = getRenderedCSS();
      expect(css).toMatchInlineSnapshot(`
        ".a {
          color: white;
        }"
      `);
    });

    it('should maintain ordering with dynamic props across instances', () => {
      const GlobalStyle = createGlobalStyle<{ bg: string }>`
        body { background: ${props => props.bg}; }
      `;
      const Comp = styled.div`
        color: navy;
      `;

      function App({ showSecond }: { showSecond: boolean }) {
        return (
          <>
            <GlobalStyle bg="red" />
            {showSecond && <GlobalStyle bg="blue" />}
            <Comp />
          </>
        );
      }

      const { rerender } = render(<App showSecond={true} />);
      let css = getRenderedCSS();
      // Both instances (shared group, defined before Comp) before component
      expect(posIn(css, 'background: red')).toBeLessThan(posIn(css, 'color: navy'));

      // Remove second instance — first's styles must survive in correct position
      rerender(<App showSecond={false} />);
      css = getRenderedCSS();
      expect(css).toMatchInlineSnapshot(`
        "body {
          background: red;
        }
        .a {
          color: navy;
        }"
      `);
      expect(posIn(css, 'background: red')).toBeLessThan(posIn(css, 'color: navy'));
    });
  });

  describe('mount/unmount sequence permutations', () => {
    describe('definition order permutations', () => {
      it('should follow definition order A→B→C when rendered as C→A→B', () => {
        const A = styled.div`
          color: red;
        `;
        const B = styled.div`
          color: green;
        `;
        const C = styled.div`
          color: blue;
        `;

        render(
          <>
            <C />
            <A />
            <B />
          </>
        );

        const css = getRenderedCSS();
        expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'color: green'));
        expect(posIn(css, 'color: green')).toBeLessThan(posIn(css, 'color: blue'));
      });

      it('should follow definition order A→B→C when rendered as B→C→A', () => {
        const A = styled.div`
          color: red;
        `;
        const B = styled.div`
          color: green;
        `;
        const C = styled.div`
          color: blue;
        `;

        render(
          <>
            <B />
            <C />
            <A />
          </>
        );

        const css = getRenderedCSS();
        expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'color: green'));
        expect(posIn(css, 'color: green')).toBeLessThan(posIn(css, 'color: blue'));
      });
    });

    describe('global style mount/unmount sequence permutations', () => {
      it('should preserve GlobalB and Comp order after unmounting GlobalA', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;
        const Comp = styled.div`
          color: blue;
        `;

        function App({ showA }: { showA: boolean }) {
          return (
            <>
              {showA && <GlobalA />}
              <GlobalB />
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App showA={true} />);
        let css = getRenderedCSS();
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'margin: 0'));
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));

        rerender(<App showA={false} />);
        css = getRenderedCSS();
        expect(css).toMatchInlineSnapshot(`
          "body {
            margin: 0;
          }
          .a {
            color: blue;
          }"
        `);
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));
      });

      it('should preserve GlobalA and Comp order after unmounting GlobalB', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;
        const Comp = styled.div`
          color: blue;
        `;

        function App({ showB }: { showB: boolean }) {
          return (
            <>
              <GlobalA />
              {showB && <GlobalB />}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App showB={true} />);
        let css = getRenderedCSS();
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'margin: 0'));
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));

        rerender(<App showB={false} />);
        css = getRenderedCSS();
        expect(css).toMatchInlineSnapshot(`
          "html {
            font-size: 16px;
          }
          .a {
            color: blue;
          }"
        `);
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'color: blue'));
      });

      it('should preserve Comp after unmounting both globals', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;
        const Comp = styled.div`
          color: blue;
        `;

        function App({ showGlobals }: { showGlobals: boolean }) {
          return (
            <>
              {showGlobals && <GlobalA />}
              {showGlobals && <GlobalB />}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App showGlobals={true} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "html {
            font-size: 16px;
          }
          body {
            margin: 0;
          }
          .a {
            color: blue;
          }"
        `);

        rerender(<App showGlobals={false} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".a {
            color: blue;
          }"
        `);
      });

      it('should maintain definition order when GlobalB is added after initial mount', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const Comp = styled.div`
          color: blue;
        `;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;

        function App({ showB }: { showB: boolean }) {
          return (
            <>
              <GlobalA />
              <Comp />
              {showB && <GlobalB />}
            </>
          );
        }

        // Initially mount GlobalA + Comp only
        const { rerender } = render(<App showB={false} />);
        let css = getRenderedCSS();
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'color: blue'));

        // Now add GlobalB — definition order is GlobalA, Comp, GlobalB
        rerender(<App showB={true} />);
        css = getRenderedCSS();
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'color: blue'));
        expect(posIn(css, 'color: blue')).toBeLessThan(posIn(css, 'margin: 0'));
      });
    });

    describe('multi-instance global style unmount permutations', () => {
      it('should handle unmount order 2→1→0 correctly', () => {
        const GlobalStyle = createGlobalStyle<{ idx: number }>`
          body { --idx: ${props => props.idx}; }
        `;
        const Comp = styled.div`
          color: red;
        `;

        function App({ keys }: { keys: number[] }) {
          return (
            <>
              {keys.map(k => (
                <GlobalStyle key={k} idx={k} />
              ))}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App keys={[0, 1, 2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 0;
          }
          body {
            --idx: 1;
          }
          body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=2
        rerender(<App keys={[0, 1]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 0;
          }
          body {
            --idx: 1;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=1
        rerender(<App keys={[0]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 0;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=0
        rerender(<App keys={[]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".a {
            color: red;
          }"
        `);
      });

      it('should handle unmount order 0→1→2 correctly', () => {
        const GlobalStyle = createGlobalStyle<{ idx: number }>`
          body { --idx: ${props => props.idx}; }
        `;
        const Comp = styled.div`
          color: red;
        `;

        function App({ keys }: { keys: number[] }) {
          return (
            <>
              {keys.map(k => (
                <GlobalStyle key={k} idx={k} />
              ))}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App keys={[0, 1, 2]} />);

        // Unmount key=0
        rerender(<App keys={[1, 2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 1;
          }
          body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=1
        rerender(<App keys={[2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=2
        rerender(<App keys={[]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".a {
            color: red;
          }"
        `);
      });

      it('should handle unmount order 1→0→2 correctly', () => {
        const GlobalStyle = createGlobalStyle<{ idx: number }>`
          body { --idx: ${props => props.idx}; }
        `;
        const Comp = styled.div`
          color: red;
        `;

        function App({ keys }: { keys: number[] }) {
          return (
            <>
              {keys.map(k => (
                <GlobalStyle key={k} idx={k} />
              ))}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App keys={[0, 1, 2]} />);

        // Unmount key=1
        rerender(<App keys={[0, 2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 0;
          }
          body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=0
        rerender(<App keys={[2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Unmount key=2
        rerender(<App keys={[]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          ".a {
            color: red;
          }"
        `);
      });

      it('should place remounted instance in the shared group after unmounting middle instance', () => {
        const GlobalStyle = createGlobalStyle<{ idx: number }>`
          body { --idx: ${props => props.idx}; }
        `;
        const Comp = styled.div`
          color: red;
        `;

        function App({ keys }: { keys: number[] }) {
          return (
            <>
              {keys.map(k => (
                <GlobalStyle key={k} idx={k} />
              ))}
              <Comp />
            </>
          );
        }

        const { rerender } = render(<App keys={[0, 1, 2]} />);

        // Unmount middle (key=1)
        rerender(<App keys={[0, 2]} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "body {
            --idx: 0;
          }
          body {
            --idx: 2;
          }
          .a {
            color: red;
          }"
        `);

        // Remount a new instance (key=3) — should appear in the shared group, before Comp
        rerender(<App keys={[0, 2, 3]} />);
        const css = getRenderedCSS();
        // All global instances should be before the component
        expect(posIn(css, '--idx: 0')).toBeLessThan(posIn(css, 'color: red'));
        expect(posIn(css, '--idx: 2')).toBeLessThan(posIn(css, 'color: red'));
        expect(posIn(css, '--idx: 3')).toBeLessThan(posIn(css, 'color: red'));
      });
    });

    describe('interleaved global + component mount/unmount', () => {
      it('should maintain definition order when mounting in non-definition order', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const CompA = styled.div`
          color: red;
        `;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;
        const CompB = styled.div`
          color: blue;
        `;

        // Mount GlobalB + CompA first, then add GlobalA + CompB
        function App({ showAll }: { showAll: boolean }) {
          return (
            <>
              {showAll && <GlobalA />}
              <CompA />
              <GlobalB />
              {showAll && <CompB />}
            </>
          );
        }

        const { rerender } = render(<App showAll={false} />);
        let css = getRenderedCSS();
        // CompA defined before GlobalB → CompA appears first (definition order)
        expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'margin: 0'));

        // Now add GlobalA and CompB
        rerender(<App showAll={true} />);
        css = getRenderedCSS();
        // Definition order: GlobalA → CompA → GlobalB → CompB
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'color: red'));
        expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'margin: 0'));
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));
      });

      it('should keep GlobalB before CompB after unmounting GlobalA', () => {
        const GlobalA = createGlobalStyle`html { font-size: 16px; }`;
        const CompA = styled.div`
          color: red;
        `;
        const GlobalB = createGlobalStyle`body { margin: 0; }`;
        const CompB = styled.div`
          color: blue;
        `;

        function App({ showA }: { showA: boolean }) {
          return (
            <>
              {showA && <GlobalA />}
              <CompA />
              <GlobalB />
              <CompB />
            </>
          );
        }

        const { rerender } = render(<App showA={true} />);
        let css = getRenderedCSS();
        expect(posIn(css, 'font-size: 16px')).toBeLessThan(posIn(css, 'color: red'));

        // Unmount GlobalA
        rerender(<App showA={false} />);
        css = getRenderedCSS();
        expect(css).toMatchInlineSnapshot(`
          ".a {
            color: red;
          }
          body {
            margin: 0;
          }
          .b {
            color: blue;
          }"
        `);
        // GlobalB (definition order before CompB) should still appear before CompB
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'color: blue'));
        // CompA was defined before GlobalB, so CompA still before GlobalB
        expect(posIn(css, 'color: red')).toBeLessThan(posIn(css, 'margin: 0'));
      });
    });

    describe('keyframes + global style ordering across mounts', () => {
      it('should maintain keyframes→global→component order when all defined in that order', () => {
        const fadeIn = keyframes`
          from { opacity: 0; }
          to { opacity: 1; }
        `;
        const GlobalStyle = createGlobalStyle`body { margin: 0; }`;
        const Comp = styled.div`
          animation: ${fadeIn} 1s;
        `;

        render(
          <>
            <GlobalStyle />
            <Comp />
          </>
        );

        const css = getRenderedCSS();
        expect(posIn(css, '@keyframes')).toBeLessThan(posIn(css, 'margin: 0'));
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'animation:'));
      });

      it('should maintain keyframes→global order when component mounts first and global mounts later', () => {
        const fadeIn = keyframes`
          from { opacity: 0; }
          to { opacity: 1; }
        `;
        const GlobalStyle = createGlobalStyle`body { margin: 0; }`;
        const Comp = styled.div`
          animation: ${fadeIn} 1s;
        `;

        function App({ showGlobal }: { showGlobal: boolean }) {
          return (
            <>
              {showGlobal && <GlobalStyle />}
              <Comp />
            </>
          );
        }

        // Mount component first (triggers keyframes injection)
        const { rerender } = render(<App showGlobal={false} />);
        expect(getRenderedCSS()).toMatchInlineSnapshot(`
          "@keyframes cFMmbV {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }
          .a {
            animation: cFMmbV 1s;
          }"
        `);

        // Now mount global style — definition order: keyframes→global→component
        rerender(<App showGlobal={true} />);
        const css = getRenderedCSS();
        expect(posIn(css, '@keyframes')).toBeLessThan(posIn(css, 'margin: 0'));
        expect(posIn(css, 'margin: 0')).toBeLessThan(posIn(css, 'animation:'));
      });
    });
  });
});
