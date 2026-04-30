import React from 'react';
import styled, { ThemeProvider } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

const Grid = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.xs}px;
`;

const Cell = styled.View`
  flex: 1 1 30%;
  min-height: 80px;
  padding: ${t.space.sm}px;
  background-color: ${t.colors.bg};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  align-items: center;
  justify-content: center;
`;

const Override = styled(Cell)`
  background-color: ${t.colors.ink};
`;

const CellLabel = styled.Text`
  font-family: ${t.fontFamily.heading};
  font-size: 22px;
  color: ${t.colors.ink};
`;

const OverrideLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1.5px;
  color: ${t.colors.bg};
  text-transform: uppercase;
`;

const accentOverride = { colors: { accent: '#1f7a52', accentSoft: '#dff5e9' } };

export function ThemeSentinelGrid() {
  return (
    <Grid>
      <Cell>
        <CellLabel>1</CellLabel>
      </Cell>
      <Cell>
        <CellLabel>2</CellLabel>
      </Cell>
      <ThemeProvider theme={accentOverride}>
        <Override>
          <OverrideLabel>Override</OverrideLabel>
        </Override>
      </ThemeProvider>
      <Cell>
        <CellLabel>4</CellLabel>
      </Cell>
      <Cell>
        <CellLabel>5</CellLabel>
      </Cell>
      <Cell>
        <CellLabel>6</CellLabel>
      </Cell>
    </Grid>
  );
}
