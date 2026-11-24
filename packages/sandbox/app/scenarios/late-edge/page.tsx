import { Suspense } from 'react';
import styled from 'styled-components';
import { BLUE, delay, LATE_MS, RED, Scenario } from '../ui';

export const dynamic = 'force-dynamic';

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
      rows="S20"
      title="B and A both flushed in the shell, related only by a late boundary"
      expected="blue on the late element; the shell elements keep their own color"
    >
      <B data-testid="probe-shell-b" data-expected={BLUE}>
        shell: B alone
      </B>
      <A data-testid="probe-shell-a" data-expected={RED}>
        shell: A alone
      </A>
      <Suspense fallback={<p>loading</p>}>
        <Late />
      </Suspense>
    </Scenario>
  );
}
