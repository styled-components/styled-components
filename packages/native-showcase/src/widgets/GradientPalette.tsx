import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Card = styled.View`
  height: 96px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.sm}px;
  justify-content: flex-end;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.bg};
  background-color: rgba(14, 14, 16, 0.6);
  padding: 2px 6px;
  align-self: flex-start;
  text-transform: uppercase;
`;

const Linear = styled(Card)`
  background-image: linear-gradient(135deg, #ff8a00, #c8243a, #6b1bb1);
`;

const ThemeLinear = styled(Card)`
  background-image: linear-gradient(90deg, ${t.colors.fail}, ${t.colors.ink});
`;

const Radial = styled(Card)`
  background-image: radial-gradient(circle at 30% 30%, #ffd166, #1f7a52);
`;

const Conic = styled(Card)`
  background-image: linear-gradient(0deg, #0e0e10 0%, #0e0e10 25%, transparent 25%),
    linear-gradient(90deg, #c8243a 0%, #c8243a 33%, transparent 33%),
    linear-gradient(180deg, #1f7a52 0%, #1f7a52 50%, transparent 50%);
  background-color: #f5f3ee;
`;

export function GradientPalette() {
  return (
    <Stack>
      <Linear>
        <Tag>linear · static</Tag>
      </Linear>
      <ThemeLinear>
        <Tag>linear · theme sentinels</Tag>
      </ThemeLinear>
      <Radial>
        <Tag>radial</Tag>
      </Radial>
      <Conic>
        <Tag>stacked · multi-layer</Tag>
      </Conic>
    </Stack>
  );
}
