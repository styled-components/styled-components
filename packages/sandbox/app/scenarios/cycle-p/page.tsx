import { A, B } from '../cycle/defs';
import { BLUE, Scenario } from '../ui';

export default function Page() {
  return (
    <Scenario
      rows="S11"
      title="Cycle, page P: B rendered as A (B is the outer)"
      expected="blue (B wins) on a full load and after client navigation from page Q"
    >
      <B as={A} data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
