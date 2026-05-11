import React from 'react';
import type { BenchComponents } from './types';

interface Props {
  components: BenchComponents;
  count: number;
  childCount: number;
}

// Static-CSS variant: every child is the same `BoxStatic` instance with NO
// per-child props. For SC v7 lite-eligible components, this exercises the
// hot zero-hooks render path on every cycle.
export default function ParentRerenderStatic({ components, childCount }: Props) {
  const { BoxStatic, Wrapper } = components;

  const children: React.ReactNode[] = [];
  for (let i = 0; i < childCount; i++) {
    children.push(<BoxStatic key={i} />);
  }
  return <Wrapper>{children}</Wrapper>;
}

ParentRerenderStatic.displayName = 'ParentRerenderStatic';
