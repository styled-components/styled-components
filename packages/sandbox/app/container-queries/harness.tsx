'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import theme from '../lib/theme';

const MIN_WIDTH = 180;
const MAX_WIDTH = 720;

export function ContainerQueriesHarness() {
  return (
    <>
      <Demo>
        <DemoTitle>
          <DemoNum>1.</DemoNum> Headline scales with the container, not the viewport
        </DemoTitle>
        <DemoNote>
          Drag the handle to resize the box. The font-size rule is{' '}
          <code>font-size: 11cqw</code> — when <code>cqw</code> resolves against the wrapper
          (correct), the headline grows / shrinks with the slider. If <code>cqw</code> falls
          back to viewport (broken), the text size won&apos;t change as you drag.
        </DemoNote>
        <Resizable initialWidth={300}>
          <UnitsWrapper>
            <UnitsHeadline>BIG BOX. BIG TYPE.</UnitsHeadline>
            <UnitsFootnote>font-size: 11cqw · padding: 4cqw</UnitsFootnote>
          </UnitsWrapper>
        </Resizable>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>2.</DemoNum> Anonymous <code>@container</code> query against nearest
        </DemoTitle>
        <DemoNote>
          The box starts wide and reads <strong>QUERY ACTIVE</strong> in green. Drag the handle
          left below 360px and the anonymous <code>@container</code> query stops matching — the
          box turns slate and reads <strong>QUERY IDLE</strong>. Cross back over 360px and it
          flips green again. If the color stays put through the whole drag range, anonymous-query
          resolution is broken.
        </DemoNote>
        <Resizable initialWidth={440} threshold={360}>
          <AnonShell>
            <AnonInner>
              <AnonStatus>
                <AnonOnSmall>QUERY IDLE</AnonOnSmall>
                <AnonOnLarge>QUERY ACTIVE</AnonOnLarge>
              </AnonStatus>
              <AnonHint>@container (min-width: 360px) {'{'} background: green {'}'}</AnonHint>
            </AnonInner>
          </AnonShell>
        </Resizable>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>3.</DemoNum> Cross-component query via <code>${'${Component}'}</code>
        </DemoTitle>
        <DemoNote>
          The card uses <code>@container ${'${ProductCard}'}</code> from descendants — naming
          the wrapper styled-component directly, no string identifier in the CSS. The card
          starts wide with the layout horizontal, the price big, and the badge green reading{' '}
          <strong>QUERY ACTIVE</strong>. Drag below 420px and three things flip at once:
          layout stacks vertically, price shrinks, badge turns slate reading <strong>QUERY
          IDLE</strong>. If any of those three don&apos;t happen together, the named-component
          reference is broken.
        </DemoNote>
        <Resizable initialWidth={500} threshold={420}>
          <ProductCard>
            <ProductLayout>
              <ProductBadge>
                <ProductBadgeOff>QUERY IDLE</ProductBadgeOff>
                <ProductBadgeOn>QUERY ACTIVE</ProductBadgeOn>
              </ProductBadge>
              <ProductPrice>$299</ProductPrice>
              <ProductMeta>
                <ProductLabel>per seat</ProductLabel>
                <ProductPeriod>billed monthly</ProductPeriod>
              </ProductMeta>
            </ProductLayout>
          </ProductCard>
        </Resizable>
      </Demo>

      <Demo>
        <DemoTitle>
          <DemoNum>4.</DemoNum> Side-by-side: <code>cqw</code> vs viewport fallback
        </DemoTitle>
        <DemoNote>
          Two siblings inside one resizable container. Both bars use the same rule:{' '}
          <code>width: 10cqw</code>. The LEFT outer box declares{' '}
          <code>container-type: inline-size</code>, so its bar scales with the surrounding
          box. The RIGHT outer box doesn&apos;t, so <code>cqw</code> falls back to{' '}
          <code>vw</code> and the bar inside stays a constant pixel width. As you drag, the
          left bar squishes along with its parent; the right bar refuses to shrink — it
          eventually overflows its parent because its width is anchored to the browser
          window, not the container.
        </DemoNote>
        <Resizable initialWidth={500}>
          <SanityRow>
            <SanityColFluid>
              <ScopedWrapper>
                <ScaleBar />
                <BarLabel>scales with drag</BarLabel>
              </ScopedWrapper>
              <SanityCaption>container-type: inline-size ✓</SanityCaption>
            </SanityColFluid>
            <SanityColFixed>
              <UnscopedWrapper>
                <ScaleBar />
                <BarLabel>fixed (vw fallback)</BarLabel>
              </UnscopedWrapper>
              <SanityCaption>no container-type</SanityCaption>
            </SanityColFixed>
          </SanityRow>
        </Resizable>
      </Demo>
    </>
  );
}

// ───────────────────────────────────────────────────────────────────
// Resizable — wraps a single demo with a right-edge drag handle.
// Width readout + threshold pill make pass/fail obvious at a glance.
// ───────────────────────────────────────────────────────────────────

interface ResizableProps {
  initialWidth: number;
  threshold?: number;
  children: React.ReactNode;
}

function Resizable({ initialWidth, threshold, children }: ResizableProps) {
  const [width, setWidth] = useState(initialWidth);
  const draggingRef = useRef<{ startX: number; startW: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = { startX: e.clientX, startW: width };
    },
    [width]
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const delta = e.clientX - draggingRef.current.startX;
    const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, draggingRef.current.startW + delta));
    setWidth(next);
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      draggingRef.current = null;
    },
    []
  );

  // Pause text selection during drag (defensive — pointer capture should suffice).
  useEffect(() => {
    const onSelectStart = (e: Event) => {
      if (draggingRef.current) e.preventDefault();
    };
    document.addEventListener('selectstart', onSelectStart);
    return () => document.removeEventListener('selectstart', onSelectStart);
  }, []);

  const aboveThreshold = threshold !== undefined && width >= threshold;

  return (
    <ResizableShell>
      <ResizableTrack style={{ width }}>
        <Stage>{children}</Stage>
        <Handle
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label="Drag to resize container"
        >
          <HandleGrip />
        </Handle>
      </ResizableTrack>
      <ResizableMeta>
        <Readout>
          <ReadoutLabel>WIDTH</ReadoutLabel>
          <ReadoutValue>{width}px</ReadoutValue>
        </Readout>
        {threshold !== undefined && (
          <Verdict $pass={aboveThreshold}>
            {aboveThreshold ? `≥ ${threshold}px — query ACTIVE` : `< ${threshold}px — query IDLE`}
          </Verdict>
        )}
      </ResizableMeta>
    </ResizableShell>
  );
}

// ───────────────────────────────────────────────────────────────────
// Layout primitives
// ───────────────────────────────────────────────────────────────────

const Demo = styled.section`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DemoTitle = styled.h2`
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;

  code {
    font-family: ${theme.typography.fontFamilyMono};
    font-size: 0.92em;
    color: var(--sc-colors-accent);
    background: none;
  }
`;

const DemoNum = styled.span`
  font-family: ${theme.typography.fontFamilyMono};
  font-weight: 700;
  color: var(--sc-colors-textMuted);
  margin-right: 8px;
`;

const DemoNote = styled.p`
  margin: 0;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--sc-colors-textMuted);
  max-width: 70ch;

  strong {
    color: var(--sc-colors-text);
    font-weight: 700;
  }

  code {
    font-family: ${theme.typography.fontFamilyMono};
    font-size: 0.92em;
    background: var(--sc-colors-surface);
    border: 1px solid var(--sc-colors-border);
    padding: 0 4px;
    border-radius: 3px;
    color: var(--sc-colors-text);
  }
`;

const ResizableShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
`;

const ResizableTrack = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
  background: repeating-linear-gradient(
    45deg,
    var(--sc-colors-surface),
    var(--sc-colors-surface) 6px,
    var(--sc-colors-background) 6px,
    var(--sc-colors-background) 12px
  );
  border: 1px solid var(--sc-colors-border);
  border-radius: 8px;
  overflow: visible;
  padding: 14px;
  padding-right: 18px; /* room for the handle */
  box-sizing: border-box;
  /* Respect content's intrinsic minimum: when a child has a fixed pixel */
  /* size (like demo 4's vw-fallback bar), the track grows to fit it */
  /* instead of clipping. Inline style {{ width }} sets the preferred */
  /* width; min-width: min-content takes over when content can't fit. */
  min-width: min-content;
`;

const Stage = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Handle = styled.div`
  position: absolute;
  top: 0;
  right: -1px;
  bottom: 0;
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ew-resize;
  user-select: none;
  touch-action: none;
  z-index: 1;

  &:hover > div,
  &:active > div {
    background: var(--sc-colors-primary);
  }
`;

const HandleGrip = styled.div`
  width: 4px;
  height: 36px;
  background: var(--sc-colors-textMuted);
  border-radius: 999px;
  transition: background 0.15s;
`;

const ResizableMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Readout = styled.div`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: ${theme.typography.fontFamilyMono};
`;

const ReadoutLabel = styled.span`
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--sc-colors-textMuted);
`;

const ReadoutValue = styled.strong`
  font-size: 13px;
  font-weight: 700;
  color: var(--sc-colors-text);
`;

const Verdict = styled.div<{ $pass: boolean }>`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
  background: ${p => (p.$pass ? '#16a34a' : '#6b7280')};
  color: white;
`;

// ───────────────────────────────────────────────────────────────────
// Demo 1 — cq-units scaling
// ───────────────────────────────────────────────────────────────────

const UnitsWrapper = styled.div`
  container-type: inline-size;
  background: var(--sc-colors-background);
  border: 2px solid var(--sc-colors-text);
  border-radius: 6px;
  padding: 4cqw;
  display: flex;
  flex-direction: column;
  gap: 1cqw;
  text-align: center;
`;

const UnitsHeadline = styled.h3`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11cqw;
  line-height: 1.05;
  margin: 0;
  letter-spacing: -0.04em;
  font-weight: 800;
  color: var(--sc-colors-text);
`;

const UnitsFootnote = styled.p`
  margin: 0;
  font-size: 3cqw;
  font-family: ${theme.typography.fontFamilyMono};
  color: var(--sc-colors-textMuted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

// ───────────────────────────────────────────────────────────────────
// Demo 2 — anonymous @container query: dramatic color flip
// (CSS container queries match against ANCESTOR containers, not the
// element itself — so the container-type declaration goes on an outer
// shell and the responsive rules go on an inner child.)
// ───────────────────────────────────────────────────────────────────

const AnonShell = styled.div`
  container-type: inline-size;
`;

const AnonInner = styled.div`
  border-radius: 6px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 120px;

  /* Default (below threshold) is neutral slate, not alarming red — */
  /* below threshold is just "query hasn't fired yet", not a failure. */
  background: #475569;
  color: white;
  border: 4px solid #1e293b;

  @container (min-width: 360px) {
    background: #16a34a;
    border-color: #14532d;
  }
`;

const AnonStatus = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.08em;
`;

const AnonOnSmall = styled.span`
  display: inline;
  @container (min-width: 360px) {
    display: none;
  }
`;

const AnonOnLarge = styled.span`
  display: none;
  @container (min-width: 360px) {
    display: inline;
  }
`;

const AnonHint = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.85;
  text-align: center;
`;

// ───────────────────────────────────────────────────────────────────
// Demo 3 — cross-component query via ${ProductCard}
// ProductCard is the bare container (declares container-type only).
// ProductLayout + ProductPrice are descendants that query upward by
// naming ProductCard explicitly via `${Component}` interpolation.
// ───────────────────────────────────────────────────────────────────

const ProductCard = styled.div`
  container-type: inline-size;
`;

const ProductLayout = styled.div`
  position: relative;
  background: var(--sc-colors-background);
  border: 4px dashed #6b7280;
  border-radius: 6px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;

  /* Cross-component query — descendant queries the named ProductCard ancestor. */
  @container ${ProductCard} (min-width: 420px) {
    flex-direction: row;
    align-items: center;
    gap: 24px;
    border-style: solid;
    border-color: #16a34a;
  }
`;

/* Badge sits in the top-right corner. The two child spans toggle visibility */
/* via cross-component @container queries, so above the threshold "QUERY ACTIVE" */
/* shows on a green background and below it "QUERY IDLE" shows on grey. */
const ProductBadge = styled.div`
  position: absolute;
  top: -10px;
  right: -10px;
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 4px 8px;
  border-radius: 999px;
  color: white;
  background: #6b7280;

  @container ${ProductCard} (min-width: 420px) {
    background: #16a34a;
  }
`;

const ProductBadgeOff = styled.span`
  display: inline;
  @container ${ProductCard} (min-width: 420px) {
    display: none;
  }
`;

const ProductBadgeOn = styled.span`
  display: none;
  @container ${ProductCard} (min-width: 420px) {
    display: inline;
  }
`;

const ProductPrice = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--sc-colors-text);
  line-height: 1;

  @container ${ProductCard} (min-width: 420px) {
    font-size: 64px;
  }
`;

const ProductMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ProductLabel = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  letter-spacing: 0.12em;
  font-weight: 700;
  color: var(--sc-colors-accent);
  text-transform: uppercase;
`;

const ProductPeriod = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  color: var(--sc-colors-textMuted);
  letter-spacing: 0.04em;
`;

// ───────────────────────────────────────────────────────────────────
// Demo 4 — side-by-side scoped vs unscoped (visual control + bug)
// Two siblings inside ONE Resizable. As the user drags, both outer
// boxes shrink (flex:1). Inside, the LEFT bar uses cqw (resolves
// against its container, so it scales) and the RIGHT bar uses cqw
// without container-type (falls back to vw — fixed pixel width that
// won't shrink even when its parent does).
// ───────────────────────────────────────────────────────────────────

const SanityRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: stretch;
`;

const SanityColFluid = styled.div`
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

/* Right column refuses to shrink — its inner bar has a fixed pixel
   width (vw fallback) and we want that width to push back against
   the Resizable, not get clipped. flex: 0 0 auto sizes the column
   to content; flex-shrink: 0 below stops the wrapper from being
   compressed by the row's flex algorithm. */
const SanityColFixed = styled.div`
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const ScopedWrapper = styled.div`
  container-type: inline-size;
  background: #16a34a;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex: 1;
  gap: 8px;
  min-height: 84px;
  overflow: hidden;
`;

const UnscopedWrapper = styled.div`
  /* deliberately no container-type — cqw falls back to vw per CSS spec */
  background: #6b7280;
  border-radius: 6px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  flex-shrink: 0;
  gap: 8px;
  min-height: 84px;
  /* No overflow: hidden — let the bar's natural pixel width drive the */
  /* wrapper's natural width so it pushes back against drag. */
`;

const ScaleBar = styled.div`
  width: 10cqw;
  height: 32px;
  background: white;
  border-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  flex-shrink: 0;
`;

const BarLabel = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: white;
`;

const SanityCaption = styled.div`
  font-family: ${theme.typography.fontFamilyMono};
  font-size: 10px;
  text-align: center;
  color: var(--sc-colors-textMuted);
  letter-spacing: 0.04em;
`;
