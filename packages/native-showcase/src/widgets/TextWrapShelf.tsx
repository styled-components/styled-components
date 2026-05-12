import React from 'react';
import styled from 'styled-components/native';
import { Markdown } from '@/components/Markdown';
import { theme as t } from '@/theme/tokens';

/**
 * `text-wrap` shorthand (CSS Text 4 §5.5). Polyfilled on RN by lifting
 * to `numberOfLines` (for `nowrap`) and `textBreakStrategy` (Android
 * API 23+) for `balance` / `pretty`. iOS has no platform line-breaking
 * control, so `balance` / `pretty` / `stable` are silently no-ops there.
 * rn-web maps directly to the CSS engine.
 *
 * Each row tags the platforms where the value actually changes the
 * rendered line-breaking. Unsupported platforms render the row with
 * the default `wrap` behavior — that is a feature of the runtime, not
 * a library bug.
 */

const SAMPLE =
  'styled-components ships a CSS-in-JS engine that handles modern color spaces, container queries, viewport units, and animations on every platform.';

const NARROW =
  'A short headline that needs balanced wrapping to look right at small widths.';

const Stack = styled.View`
  gap: ${t.space.lg}px;
`;

const Row = styled.View`
  gap: ${t.space.xxs}px;
`;

const RowHeader = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: ${t.space.xs}px;
`;

const RowLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.ink};
`;

const Frame = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
`;

const Body = styled.Text`
  font-family: ${t.fontFamily.body};
  font-size: ${t.fontSize.body}px;
  line-height: ${t.lineHeight.body}px;
  color: ${t.colors.ink};
`;

const WrapDefault = styled(Body)`
  text-wrap: wrap;
`;

const WrapNowrap = styled(Body)`
  text-wrap: nowrap;
`;

const WrapBalance = styled(Body)`
  text-wrap: balance;
`;

const WrapPretty = styled(Body)`
  text-wrap: pretty;
`;

const WrapStable = styled(Body)`
  text-wrap: stable;
`;

const WrapModeNowrap = styled(Body)`
  text-wrap-mode: nowrap;
`;

const WrapStyleBalance = styled(Body)`
  text-wrap-style: balance;
`;

// Constrained ribbon — `text-wrap: nowrap` overflow becomes visible
// here. Layered hairline borders mark the box even when the text
// extends past them.
const Ribbon = styled(Frame)`
  overflow: hidden;
`;

// Narrow column to make balance / pretty differences visible without
// requiring a tablet viewport.
const NarrowFrame = styled(Frame)`
  max-width: 240px;
`;

// Inline platform-support indicator. Each row tags the three runtimes
// the library targets; chips for unsupported platforms render dim with
// a strike-through, so the user knows a uniform-looking row on iOS is
// expected runtime behavior, not a library regression.
const BadgeRow = styled.View`
  flex-direction: row;
  gap: 4px;
`;

const BadgeBase = styled.Text`
  padding: 2px 6px;
  font-family: ${t.fontFamily.monoStrong};
  font-size: 10px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const BadgeOn = styled(BadgeBase)`
  background-color: ${t.colors.ink};
  color: ${t.colors.bg};
  border-color: ${t.colors.ink};
`;

const BadgeOff = styled(BadgeBase)`
  background-color: transparent;
  color: ${t.colors.fgFaint};
  text-decoration-line: line-through;
`;

type PlatformKey = 'iOS' | 'Android' | 'Web';
type Support = Record<PlatformKey, boolean>;

function PlatformBadges({ support }: { support: Support }) {
  const order: PlatformKey[] = ['iOS', 'Android', 'Web'];
  return (
    <BadgeRow>
      {order.map(p => {
        const Chip = support[p] ? BadgeOn : BadgeOff;
        return <Chip key={p}>{p}</Chip>;
      })}
    </BadgeRow>
  );
}

const SUPPORT = {
  universal: { iOS: true, Android: true, Web: true } satisfies Support,
  androidWeb: { iOS: false, Android: true, Web: true } satisfies Support,
  webOnly: { iOS: false, Android: false, Web: true } satisfies Support,
};

export function TextWrapShelf() {
  return (
    <Stack>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap: wrap · default</RowLabel>
          <PlatformBadges support={SUPPORT.universal} />
        </RowHeader>
        <Markdown variant="hint">Greedy line-breaking. Same on every platform.</Markdown>
        <Frame>
          <WrapDefault>{SAMPLE}</WrapDefault>
        </Frame>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap: nowrap</RowLabel>
          <PlatformBadges support={SUPPORT.universal} />
        </RowHeader>
        <Markdown variant="hint">
          Native maps to `numberOfLines: 1`; overflow clipped by `overflow: hidden`.
        </Markdown>
        <Ribbon>
          <WrapNowrap>{SAMPLE}</WrapNowrap>
        </Ribbon>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap: balance</RowLabel>
          <PlatformBadges support={SUPPORT.androidWeb} />
        </RowHeader>
        <Markdown variant="hint">
          Android: `textBreakStrategy: balanced`. iOS has no platform API — renders default
          wrap.
        </Markdown>
        <NarrowFrame>
          <WrapBalance>{NARROW}</WrapBalance>
        </NarrowFrame>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap: pretty</RowLabel>
          <PlatformBadges support={SUPPORT.androidWeb} />
        </RowHeader>
        <Markdown variant="hint">
          Android: `textBreakStrategy: highQuality`. iOS renders default wrap.
        </Markdown>
        <NarrowFrame>
          <WrapPretty>{NARROW}</WrapPretty>
        </NarrowFrame>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap: stable</RowLabel>
          <PlatformBadges support={SUPPORT.webOnly} />
        </RowHeader>
        <Markdown variant="hint">
          Web only — RN 0.85 has no re-flow stability API on either platform.
        </Markdown>
        <NarrowFrame>
          <WrapStable>{NARROW}</WrapStable>
        </NarrowFrame>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap-mode: nowrap · longhand</RowLabel>
          <PlatformBadges support={SUPPORT.universal} />
        </RowHeader>
        <Markdown variant="hint">
          Independent longhand registration: `text-wrap-mode` sets the mode without touching
          style.
        </Markdown>
        <Ribbon>
          <WrapModeNowrap>{SAMPLE}</WrapModeNowrap>
        </Ribbon>
      </Row>
      <Row>
        <RowHeader>
          <RowLabel>text-wrap-style: balance · longhand</RowLabel>
          <PlatformBadges support={SUPPORT.androidWeb} />
        </RowHeader>
        <Markdown variant="hint">
          Independent longhand registration: `text-wrap-style` sets the style without
          touching mode.
        </Markdown>
        <NarrowFrame>
          <WrapStyleBalance>{NARROW}</WrapStyleBalance>
        </NarrowFrame>
      </Row>
      <Markdown variant="hint">
        Chips show platforms where the value actually changes line-breaking. Dimmed chips =
        the declaration reaches the runtime but has no effect there (fallback to default
        wrap).
      </Markdown>
    </Stack>
  );
}
