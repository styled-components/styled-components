import React from 'react';
import type { BenchComponents } from './types';

interface Props {
  components: BenchComponents;
  breadth: number;
  depth: number;
  id: number;
  wrap: number;
}

export default function Tree({ components, breadth, depth, id, wrap }: Props) {
  const { Box } = components;

  let result = (
    <Box $color={id % 3} $layout={depth % 2 === 0 ? 'column' : 'row'} $outer>
      {depth === 0 && <Box $color={(id % 3) + 3} $fixed />}
      {depth !== 0 &&
        Array.from({ length: breadth }, (_, i) => (
          <Tree key={i} breadth={breadth} components={components} depth={depth - 1} id={i} wrap={wrap} />
        ))}
    </Box>
  );
  for (let i = 0; i < wrap; i++) {
    result = <Box>{result}</Box>;
  }
  return result;
}

Tree.displayName = 'Tree';
