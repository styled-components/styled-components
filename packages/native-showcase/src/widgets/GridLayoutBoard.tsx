import React, { useState } from 'react';
import styled from 'styled-components/native';
import { StateReadout } from '@/components/StateReadout';
import { theme as t } from '@/theme/tokens';

const Toolbar = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
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

const Board = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: ${t.space.xs}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  padding: ${t.space.xs}px;
`;

const Cell = styled.View<{ $cols: number; $span?: number }>`
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.ink};
  height: 56px;
  align-items: center;
  justify-content: center;
  flex-basis: ${p => {
    const span = p.$span ?? 1;
    const gapShare = ((p.$cols - 1) * 6) / p.$cols;
    const colPct = 100 / p.$cols;
    return `${span * colPct - gapShare + (span - 1) * 6}%`;
  }};
`;

const Span2 = styled(Cell)`
  background-color: ${t.colors.ink};
`;

const SpanLabel = styled.Text`
  font-family: ${t.fontFamily.monoStrong};
  font-size: ${t.fontSize.monoSm}px;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: ${t.colors.bg};
`;

const Tag = styled.Text`
  font-family: ${t.fontFamily.mono};
  font-size: ${t.fontSize.mono}px;
  color: ${t.colors.fgMuted};
`;

export function GridLayoutBoard() {
  const [cols, setCols] = useState(3);
  return (
    <>
      <Toolbar>
        {[2, 3, 4].map(n => (
          <Toggle key={n} aria-pressed={cols === n} onPress={() => setCols(n)}>
            <ToggleLabel aria-pressed={cols === n}>{`${n} cols`}</ToggleLabel>
          </Toggle>
        ))}
      </Toolbar>
      <StateReadout
        entries={[
          { key: 'flex-direction', value: 'row' },
          { key: 'flex-wrap', value: 'wrap' },
          { key: 'columns', value: `${cols} (flex-basis split)` },
          { key: 'rule', value: 'span 2 cell takes 2 column widths + gap' },
        ]}
        badge={{ tone: 'pass', label: `FLEX COLUMNS · ${cols}-UP` }}
      />
      <Board>
        <Cell $cols={cols}>
          <Tag>1</Tag>
        </Cell>
        <Span2 $cols={cols} $span={2}>
          <SpanLabel>span 2</SpanLabel>
        </Span2>
        <Cell $cols={cols}>
          <Tag>3</Tag>
        </Cell>
        <Cell $cols={cols}>
          <Tag>4</Tag>
        </Cell>
        <Cell $cols={cols}>
          <Tag>5</Tag>
        </Cell>
        <Cell $cols={cols}>
          <Tag>6</Tag>
        </Cell>
      </Board>
    </>
  );
}
