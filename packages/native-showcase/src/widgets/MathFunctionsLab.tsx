import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Bar = styled.View`
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.sm}px;
  background-color: ${t.colors.surfaceMuted};
  flex-direction: row;
  align-items: center;
  gap: ${t.space.sm}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  color: ${t.colors.ink};
  text-transform: uppercase;
`;

const Value = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

const StaticFold = styled(Bar)`
  width: calc(120px + 80px);
  padding-top: clamp(8px, 16px, 24px);
`;

const StaticFoldClamp = styled(Bar)`
  height: max(32px, 40px);
`;

const ViewportCalc = styled(Bar)`
  width: calc(50vw + 24px);
`;

const ViewportMin = styled(Bar)`
  width: min(70vw, 360px);
`;

const ViewportClamp = styled(Bar)`
  width: clamp(160px, 80vw, 420px);
`;

const FluidType = styled.Text`
  font-family: ${t.fontFamily.heading};
  color: ${t.colors.ink};
  font-size: clamp(${t.fontSize.brief}px, 5vw, ${t.fontSize.display}px);
  letter-spacing: -0.4px;
`;

export function MathFunctionsLab() {
  return (
    <Stack>
      <StaticFold>
        <Tag>fold</Tag>
        <Value>calc(120px + 80px) → 200</Value>
      </StaticFold>
      <StaticFoldClamp>
        <Tag>fold</Tag>
        <Value>max(32px, 40px) → 40</Value>
      </StaticFoldClamp>
      <ViewportCalc>
        <Tag>runtime</Tag>
        <Value>calc(50vw + 24px)</Value>
      </ViewportCalc>
      <ViewportMin>
        <Tag>runtime</Tag>
        <Value>min(70vw, 360px)</Value>
      </ViewportMin>
      <ViewportClamp>
        <Tag>runtime</Tag>
        <Value>clamp(160px, 80vw, 420px)</Value>
      </ViewportClamp>
      <FluidType>Fluid type · clamp + theme</FluidType>
    </Stack>
  );
}
