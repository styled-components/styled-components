import { Suspense } from 'react';
import styled from 'styled-components';
import { BLUE, delay, LATE_MS, Scenario } from '../ui';

export const dynamic = 'force-dynamic';

// The child is defined before its parent. The parent's rule reaches the child by selector and
// no class links them, so the two tie on the child's element.
const Child = styled.div`
  color: blue;
`;

const Parent = styled.div`
  & > * {
    color: red;
  }
`;

async function LateChild() {
  await delay(LATE_MS);

  return (
    <Child data-testid="probe" data-expected={BLUE}>
      late child
    </Child>
  );
}

export default function Page() {
  return (
    <Scenario
      rows="S27"
      title="Parent with a child selector in the shell, styled child first rendered late"
      expected="blue (the child's own rule) on a streamed load"
    >
      <Parent>
        <Suspense fallback={<p>loading</p>}>
          <LateChild />
        </Suspense>
      </Parent>
    </Scenario>
  );
}
