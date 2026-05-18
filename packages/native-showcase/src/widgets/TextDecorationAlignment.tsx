import React from 'react';
import styled from 'styled-components/native';
import { theme as t } from '@/theme/tokens';
import { Markdown } from '../components/Markdown';

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
  background-color: ${t.colors.surfaceMuted};
  color: ${t.colors.fg};
  font-size: 24px;
  text-decoration: underline ${t.colors.fail};
  vertical-align: ${p => p.$align};
`;

const ROWS: ReadonlyArray<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];

export function TextDecorationAlignment() {
  return (
    <Stack>
      <Markdown variant="hint">
        {`iOS has no platform API for vertical alignment of \`<Text>\` content in RN 0.85, so all three rows render at the top. Android and rn-web honor the keyword. The library emits a one-time development warning on iOS.`}
      </Markdown>
      {ROWS.map(align => (
        <React.Fragment key={align}>
          <Tag>vertical-align · {align}</Tag>
          <Hello $align={align}>Hello</Hello>
        </React.Fragment>
      ))}
    </Stack>
  );
}
