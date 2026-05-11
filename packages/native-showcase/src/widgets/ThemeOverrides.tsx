import React from 'react';
import styled, { ThemeProvider } from 'styled-components/native';
import { theme as t } from '@/theme/tokens';

/**
 * Scoped theme overrides: one styled `Swatch`, three rows. Each row is
 * wrapped in a `ThemeProvider` with a different `accent` value, and
 * every Swatch reads `${t.colors.accent}` at render time. The same
 * component renders three distinct visuals because the override
 * deep-merges into the parent theme for the duration of its subtree.
 */

const Stack = styled.View`
  gap: ${t.space.md}px;
`;

const Row = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
`;

const RowLabel = styled.Text`
  align-self: flex-start;
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 1px;
  color: ${t.colors.fgMuted};
  text-transform: uppercase;
`;

const Swatch = styled.View`
  flex: 1;
  height: 64px;
  align-items: center;
  justify-content: center;
  padding: ${t.space.xs}px;
  background-color: ${t.colors.accent};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
`;

const SwatchLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.5px;
  color: ${t.colors.bg};
`;

interface ThemedRowProps {
  label: string;
  override?: { colors: Record<string, string> };
}

function ThemedRow({ label, override }: ThemedRowProps) {
  const swatches = (
    <Row>
      <Swatch>
        <SwatchLabel>accent</SwatchLabel>
      </Swatch>
      <Swatch>
        <SwatchLabel>accent</SwatchLabel>
      </Swatch>
      <Swatch>
        <SwatchLabel>accent</SwatchLabel>
      </Swatch>
    </Row>
  );
  return (
    <>
      <RowLabel>{label}</RowLabel>
      {override ? <ThemeProvider theme={override}>{swatches}</ThemeProvider> : swatches}
    </>
  );
}

export function ThemeOverrides() {
  return (
    <Stack>
      <ThemedRow label="default · root theme" />
      <ThemedRow
        label="forest · accent overridden in this subtree"
        override={{ colors: { accent: '#1f7a52' } }}
      />
      <ThemedRow
        label="ember · different override, same Swatch component"
        override={{ colors: { accent: '#c8243a' } }}
      />
    </Stack>
  );
}
