'use client';

import dynamic from 'next/dynamic';
import styled from 'styled-components';
import { BLUE } from '../ui';

const Outer = styled.div`
  color: blue;
`;

// Browser-only: the inner's module is first evaluated by a chunk that loads after hydration.
const LazyInner = dynamic(() => import('./inner'), { ssr: false });

export function LazyProbe() {
  return (
    <Outer as={LazyInner} data-testid="probe" data-expected={BLUE}>
      probe
    </Outer>
  );
}
