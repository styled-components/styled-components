import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Standalone `translate`, `rotate`, `scale` properties (CSS Transforms
 * Module Level 2 §3). These are independent of the `transform`
 * shorthand - they cascade separately and don't need the array syntax
 * RN's runtime expects. The v7 native polyfill lowers each declaration
 * to the equivalent `transform:` string at compile time.
 *
 * Each row shows the property in isolation against an idle baseline so
 * the rest-state is obvious.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;

  @media (min-aspect-ratio: 1/1) {
    flex-direction: row;
    flex-wrap: wrap;
  }
`;

const Row = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
  padding: ${t.space.xs}px ${t.space.sm}px;

  @media (min-aspect-ratio: 1/1) {
    flex: 1 1 45%;
    min-width: 300px;
  }
  @media (min-aspect-ratio: 4/3) {
    flex: 1 1 30%;
    min-width: 260px;
  }
`;

const RowLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.ink};
`;

// Idle reference dot, identical across rows.
const Idle = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.signalSoft};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

// Each cell is the same baseline shape, with one standalone property
// applied. Keeping shape + color constant isolates the property under
// test.
const Cell = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
`;

const TranslateX = styled(Cell)`
  translate: 20px;
`;

const TranslateXY = styled(Cell)`
  translate: 16px 10px;
`;

const Rotate = styled(Cell)`
  rotate: 30deg;
`;

const RotateNeg = styled(Cell)`
  rotate: -45deg;
`;

const ScaleUniform = styled(Cell)`
  scale: 1.4;
`;

const ScaleDown = styled(Cell)`
  scale: 0.7;
`;

const ScaleTwoAxis = styled(Cell)`
  scale: 1.6 0.7;
`;

const Combined = styled(Cell)`
  translate: 12px -6px;
  rotate: 20deg;
  scale: 1.2;
`;

const Perspective = styled(Cell)`
  perspective: 200px;
  transform: rotateY(35deg);
`;

const SwatchPair = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.xs}px;
`;

interface DemoRowProps {
  label: string;
  children: React.ReactNode;
}

function DemoRow({ label, children }: DemoRowProps) {
  return (
    <Row>
      <RowLabel>{label}</RowLabel>
      <SwatchPair>
        <Idle />
        {children}
      </SwatchPair>
    </Row>
  );
}

export function StandaloneTransforms() {
  return (
    <Stack>
      <DemoRow label="translate: 20px">
        <TranslateX />
      </DemoRow>
      <DemoRow label="translate: 16px 10px">
        <TranslateXY />
      </DemoRow>
      <DemoRow label="rotate: 30deg">
        <Rotate />
      </DemoRow>
      <DemoRow label="rotate: -45deg">
        <RotateNeg />
      </DemoRow>
      <DemoRow label="scale: 1.4">
        <ScaleUniform />
      </DemoRow>
      <DemoRow label="scale: 0.7">
        <ScaleDown />
      </DemoRow>
      <DemoRow label="scale: 1.6 0.7 (two-axis)">
        <ScaleTwoAxis />
      </DemoRow>
      <DemoRow label="translate + rotate + scale (cascading)">
        <Combined />
      </DemoRow>
      <DemoRow label="perspective: 200px (last wins over translate-rotate-scale)">
        <Perspective />
      </DemoRow>
    </Stack>
  );
}
