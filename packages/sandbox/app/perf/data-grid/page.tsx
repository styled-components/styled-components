'use client';

import React, {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import styled, { css, keyframes } from 'styled-components';
import { generateCells, patchCells, type GridCellData } from '../lib/data-generators';
import { TimerDisplay } from '../lib/timer-display';
import { useRenderTimer } from '../lib/use-render-timer';

/** Large enough that a filter + poll still taxes React + styled-components. */
const CELL_COUNT = 2000;
/** Live poll interval (ms). */
const POLL_MS = 100;
/** Cells rewritten per poll: enough churn without rebuilding the whole grid. */
const PATCH_PER_POLL = 400;

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

const GridCell = memo(function GridCell({ cell }: { cell: GridCellData }) {
  return (
    <Cell $status={cell.status} $priority={cell.priority}>
      <CellValue $status={cell.status}>{cell.value}</CellValue>
      <CellMeta>
        <PriorityBadge $priority={cell.priority}>{cell.priority[0].toUpperCase()}</PriorityBadge>
        <IntensityBar $intensity={cell.intensity} $status={cell.status} />
      </CellMeta>
    </Cell>
  );
});

export default function DataGridPage() {
  const [cells, setCells] = useState(initialCells);
  /** Sync filter: stays urgent while polls run in transitions. */
  const [filter, setFilter] = useState('');
  const [live, setLive] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { timings, markStart, clear } = useRenderTimer();
  const pollSample = useRef(0);

  /** Defer the heavy grid so filter keystrokes commit without waiting on cell work. */
  const deferredCells = useDeferredValue(cells);
  const gridPending = isPending || deferredCells !== cells;

  const poll = useCallback(() => {
    pollSample.current += 1;
    if (pollSample.current % 5 === 1) markStart('Poll patch');
    startTransition(() => {
      setCells(prev => patchCells(prev, PATCH_PER_POLL));
    });
  }, [markStart]);

  const refreshAll = useCallback(() => {
    markStart('Full refresh');
    startTransition(() => {
      setCells(generateCells(CELL_COUNT));
    });
  }, [markStart]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [live, poll]);

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return deferredCells;
    return deferredCells.filter(
      cell => cell.status.includes(q) || cell.priority.includes(q) || String(cell.value).includes(q)
    );
  }, [deferredCells, filter]);

  return (
    <PageRoot>
      <Header>
        <HeaderLeft>
          <TitleRow>
            <PageTitle>Monitoring Grid</PageTitle>
            <LiveBadge $on={live} aria-live="polite">
              <LiveDot $on={live} $pending={gridPending} />
              {live ? 'Live' : 'Paused'}
            </LiveBadge>
          </TitleRow>
          <DimLabel>
            {CELL_COUNT} cells · ~{PATCH_PER_POLL}/poll every {POLL_MS}ms (transition + deferred)
          </DimLabel>
        </HeaderLeft>
        <Controls>
          <FilterField
            type="search"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter status, priority, or value"
            aria-label="Filter cells"
          />
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
          <RefreshButton type="button" onClick={refreshAll}>
            Refresh
          </RefreshButton>
          <RefreshButton type="button" onClick={() => setLive(v => !v)} $secondary>
            {live ? 'Pause' : 'Resume'}
          </RefreshButton>
        </Controls>
      </Header>

      <TimerDisplay timings={timings} onClear={clear} />

      <Grid aria-busy={gridPending}>
        {visible.map(cell => (
          <GridCell key={cell.id} cell={cell} />
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

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: ${p => p.theme.typography.fontSize.large};
  font-family: ${p => p.theme.typography.fontFamily};
  color: ${p => p.theme.colors.text};
  font-weight: 700;
`;

const LiveBadge = styled.span<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  font-family: ${p => p.theme.typography.fontFamily};
  color: ${p => (p.$on ? p.theme.colors.success : p.theme.colors.textMuted)};
  background: ${p =>
    p.$on
      ? `color-mix(in srgb, ${p.theme.colors.success} 14%, ${p.theme.colors.surface})`
      : p.theme.colors.surface};
  border: 1px solid
    ${p =>
      p.$on
        ? `color-mix(in srgb, ${p.theme.colors.success} 35%, transparent)`
        : p.theme.colors.border};
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
`;

const livePulse = keyframes`
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
`;

const LiveDot = styled.span<{ $on: boolean; $pending: boolean }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${p => (p.$on ? p.theme.colors.success : p.theme.colors.textMuted)};
  box-shadow: ${p =>
    p.$on && p.$pending
      ? `0 0 0 3px color-mix(in srgb, ${p.theme.colors.success} 35%, transparent)`
      : '0 0 0 0 transparent'};
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease;
  animation: ${p =>
    p.$on && p.$pending
      ? css`
          ${livePulse} 0.9s ease-in-out infinite
        `
      : 'none'};
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
  flex-wrap: wrap;
`;

const FilterField = styled.input`
  min-width: 220px;
  padding: 6px 10px;
  border: 1px solid ${p => p.theme.colors.border};
  border-radius: 6px;
  background: ${p => p.theme.colors.surface};
  color: ${p => p.theme.colors.text};
  font-size: ${p => p.theme.typography.fontSize.small};
  font-family: ${p => p.theme.typography.fontFamily};
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${p => p.theme.colors.primary};
    box-shadow: 0 0 0 2px color-mix(in srgb, ${p => p.theme.colors.primary} 35%, transparent);
  }
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

const RefreshButton = styled.button<{ $secondary?: boolean }>`
  padding: ${p => p.theme.spacing.small} ${p => p.theme.spacing.medium};
  background: ${p => (p.$secondary ? p.theme.colors.surface : p.theme.colors.primary)};
  color: ${p => (p.$secondary ? p.theme.colors.text : p.theme.colors.background)};
  border: 1px solid ${p => (p.$secondary ? p.theme.colors.border : 'transparent')};
  border-radius: 6px;
  font-size: ${p => p.theme.typography.fontSize.small};
  font-family: ${p => p.theme.typography.fontFamily};
  font-weight: 600;
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    transform 0.1s ease;

  &:hover {
    opacity: 0.85;
  }

  &:active {
    opacity: 0.7;
    transform: scale(0.97);
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
