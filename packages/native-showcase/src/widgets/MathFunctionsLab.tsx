import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { Markdown } from '@/components/Markdown';

/**
 * CSS Values 4 §10 - `calc()`, `min()`, `max()`, `clamp()` plus the
 * L4 expansion (`round`, `mod`, `rem`, trig, `pow`, `sqrt`, `hypot`,
 * `abs`, `sign`). Each row renders a single bar whose `width` is the
 * formula in question; the bar's rendered length IS the proof of the
 * computed value. Labels stay outside the bar so narrow results
 * (`mod(125, 7) → 6`) don't squeeze their captions.
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

const Track = styled.View`
  gap: ${t.space.xxs}px;
`;

const TrackLabel = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const Baseline = styled.View`
  gap: ${t.space.md}px;
`;

const Bar = styled.View`
  height: 14px;
  background-color: ${t.colors.ink};
`;

// Static folds - resolved to a fixed pixel value at compile time.
const SumFold = styled(Bar)`
  width: calc(120px + 80px);
`;
const MaxFold = styled(Bar)`
  width: max(32px, 200px);
`;
const ClampFold = styled(Bar)`
  width: clamp(80px, 160px, 240px);
`;
const RoundFold = styled(Bar)`
  width: round(157.4px, 5px);
`;
const TrigFold = styled(Bar)`
  width: calc(sin(45deg) * 200px);
`;
const PowFold = styled(Bar)`
  width: pow(8, 2);
`;
const HypotFold = styled(Bar)`
  width: hypot(60, 80);
`;
const AbsFold = styled(Bar)`
  width: abs(-180);
`;
const ModFold = styled(Bar)`
  width: mod(127, 30);
`;

// Runtime - re-resolves against viewport on each render.
const RuntimeBar = styled(Bar)`
  background-color: ${t.colors.pass};
`;
const VwAdd = styled(RuntimeBar)`
  width: calc(50vw + 24px);
`;
const VwMin = styled(RuntimeBar)`
  width: min(70vw, 360px);
`;
const VwClamp = styled(RuntimeBar)`
  width: clamp(160px, 80vw, 420px);
`;

interface RowProps {
  formula: string;
  result: string;
  Bar: React.ComponentType;
}

function Row({ formula, result, Bar }: RowProps) {
  return (
    <Track>
      <TrackLabel>
        {formula} → {result}
      </TrackLabel>
      <Bar />
    </Track>
  );
}

export function MathFunctionsLab() {
  return (
    <Stack>
      <Section>
        <SectionTitle>Static folds (compile time)</SectionTitle>
        <Markdown variant="hint">
          {
            'Each black bar is exactly the formula result wide. The library folds the expression to a fixed pixel value before the style ever reaches React Native.'
          }
        </Markdown>
        <Baseline>
          <Row formula="calc(120px + 80px)" result="200px" Bar={SumFold} />
          <Row formula="max(32px, 200px)" result="200px" Bar={MaxFold} />
          <Row formula="abs(-180)" result="180px" Bar={AbsFold} />
          <Row formula="clamp(80px, 160px, 240px)" result="160px" Bar={ClampFold} />
          <Row formula="round(157.4px, 5px)" result="155px" Bar={RoundFold} />
          <Row formula="calc(sin(45deg) * 200px)" result="≈ 141px" Bar={TrigFold} />
          <Row formula="hypot(60, 80)" result="100px" Bar={HypotFold} />
          <Row formula="pow(8, 2)" result="64px" Bar={PowFold} />
          <Row formula="mod(127, 30)" result="7px" Bar={ModFold} />
        </Baseline>
      </Section>

      <Section>
        <SectionTitle>Viewport-aware (runtime)</SectionTitle>
        <Markdown variant="hint">
          {
            'Each green bar mixes static and viewport arms. Rotate the device or resize the window - these re-resolve every render against `Dimensions.get(window)`.'
          }
        </Markdown>
        <Baseline>
          <Row formula="calc(50vw + 24px)" result="half the viewport, +24px" Bar={VwAdd} />
          <Row formula="min(70vw, 360px)" result="capped at 360px" Bar={VwMin} />
          <Row formula="clamp(160px, 80vw, 420px)" result="160–420px" Bar={VwClamp} />
        </Baseline>
      </Section>
    </Stack>
  );
}
