import { Suspense } from 'react';
import styled from 'styled-components';
import { BLUE, delay, LATE_MS, Scenario } from '../ui';

export const dynamic = 'force-dynamic';

// B is defined before A, and B first renders in the shell.
const B = styled.div`
  color: blue;
`;

const A = styled.div`
  color: red;
`;

async function Late() {
  await delay(LATE_MS);

  return (
    <B as={A} data-testid="probe-late" data-expected={BLUE}>
      late: B rendered as A
    </B>
  );
}

export default function Page() {
  return (
    <Scenario
      rows="S7"
      title="B in the shell, A first rendered in a late boundary"
      expected="blue on both"
    >
      <B data-testid="probe-shell" data-expected={BLUE}>
        shell: B alone
      </B>
      <Suspense fallback={<p>loading</p>}>
        <Late />
      </Suspense>
    </Scenario>
  );
}
