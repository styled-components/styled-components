import React, { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react';
import { BenchmarkType } from '../app/Benchmark';

const GRID_SIZE = 33;
const UPDATE_FREQUENCY = 0.6;

type CellState = 'idle' | 'loading' | 'success' | 'error' | 'warning';

type IConcurrentDataTable = {
  components: {
    Cell: React.FC<any>;
    Row: React.FC<any>;
    Container: React.FC<any>;
  };
  renderCount: number;
};

interface CellData {
  id: string;
  value: number;
  state: CellState;
  lastUpdated: number;
  intensity: number;
  size: 'small' | 'medium' | 'large';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const generateCellData = (row: number, col: number, renderCount: number): CellData => {
  const id = `${row}-${col}`;
  const seed = (row * GRID_SIZE + col + renderCount) % 1000;
  const shouldUpdate = seed / 1000 < UPDATE_FREQUENCY;

  if (!shouldUpdate && renderCount > 0) {
    return {
      id,
      value: (row * GRID_SIZE + col + renderCount) % 1000,
      state: 'idle',
      lastUpdated: renderCount - Math.floor((seed / 1000) * 5),
      intensity: 0.3,
      size: 'medium',
      priority: 'low',
    };
  }

  const random = ((seed * 7 + renderCount * 3) % 1000) / 1000;
  const sizeRandom = ((seed * 11 + renderCount * 5) % 1000) / 1000;
  const intensityRandom = ((seed * 13 + renderCount * 7) % 1000) / 1000;

  let state: CellState;
  let intensity: number;
  let size: 'small' | 'medium' | 'large';
  let priority: 'low' | 'medium' | 'high' | 'critical';

  if (random < 0.2) {
    state = 'loading';
    intensity = 0.8;
    size = 'medium';
    priority = 'medium';
  } else if (random < 0.35) {
    state = 'error';
    intensity = 1.0;
    size = 'large';
    priority = 'critical';
  } else if (random < 0.5) {
    state = 'warning';
    intensity = 0.7;
    size = sizeRandom > 0.5 ? 'medium' : 'large';
    priority = 'high';
  } else if (random < 0.7) {
    state = 'success';
    intensity = 0.6;
    size = 'small';
    priority = 'low';
  } else {
    state = 'idle';
    intensity = 0.3 + intensityRandom * 0.4;
    size = ['small', 'medium', 'large'][Math.floor(sizeRandom * 3)] as any;
    priority = ['low', 'medium'][Math.floor(sizeRandom * 2)] as any;
  }

  return {
    id,
    value: (seed * 17 + renderCount * 11) % 1000,
    state,
    lastUpdated: renderCount,
    intensity,
    size,
    priority,
  };
};

export default function ConcurrentDataTable({ components, renderCount = 0 }: IConcurrentDataTable) {
  const { Cell, Row, Container } = components;
  const [isPending, startAsyncTransition] = useTransition();

  const deferredRenderCount = useDeferredValue(renderCount);

  const gridData = useMemo(() => {
    const data: CellData[][] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      data[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        const countToUse = (row + col) % 3 === 0 ? deferredRenderCount : renderCount;
        data[row][col] = generateCellData(row, col, countToUse);
      }
    }

    return data;
  }, [renderCount, deferredRenderCount]);

  const themeVariant = useMemo(() => {
    return deferredRenderCount % 3 === 0
      ? 'dark'
      : deferredRenderCount % 3 === 1
        ? 'light'
        : 'contrast';
  }, [deferredRenderCount]);

  const [asyncThemeVariant, setAsyncThemeVariant] = useState(themeVariant);

  useEffect(() => {
    const newAsyncTheme = renderCount % 4 === 0 ? 'contrast' : themeVariant;

    startAsyncTransition(() => {
      setAsyncThemeVariant(newAsyncTheme);
    });
  }, [renderCount, themeVariant, asyncThemeVariant]);

  useEffect(() => {
    return () => {
      setAsyncThemeVariant('light');
    };
  }, []);

  if (!Cell || !Row || !Container) {
    return <span style={{ color: 'white' }}>No implementation available</span>;
  }

  return (
    <Container theme={asyncThemeVariant} isPending={isPending}>
      {gridData.map((rowData, rowIndex) => (
        <Row key={rowIndex} index={rowIndex} theme={asyncThemeVariant}>
          {rowData.map(cellData => (
            <Cell
              key={cellData.id}
              data={cellData}
              state={cellData.state}
              value={cellData.value}
              lastUpdated={cellData.lastUpdated}
              intensity={cellData.intensity}
              size={cellData.size}
              priority={cellData.priority}
              isPending={isPending}
              theme={asyncThemeVariant}
              className={`cell-${cellData.state}-${cellData.priority}`}
              data-testid={`cell-${cellData.id}`}
            />
          ))}
        </Row>
      ))}
    </Container>
  );
}

ConcurrentDataTable.displayName = 'ConcurrentDataTable';
ConcurrentDataTable.benchmarkType = BenchmarkType.UPDATE;
