'use client';

import React, { useState } from 'react';
import styled, { css } from 'styled-components';
import { generateCells, type GridCellData } from '../lib/data-generators';
import { TimerDisplay } from '../lib/timer-display';
import { useAutoRun, useRenderTimer } from '../lib/use-render-timer';

const CELL_COUNT = 1000;

type CellStatus = GridCellData['status'];
type Priority = GridCellData['priority'];

const statusColor = (status: CellStatus, theme: any) => {
  switch (status) {
    case 'ok':
      return theme.colors.success;
    case 'warning':
      return theme.colors.warning;
    case 'critical':
      return theme.colors.danger;
    case 'inactive':
      return theme.colors.textMuted;
  }
};

const priorityBorder = (priority: Priority, theme: any) => {
  switch (priority) {
    case 'high':
      return theme.colors.danger;
    case 'medium':
      return theme.colors.warning;
    case 'low':
      return theme.colors.border;
  }
};

const initialCells = generateCells(CELL_COUNT, 42);

export default function DataGridPage() {
  const [cells, setCells] = useState(initialCells);
  const { timings, markStart, clear } = useRenderTimer();

  function handleRefresh() {
    markStart('Refresh All');
    setCells(generateCells(CELL_COUNT));
  }

  const { autoRun, start, stop } = useAutoRun(handleRefresh, 50);

  return (
    <PageRoot>
      <Header>
        <HeaderLeft>
          <PageTitle>Monitoring Grid</PageTitle>
          <DimLabel>{CELL_COUNT} cells</DimLabel>
        </HeaderLeft>
        <Controls>
          <Legend>
            <Dot $status="ok" />
            ok
            <Dot $status="warning" />
            warn
            <Dot $status="critical" />
            crit
            <Dot $status="inactive" />
            off
          </Legend>
          <RefreshButton onClick={handleRefresh}>Refresh All</RefreshButton>
        </Controls>
      </Header>

      <TimerDisplay
        timings={timings}
        onClear={clear}
        autoRun={autoRun}
        onAutoStart={start}
        onAutoStop={stop}
      />

      <Grid>
        {cells.map(cell => (
          <Cell key={cell.id} $status={cell.status} $priority={cell.priority}>
            <CellValue $status={cell.status}>{cell.value}</CellValue>
            <CellMeta>
              <PriorityBadge $priority={cell.priority}>
                {cell.priority[0].toUpperCase()}
              </PriorityBadge>
              <IntensityBar $intensity={cell.intensity} $status={cell.status} />
            </CellMeta>
          </Cell>
        ))}
      </Grid>
    </PageRoot>
  );
}

const PageRoot = styled.div`
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${p => p.theme.typography.fontSize.large};
  font-family: ${p => p.theme.typography.fontFamily};
  color: ${p => p.theme.colors.text};
  font-weight: 700;
`;

const DimLabel = styled.span`
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  font-family: ui-monospace, 'SF Mono', monospace;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Legend = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${p => p.theme.typography.fontSize.small};
  color: ${p => p.theme.colors.textMuted};
  font-family: ${p => p.theme.typography.fontFamily};
`;

const Dot = styled.span<{ $status: CellStatus }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => statusColor(p.$status, p.theme)};
`;

const RefreshButton = styled.button`
  padding: ${p => p.theme.spacing.small} ${p => p.theme.spacing.medium};
  background: ${p => p.theme.colors.primary};
  color: ${p => p.theme.colors.background};
  border: none;
  border-radius: 6px;
  font-size: ${p => p.theme.typography.fontSize.small};
  font-family: ${p => p.theme.typography.fontFamily};
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.1s;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
  }
`;

const Grid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
`;

const Cell = styled.div<{ $status: CellStatus; $priority: Priority }>`
  position: relative;
  width: 56px;
  height: 48px;
  border-radius: 4px;
  border: 1.5px solid ${p => priorityBorder(p.$priority, p.theme)};
  background: ${p => p.theme.colors.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 2px 2px;
  box-sizing: border-box;
  overflow: hidden;

  ${p =>
    p.$status === 'critical' &&
    css`
      background: color-mix(in srgb, ${p.theme.colors.danger} 12%, ${p.theme.colors.surface});
      border-color: ${p.theme.colors.danger};
    `}

  ${p =>
    p.$status === 'warning' &&
    css`
      background: color-mix(in srgb, ${p.theme.colors.warning} 10%, ${p.theme.colors.surface});
    `}

  ${p =>
    p.$status === 'inactive' &&
    css`
      opacity: 0.45;
    `}
`;

const CellValue = styled.span<{ $status: CellStatus }>`
  font-size: 12px;
  font-weight: 700;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: ${p => statusColor(p.$status, p.theme)};
  line-height: 1;
`;

const CellMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  width: 100%;
  padding: 0 3px;
  box-sizing: border-box;
`;

const PriorityBadge = styled.span<{ $priority: Priority }>`
  font-size: 9px;
  font-weight: 700;
  font-family: ui-monospace, 'SF Mono', monospace;
  color: ${p => priorityBorder(p.$priority, p.theme)};
  flex-shrink: 0;
`;

const IntensityBar = styled.div.attrs<{ $intensity: number; $status: CellStatus }>(p => ({
  style: {
    '--bar-width': Math.round(p.$intensity * 100) + '%',
  } as React.CSSProperties,
}))`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${p => p.theme.colors.border};
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--bar-width);
    background: ${p => statusColor(p.$status, p.theme)};
    border-radius: 2px;
  }
`;
