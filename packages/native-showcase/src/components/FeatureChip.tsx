import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Label = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.5px;
  color: ${t.colors.fgFaint};
  text-transform: uppercase;
`;

export function FeatureChip({ children }: { children: string }) {
  return <Label>{children}</Label>;
}
