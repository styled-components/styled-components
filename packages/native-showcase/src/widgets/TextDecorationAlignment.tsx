import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Stack = styled.View`
  gap: ${t.space.sm}px;
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.fgFaint};
`;

const Hello = styled.Text<{ $align: 'top' | 'middle' | 'bottom' }>`
  height: 120px;
  background-color: #eee;
  color: black;
  font-size: 24px;
  text-decoration: underline #ff00aa;
  vertical-align: ${p => p.$align};
`;

const ROWS: ReadonlyArray<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];

export function TextDecorationAlignment() {
  return (
    <Stack>
      {ROWS.map(align => (
        <React.Fragment key={align}>
          <Tag>vertical-align · {align}</Tag>
          <Hello $align={align}>Hello</Hello>
        </React.Fragment>
      ))}
    </Stack>
  );
}
