import { BLUE, Scenario } from '../ui';
import { A, B } from './defs';

export default function Page() {
  return (
    <Scenario
      rows="S24"
      title="Layers without an up-front order: B (layer b) rendered as A (layer a)"
      expected="blue only when the layer order b after a holds; moving B after A can flip the order and development warns"
    >
      <B as={A} data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
