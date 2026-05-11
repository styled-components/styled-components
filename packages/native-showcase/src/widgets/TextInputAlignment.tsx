import React from 'react';
import { TextInput } from 'react-native';
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

const Field = styled(TextInput)<{ $align: 'top' | 'middle' | 'bottom' }>`
  height: 120px;
  background-color: ${t.colors.surfaceMuted};
  color: ${t.colors.fg};
  font-size: 20px;
  padding: ${t.space.sm}px;
  vertical-align: ${p => p.$align};
`;

const ROWS: ReadonlyArray<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom'];

export function TextInputAlignment() {
  return (
    <Stack>
      {ROWS.map(align => (
        <React.Fragment key={align}>
          <Tag>multiline TextInput · {align}</Tag>
          <Field $align={align} multiline defaultValue="Type here" />
        </React.Fragment>
      ))}
    </Stack>
  );
}
