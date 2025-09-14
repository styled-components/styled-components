import React, { useDeferredValue, useMemo, useTransition } from 'react';
import { BenchmarkType } from '../app/Benchmark';

const GRID_SIZE = 15; // 15x15 = 225 cells for intensive testing
const UPDATE_FREQUENCY = 0.6; // 60% of cells update per cycle for more visual change

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
  intensity: number; // 0-1 for visual intensity
  size: 'small' | 'medium' | 'large';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Generate realistic data updates with multiple changing properties
const generateCellData = (row: number, col: number, renderCount: number): CellData => {
  const id = `${row}-${col}`;
  const shouldUpdate = Math.random() < UPDATE_FREQUENCY;

  if (!shouldUpdate && renderCount > 0) {
    // Keep existing data for stability but still add baseline properties
    return {
      id,
      value: (row * GRID_SIZE + col + renderCount) % 1000,
      state: 'idle',
      lastUpdated: renderCount - Math.floor(Math.random() * 5),
      intensity: 0.3,
      size: 'medium',
      priority: 'low',
    };
  }

  // Create dramatic visual changes with multiple property updates
  const random = Math.random();
  let state: CellState;
  let intensity: number;
  let size: 'small' | 'medium' | 'large';
  let priority: 'low' | 'medium' | 'high' | 'critical';

  // Distribute states more evenly for visual impact
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
    size = Math.random() > 0.5 ? 'medium' : 'large';
    priority = 'high';
  } else if (random < 0.7) {
    state = 'success';
    intensity = 0.6;
    size = 'small';
    priority = 'low';
  } else {
    state = 'idle';
    intensity = 0.3 + Math.random() * 0.4; // Vary intensity even for idle
    size = ['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as any;
    priority = ['low', 'medium'][Math.floor(Math.random() * 2)] as any;
  }

  return {
    id,
    value: Math.floor(Math.random() * 1000),
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

  // Defer the render count to test interaction with deferred value API
  const deferredRenderCount = useDeferredValue(renderCount);

  // Generate grid data with mixed timing to test concurrent updates
  const gridData = useMemo(() => {
    const data: CellData[][] = [];

    for (let row = 0; row < GRID_SIZE; row++) {
      data[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        // Mix immediate and deferred values for concurrent update testing
        const countToUse = (row + col) % 3 === 0 ? deferredRenderCount : renderCount;
        data[row][col] = generateCellData(row, col, countToUse);
      }
    }

    return data;
  }, [renderCount, deferredRenderCount]);

  // Theme calculation using deferred values
  const themeVariant = useMemo(() => {
    return deferredRenderCount % 3 === 0
      ? 'dark'
      : deferredRenderCount % 3 === 1
        ? 'light'
        : 'contrast';
  }, [deferredRenderCount]);

  // Async theme switching using transition API
  const asyncThemeVariant = useMemo(() => {
    let asyncTheme = themeVariant;
    startAsyncTransition(() => {
      // Create async updates to test transition behavior
      asyncTheme = renderCount % 4 === 0 ? 'contrast' : themeVariant;
    });
    return asyncTheme;
  }, [renderCount, themeVariant, startAsyncTransition]);

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
              // Add some dynamic props for update testing
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
