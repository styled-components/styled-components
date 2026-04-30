import React, { useState } from 'react';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Stage = styled.View`
  height: 200px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Tile = styled.View<{ $rule: string; $bg: string }>`
  width: 88px;
  height: 88px;
  background-color: ${p => p.$bg};
  border: ${t.borderWidth.heavy}px solid ${t.colors.ink};
  transform: ${p => p.$rule};
`;

const Toolbar = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
  flex-wrap: wrap;
`;

const Toggle = styled.Pressable`
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  background-color: ${t.colors.bg};

  &[aria-pressed='true'] {
    background-color: ${t.colors.ink};
  }
`;

const ToggleLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.8px;
  color: ${t.colors.ink};
  text-transform: uppercase;

  &[aria-pressed='true'] {
    color: ${t.colors.bg};
  }
`;

type Mode = {
  id: string;
  label: string;
  display: string;
  rule: string;
  bg: string;
};

const MODES: Mode[] = [
  {
    id: 'translate',
    label: 'Translate',
    display: 'translateX(${t.space.lg}px) translateY(-12px)',
    rule: `translateX(${t.space.lg}px) translateY(-12px)`,
    bg: t.colors.fail,
  },
  {
    id: 'rotate',
    label: 'Rotate + scale',
    display: 'rotate(18deg) scale(0.85)',
    rule: 'rotate(18deg) scale(0.85)',
    bg: t.colors.pass,
  },
  {
    id: 'skew',
    label: 'Skew',
    display: 'skewX(-12deg) translateY(8px)',
    rule: 'skewX(-12deg) translateY(8px)',
    bg: t.colors.ink,
  },
];

export function TransformPlayground() {
  const [modeId, setModeId] = useState('translate');
  const active = MODES.find(m => m.id === modeId)!;
  return (
    <>
      <Toolbar>
        {MODES.map(m => (
          <Toggle
            key={m.id}
            aria-pressed={modeId === m.id}
            onPress={() => setModeId(m.id)}
            accessibilityRole="button"
          >
            <ToggleLabel aria-pressed={modeId === m.id}>{m.label}</ToggleLabel>
          </Toggle>
        ))}
      </Toolbar>
      <StateReadout
        entries={[
          { key: 'transform', value: active.display },
          { key: 'engine', value: 'theme sentinels stitched in at render' },
        ]}
        badge={{ tone: 'neutral', label: 'CSS · TRANSFORMS' }}
      />
      <Stage>
        <Tile $rule={active.rule} $bg={active.bg} />
      </Stage>
    </>
  );
}
