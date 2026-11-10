import { BLUE, Scenario } from '../ui';
import { A, B, LayerOrder } from '../layers/defs';

export default function Page() {
  return (
    <Scenario
      rows="S24"
      title="Layers with an up-front order: B (layer b) rendered as A (layer a)"
      expected="blue (the statement fixes layer b after layer a)"
    >
      <LayerOrder />
      <B as={A} data-testid="probe" data-expected={BLUE}>
        probe
      </B>
    </Scenario>
  );
}
