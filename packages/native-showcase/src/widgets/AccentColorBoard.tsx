import React, { useState } from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { InlineMarkdown, Markdown } from '../components/Markdown';

/**
 * CSS UI 4 §6.3 - `accent-color: auto | <color>`. On RN the polyfill
 * lifts the resolved color onto `<Switch>.trackColor.true` so the
 * on-state surface tints to match. `accent-color: auto` resolves to
 * the platform `AccentColor` system color. Every visual cell is the
 * same `styled.Switch` with different CSS - no JS branching.
 */

const Stack = styled.View`
  gap: ${t.space.lg}px;
`;

const Section = styled.View`
  gap: ${t.space.sm}px;
`;

const SectionTitle = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: ${t.fontSize.brief}px;
  color: ${t.colors.ink};
  letter-spacing: -0.2px;
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
  padding: ${t.space.xs}px 0;
  border-bottom-width: ${t.borderWidth.hairline}px;
  border-bottom-color: ${t.colors.rule};
`;

const RowLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const AutoSwitch = styled.Switch`
  accent-color: auto;
`;
const NamedSwitch = styled.Switch`
  accent-color: tomato;
`;
const HexSwitch = styled.Switch`
  accent-color: #1f7a52;
`;
const OklchSwitch = styled.Switch`
  accent-color: oklch(0.72 0.18 265);
`;
const ColorMixSwitch = styled.Switch`
  accent-color: color-mix(in oklch, #c8243a 50%, #ec4899 50%);
`;
const SystemSwitch = styled.Switch`
  accent-color: LinkText;
`;

// The library keeps accentColor in the style bag after the trackColor
// lift, so the attrs `ast.pop` recipe re-routes it to whatever tint
// prop the wrapped component expects. Demonstrated against a stubbed
// "Indicator" View whose chrome simply reads `tintColor`.
interface IndicatorProps {
  tintColor?: string;
  on?: boolean;
}
function Indicator({ tintColor, on }: IndicatorProps) {
  return (
    <IndicatorOuter>
      <IndicatorTrack style={on ? { backgroundColor: tintColor } : undefined} />
      <IndicatorThumb style={on ? { transform: [{ translateX: 18 }] } : undefined} />
    </IndicatorOuter>
  );
}

const IndicatorOuter = styled.View`
  width: 44px;
  height: 24px;
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  justify-content: center;
`;

const IndicatorTrack = styled.View`
  position: absolute;
  inset: 0;
`;

const IndicatorThumb = styled.View`
  width: 18px;
  height: 18px;
  margin-left: 3px;
  background-color: ${t.colors.ink};
`;

const ThemedIndicator = styled(Indicator).attrs<{ tintColor?: string; on?: boolean }>(
  (props, ast) => ({
    tintColor: ast.pop('accentColor') ?? props.tintColor,
  })
)`
  accent-color: oklch(0.65 0.22 25);
`;

export function AccentColorBoard() {
  const [on, setOn] = useState(true);
  return (
    <Stack>
      <InlineMarkdown variant="brief">
        {`Each switch declares one \`accent-color\` value; the on-state track picks up the resolved color. Flip the master toggle to see the off-state behavior.`}
      </InlineMarkdown>
      <Section>
        <SectionTitle>On / off</SectionTitle>
        <Row>
          <RowLabel>master state</RowLabel>
          <AutoSwitch value={on} onValueChange={setOn} />
        </Row>
      </Section>
      <Section>
        <SectionTitle>Color forms</SectionTitle>
        <Row>
          <RowLabel>accent-color: auto · platform AccentColor</RowLabel>
          <AutoSwitch value={on} onValueChange={setOn} />
        </Row>
        <Row>
          <RowLabel>accent-color: tomato · named</RowLabel>
          <NamedSwitch value={on} onValueChange={setOn} />
        </Row>
        <Row>
          <RowLabel>accent-color: #1f7a52 · hex</RowLabel>
          <HexSwitch value={on} onValueChange={setOn} />
        </Row>
        <Row>
          <RowLabel>accent-color: oklch(0.72 0.18 265)</RowLabel>
          <OklchSwitch value={on} onValueChange={setOn} />
        </Row>
        <Row>
          <RowLabel>accent-color: color-mix(...)</RowLabel>
          <ColorMixSwitch value={on} onValueChange={setOn} />
        </Row>
        <Row>
          <RowLabel>accent-color: LinkText · system</RowLabel>
          <SystemSwitch value={on} onValueChange={setOn} />
        </Row>
      </Section>
      <Section>
        <SectionTitle>attrs · route accent-color to a custom tint prop</SectionTitle>
        <Markdown variant="hint">
          {`\`ast.pop('accentColor')\` returns the resolved value and removes it from the style bag, so it doesn't reach the wrapped component as an unrecognized key.`}
        </Markdown>
        <Row>
          <RowLabel>Indicator(tintColor) via attrs</RowLabel>
          <ThemedIndicator on={on} />
        </Row>
      </Section>
    </Stack>
  );
}
