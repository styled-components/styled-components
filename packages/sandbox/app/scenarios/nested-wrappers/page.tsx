import type { ComponentProps } from 'react';
import styled from 'styled-components';
import { BLUE, Scenario } from '../ui';

/** Every prop passes through, so the probe's `data-expected` reaches the element. */
type PlainProps = ComponentProps<'div'>;

function PlainToB1(props: PlainProps) {
  return <B1 {...props} />;
}

function PlainToA(props: PlainProps) {
  return <A {...props} />;
}

// Outermost first: each wrapper is defined before what it reaches, the order definition alone gets wrong.
const B2 = styled(PlainToB1)`
  color: blue;
`;

const B1 = styled(PlainToA)`
  color: green;
`;

const A = styled.div`
  color: red;
`;

export default function Page() {
  return (
    <Scenario
      rows="S16"
      title="B2 around B1 around A through plain functions, defined outermost first"
      expected="blue (B2 wins over B1, B1 over A)"
    >
      <B2 data-testid="probe" data-expected={BLUE}>
        probe
      </B2>
    </Scenario>
  );
}
