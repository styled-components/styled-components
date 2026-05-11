import React, { useState } from 'react';
import styled from 'styled-components/native';
import { lightTheme, theme as t } from '@/theme/tokens';

const Toolbar = styled.View`
  flex-direction: row;
  gap: ${t.space.xs}px;
`;

const Toggle = styled.Pressable`
  padding: 5px 12px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
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
  gap: ${t.space.sm}px;
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  padding: ${t.space.xs}px;
  /* Establish a layout container so the calc(%) inside Cell resolves
     against this Board's measured width on native, not the viewport. */
  container-type: inline-size;
`;

const Cell = styled.View<{ $cols: number; $span?: number }>`
  background-color: ${t.colors.surfaceMuted};
  border: ${t.borderWidth.hairline}px solid ${t.colors.border};
  height: 56px;
  align-items: center;
  justify-content: center;
  flex-grow: 0;
  flex-shrink: 0;
  width: ${p => {
    // Each column width = (100% - (cols-1)*gap) / cols. A span of N is
    // N column widths plus (N-1) interior gaps:
    //   span * (100% - (cols-1)*gap)/cols + (span-1)*gap
    // = (span * 100%)/cols - (cols - span) * gap / cols
    // The CSS `calc(<%> - <px>)` form keeps the gap in actual pixels.
    // On rn-web the browser resolves it. On native, v7's runtime
    // resolves `%` against the nearest container's measured width
    // (Board has `container-type: inline-size`), so a span-2 cell and
    // two peers + one gap match exactly at any parent width.
    const cols = p.$cols;
    const span = p.$span ?? 1;
    // Theme-token sentinels can't be used in JS arithmetic; pull the
    // literal from `lightTheme` for the math (light/dark share spacing).
    const gap = lightTheme.space.sm;
    const widthPct = (span * 100) / cols;
    const gapPx = ((cols - span) * gap) / cols;
    return `calc(${widthPct}% - ${gapPx}px)`;
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
