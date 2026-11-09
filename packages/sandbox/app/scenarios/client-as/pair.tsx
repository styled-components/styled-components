'use client';

import styled from 'styled-components';
import { BLUE } from '../ui';

// The wrapper is defined before the component it renders as, so definition order alone puts it first.
const B = styled.div`
  color: blue;
`;

const A = styled.div`
  color: red;
`;

export function ClientAsPair() {
  return (
    <B as={A} data-testid="probe" data-expected={BLUE}>
      probe
    </B>
  );
}
