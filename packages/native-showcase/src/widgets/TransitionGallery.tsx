import React, { useEffect, useState } from 'react';
import styled, { useMediaEnv } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Demonstrates every transition shape the v7 Animated adapter supports.
 *
 * All rows auto-rotate in sync at the same cadence as the BlendModeBoard
 * (`HOLD_MS + TRANSITION_MS`). Tapping a row still flips the global
 * state for an immediate manual toggle; the next tick continues from
 * there. Reduce-motion stops the auto-rotation entirely.
 *
 * The underlying CSS per row is the only source of truth for HOW each
 * property animates - no Animated API consumed at the widget layer.
 */

const HOLD_MS = 600;
const TRANSITION_MS = 1200;

const RowFrame = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
  padding: ${t.space.xs}px ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  background-color: ${t.colors.bg};
`;

const RowLabel = styled.Text`
  flex: 1;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

// --- Per-property transition cells (the load-bearing part) ---

const OpacityCell = styled.View<{ $on: boolean }>`
  width: 56px;
  height: 24px;
  background-color: ${t.colors.ink};
  opacity: ${p => (p.$on ? 0.25 : 1)};
  transition: opacity 320ms ease-in-out;
`;

const BackgroundCell = styled.View<{ $on: boolean }>`
  width: 56px;
  height: 24px;
  background-color: ${p => (p.$on ? t.colors.pass : t.colors.fail)};
  transition: background-color 320ms ease-in-out;
`;

const ColorCell = styled.Text<{ $on: boolean }>`
  width: 56px;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  text-align: center;
  color: ${p => (p.$on ? t.colors.pass : t.colors.fail)};
  transition: color 320ms ease-in-out;
`;

const BorderColorCell = styled.View<{ $on: boolean }>`
  width: 56px;
  height: 24px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.heavy}px solid ${p => (p.$on ? t.colors.pass : t.colors.fail)};
  transition: border-color 320ms ease-in-out;
`;

const RadiusCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  border-radius: ${p => (p.$on ? 12 : 0)}px;
  transition: border-radius 320ms ease-in-out;
`;

const TransformScaleCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: scale(${p => (p.$on ? 1.6 : 1)});
  transition: transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const TransformRotateCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: rotate(${p => (p.$on ? 45 : 0)}deg);
  transition: transform 320ms ease-in-out;
`;

const TransformTranslateCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: translateX(${p => (p.$on ? 24 : 0)}px);
  transition: transform 320ms ease-out;
`;

const TransformCompoundCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: ${p =>
    p.$on ? 'translateX(24px) rotate(45deg) scale(1.4)' : 'translateX(0px) rotate(0deg) scale(1)'};
  transition: transform 320ms ease-in-out;
`;

const TransformDisjointCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: ${p => (p.$on ? 'rotate(45deg) scale(0.8)' : 'translateX(20px) translateY(-8px)')};
  transition: transform 320ms ease-in-out;
`;

const WidthCell = styled.View<{ $on: boolean }>`
  width: ${p => (p.$on ? 56 : 24)}px;
  height: 24px;
  background-color: ${t.colors.ink};
  transition: width 320ms ease-out;
`;

const PaddingCell = styled.View<{ $on: boolean }>`
  padding-left: ${p => (p.$on ? 24 : 0)}px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  transition: padding-left 320ms ease-out;
`;

const PaddingDot = styled.View`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
`;

const MultiPropCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${p => (p.$on ? t.colors.pass : t.colors.fail)};
  border-radius: ${p => (p.$on ? 12 : 0)}px;
  opacity: ${p => (p.$on ? 1 : 0.4)};
  transform: rotate(${p => (p.$on ? 90 : 0)}deg);
  transition:
    background-color 320ms ease-in-out,
    border-radius 320ms ease-in-out,
    opacity 320ms ease-in-out,
    transform 320ms ease-in-out;
`;

const AllPropCell = styled.View<{ $on: boolean }>`
  width: ${p => (p.$on ? 56 : 24)}px;
  height: 24px;
  background-color: ${p => (p.$on ? t.colors.pass : t.colors.fail)};
  transition: all 320ms ease-out;
`;

const SteppedCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: rotate(${p => (p.$on ? 90 : 0)}deg);
  transition: transform 600ms steps(4, jump-end);
`;

const LinearStopsCell = styled.View<{ $on: boolean }>`
  width: 24px;
  height: 24px;
  background-color: ${t.colors.ink};
  transform: translateX(${p => (p.$on ? 56 : 0)}px);
  transition: transform 600ms linear(0, 0.3 25%, 0.7 75%, 1);
`;

interface RowProps {
  label: string;
  on: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Row({ label, on, onToggle, children }: RowProps) {
  return (
    <RowFrame onPress={onToggle} accessibilityRole="button" aria-pressed={on}>
      <RowLabel>{label}</RowLabel>
      {children}
    </RowFrame>
  );
}

export function TransitionGallery() {
  // Single shared boolean - every row reads `$on` from the same flag so
  // the matrix beats in sync. Tap any row to flip the flag immediately;
  // the auto-rotation picks up from the new state on the next tick.
  const [on, setOn] = useState(false);
  const env = useMediaEnv();

  useEffect(() => {
    if (env.reduceMotion) return;
    const id = setInterval(() => setOn(prev => !prev), HOLD_MS + TRANSITION_MS);
    return () => clearInterval(id);
  }, [env.reduceMotion]);

  const toggle = (_k: string) => setOn(prev => !prev);

  return (
    <Stack>
      <Row label="opacity" on={on} onToggle={() => toggle('opacity')}>
        <OpacityCell $on={on} />
      </Row>
      <Row label="background-color" on={on} onToggle={() => toggle('bg')}>
        <BackgroundCell $on={on} />
      </Row>
      <Row label="color" on={on} onToggle={() => toggle('color')}>
        <ColorCell $on={on}>AaBb</ColorCell>
      </Row>
      <Row label="border-color" on={on} onToggle={() => toggle('borderColor')}>
        <BorderColorCell $on={on} />
      </Row>
      <Row label="border-radius" on={on} onToggle={() => toggle('radius')}>
        <RadiusCell $on={on} />
      </Row>
      <Row label="transform · scale (overshoot)" on={on} onToggle={() => toggle('scale')}>
        <TransformScaleCell $on={on} />
      </Row>
      <Row label="transform · rotate" on={on} onToggle={() => toggle('rotate')}>
        <TransformRotateCell $on={on} />
      </Row>
      <Row label="transform · translateX" on={on} onToggle={() => toggle('translate')}>
        <TransformTranslateCell $on={on} />
      </Row>
      <Row label="transform · compound (matched kinds)" on={on} onToggle={() => toggle('compound')}>
        <TransformCompoundCell $on={on} />
      </Row>
      <Row
        label="transform · disjoint kinds (translate ↔ rotate+scale)"
        on={on}
        onToggle={() => toggle('disjoint')}
      >
        <TransformDisjointCell $on={on} />
      </Row>
      <Row label="width" on={on} onToggle={() => toggle('width')}>
        <WidthCell $on={on} />
      </Row>
      <Row label="padding-left" on={on} onToggle={() => toggle('padding')}>
        <PaddingCell $on={on}>
          <PaddingDot />
        </PaddingCell>
      </Row>
      <Row label="multi-prop · same duration" on={on} onToggle={() => toggle('multi')}>
        <MultiPropCell $on={on} />
      </Row>
      <Row label="transition: all" on={on} onToggle={() => toggle('all')}>
        <AllPropCell $on={on} />
      </Row>
      <Row label="easing · steps(4, jump-end)" on={on} onToggle={() => toggle('stepped')}>
        <SteppedCell $on={on} />
      </Row>
      <Row
        label="easing · linear(0, 0.3 25%, 0.7 75%, 1)"
        on={on}
        onToggle={() => toggle('linearStops')}
      >
        <LinearStopsCell $on={on} />
      </Row>
    </Stack>
  );
}
