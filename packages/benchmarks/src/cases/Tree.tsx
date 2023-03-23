import React from 'react';
import { BenchmarkType } from '../app/Benchmark';

interface IBox {
  color?: number;
  layout?: 'column' | 'row';
  outer?: boolean;
  fixed?: boolean;
}

interface ITree {
  breadth: number;
  components: {
    Box: React.FC<IBox>;
  };
  depth: number;
  id: number;
  wrap: number;
}

export default function Tree({ breadth, components, depth, id, wrap }: ITree) {
  const { Box } = components;

  let result = (
    <Box color={id % 3} layout={depth % 2 === 0 ? 'column' : 'row'} outer>
      {depth === 0 && <Box color={(id % 3) + 3} fixed />}
      {depth !== 0 &&
        Array.from({ length: breadth }).map((el, i) => (
          <Tree
            breadth={breadth}
            components={components}
            depth={depth - 1}
            id={i}
            key={i}
            wrap={wrap}
          />
        ))}
    </Box>
  );
  for (let i = 0; i < wrap; i++) {
    result = <Box>{result}</Box>;
  }
  return result;
}

Tree.displayName = 'Tree';
Tree.benchmarkType = BenchmarkType.MOUNT;
