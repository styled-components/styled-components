import styled from 'styled-components';
import { BLUE, Scenario } from '../ui';

const A = styled.div`
  color: red;
`;

const B = styled(A)`
  color: blue;
`;

export default function Page() {
  return (
    <Scenario rows="S1" title="Server B extends server A" expected="blue">
      <B data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
