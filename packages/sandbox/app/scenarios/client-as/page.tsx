import { Scenario } from '../ui';
import { ClientAsPair } from './pair';

export default function Page() {
  return (
    <Scenario rows="S3c, S5" title="Client B rendered as client A, B defined first" expected="blue">
      <ClientAsPair />
    </Scenario>
  );
}
