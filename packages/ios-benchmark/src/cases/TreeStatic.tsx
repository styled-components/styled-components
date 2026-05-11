import React from 'react';
import type { BenchComponents } from './types';

interface Props {
  components: BenchComponents;
  breadth: number;
  depth: number;
}

// Static-CSS variant: every node is `BoxStatic`, exercising the lite render
// path on every mount when SC v7 is in use.
export default function TreeStatic({ components, breadth, depth }: Props) {
  const { BoxStatic } = components;

  if (depth === 0) return <BoxStatic />;
  return (
    <BoxStatic>
      {Array.from({ length: breadth }, (_, i) => (
        <TreeStatic key={i} components={components} breadth={breadth} depth={depth - 1} />
      ))}
    </BoxStatic>
  );
}

TreeStatic.displayName = 'TreeStatic';
