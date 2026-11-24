import styled from 'styled-components';
import { BLUE, Scenario } from '../ui';

// The wrapper is defined before the component it renders as, so definition order alone puts it first.
const B = styled.div`
  color: blue;
`;

const A = styled.div`
  color: red;
`;

export default function Page() {
  return (
    <Scenario rows="S3b, S5" title="Server B rendered as server A, B defined first" expected="blue">
      <B as={A} data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
