/**
 * Parent Re-render Benchmark
 *
 * Measures the cost of re-rendering a parent component when its children's
 * props haven't changed. This is the most common real-world re-render
 * pattern: parent state changes (e.g., counter, form input, scroll position)
 * cascading re-renders to styled children that don't need new styles.
 *
 * Each child is a dynamic styled component with a stable color prop.
 * The parent increments a counter on each cycle, forcing React to re-render
 * the entire subtree. Libraries that memoize style computation when props
 * haven't changed will perform significantly better here.
 *
 * Children are laid out in a wrapping flex grid that fills the viewport,
 * forcing real layout work in the browser.
 */
import React from 'react';
import { BenchmarkType } from '../app/Benchmark';

interface IBox {
  color?: number;
  layout?: 'column' | 'row';
  outer?: boolean;
  fixed?: boolean;
}

interface IParentRerender {
  components: {
    Box: React.FC<IBox>;
  };
  count: number;
  childCount: number;
}

const wrapperStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignContent: 'flex-start',
  width: '100%',
  height: '100%',
};

export default function ParentRerender({ components, count, childCount }: IParentRerender) {
  const { Box } = components;

  // Parent renders with a changing `count` prop (drives the re-render).
  // All children receive STABLE props — color is determined by index only,
  // layout alternates by position, never changes between renders.
  const children = [];
  for (let i = 0; i < childCount; i++) {
    children.push(
      <Box
        key={i}
        color={i % 6}
        layout={i % 2 === 0 ? 'column' : 'row'}
        outer={i % 3 === 0}
        fixed={i % 5 === 0}
      />
    );
  }

  return (
    <div data-count={count} style={wrapperStyle}>
      {children}
    </div>
  );
}

ParentRerender.displayName = 'ParentRerender';
ParentRerender.benchmarkType = BenchmarkType.UPDATE;
