import { Suspense } from 'react';
import styled from 'styled-components';
import { BLUE, delay, LATE_MS, Scenario } from '../ui';

export const dynamic = 'force-dynamic';

type NameProps = { 'data-n': number };

// B is defined first. A's rule reads a prop, so a late instance writes a new generated name.
const B = styled.div<NameProps>`
  & + & {
    color: blue;
  }
`;

const A = styled.div<NameProps>`
  margin-top: ${p => p['data-n']}px;

  & + & {
    color: red;
  }
`;

async function Late() {
  await delay(LATE_MS);

  return (
    <>
      <B as={A} data-n={2}>
        late: first sibling
      </B>
      <B as={A} data-n={2} data-testid="probe-late" data-expected={BLUE}>
        late: second sibling
      </B>
    </>
  );
}

export default function Page() {
  return (
    <Scenario
      rows="S8b"
      title="Adjacent siblings of B rendered as A; a late boundary mints a new name for A"
      expected="blue on both second siblings"
    >
      <div>
        <B as={A} data-n={1}>
          shell: first sibling
        </B>
        <B as={A} data-n={1} data-testid="probe-shell" data-expected={BLUE}>
          shell: second sibling
        </B>
      </div>
      <div>
        <Suspense fallback={<p>loading</p>}>
          <Late />
        </Suspense>
      </div>
    </Scenario>
  );
}
