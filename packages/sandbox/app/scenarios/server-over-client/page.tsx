import styled from 'styled-components';
import { ClientBase } from '../client-base';
import { BLUE, Scenario } from '../ui';

const B = styled(ClientBase)`
  color: blue;
`;

export default function Page() {
  return (
    <Scenario rows="S2" title="Server B extends a client component" expected="blue">
      <B data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
