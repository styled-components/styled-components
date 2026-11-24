import { Scenario } from '../ui';
import { LazyProbe } from './lazy';

export default function Page() {
  return (
    <Scenario
      rows="S6"
      title="Client B rendered as a lazily loaded inner (browser only)"
      expected="blue once the inner loads; no probe exists with JavaScript off"
    >
      <LazyProbe />
    </Scenario>
  );
}
