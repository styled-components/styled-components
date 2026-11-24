import styled from 'styled-components';
import { ClientBase } from '../client-base';
import { BLUE, Scenario } from '../ui';

const B = styled.div`
  color: blue;
`;

export default function Page() {
  return (
    <Scenario rows="S3a" title="Server B rendered as a client component" expected="blue">
      <B as={ClientBase} data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
