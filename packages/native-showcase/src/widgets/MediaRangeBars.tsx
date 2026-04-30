import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Bar = styled.View`
  border-radius: ${t.radius.md}px;
  padding: ${t.space.md}px;
  border: 1px solid ${t.colors.border};
  background-color: ${t.colors.surface};
`;

const Tag = styled.Text`
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: ${t.colors.accent};
  text-transform: uppercase;
`;

const Title = styled.Text`
  font-size: 16px;
  font-weight: 600;
  color: ${t.colors.fg};
  margin-top: 4px;
`;

const Sub = styled.Text`
  font-size: 13px;
  color: ${t.colors.fgMuted};
  margin-top: 2px;
`;

const Phone = styled(Bar)`
  display: flex;

  @media (width >= 600px) {
    display: none;
  }
`;

const Tablet = styled(Bar)`
  display: none;

  @media (600px <= width <= 1100px) {
    display: flex;
  }
`;

const Desktop = styled(Bar)`
  display: none;

  @media (width >= 1100px) {
    display: flex;
  }
`;

export function MediaRangeBars() {
  return (
    <>
      <Phone>
        <Tag>(width &lt; 600px)</Tag>
        <Title>Phone</Title>
        <Sub>Single column. Compact spacing.</Sub>
      </Phone>
      <Tablet>
        <Tag>(600px ≤ width ≤ 1100px)</Tag>
        <Title>Tablet</Title>
        <Sub>Mid range. Two-column comfort.</Sub>
      </Tablet>
      <Desktop>
        <Tag>(width ≥ 1100px)</Tag>
        <Title>Desktop</Title>
        <Sub>Full width. Generous gutters.</Sub>
      </Desktop>
    </>
  );
}
