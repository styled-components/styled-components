import { Suspense } from 'react';
import styled from 'styled-components';
import { BLUE, delay, GREEN, LATE_MS, Scenario } from '../ui';

export const dynamic = 'force-dynamic';

const Late = styled.div`
  color: green;
`;

const Shell = styled.div`
  color: blue;
`;

async function LateContent() {
  await delay(LATE_MS);

  return (
    <Late data-testid="probe-late" data-expected={GREEN}>
      late: unrelated component
    </Late>
  );
}

export default function Page() {
  return (
    <Scenario
      rows="S8a"
      title="A component first rendered in a late boundary, unrelated to the shell"
      expected="each element its own color"
    >
      <Shell data-testid="probe-shell" data-expected={BLUE}>
        shell
      </Shell>
      <Suspense fallback={<p>loading</p>}>
        <LateContent />
      </Suspense>
    </Scenario>
  );
}
