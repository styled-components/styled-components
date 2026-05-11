import React from 'react';
import type { BenchComponents } from './types';

interface Props {
  components: BenchComponents;
  count: number;
  childCount: number;
}

export default function ParentRerender({ components, count, childCount }: Props) {
  const { Box, Wrapper } = components;

  const children: React.ReactNode[] = [];
  for (let i = 0; i < childCount; i++) {
    // $fixed: true on every child so all `childCount` boxes are pixel-visible
    // (Box only sets explicit width/height when $fixed). Other props vary so
    // the SC compile cache still sees `childCount % (6*2*2) = 24` unique CSS
    // strings, exercising churn realistic to a list view.
    children.push(
      <Box
        key={i}
        $color={i % 6}
        $layout={i % 2 === 0 ? 'column' : 'row'}
        $outer={i % 3 === 0}
        $fixed
      />
    );
  }
  return <Wrapper>{children}</Wrapper>;
}

ParentRerender.displayName = 'ParentRerender';
