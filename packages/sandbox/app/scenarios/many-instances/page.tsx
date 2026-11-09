import { Scenario } from '../ui';
import { COMPONENT_COUNT, components, INSTANCE_COUNT } from './components';

export default function Page() {
  return (
    <Scenario
      rows="cost: many server instances"
      title={`${INSTANCE_COUNT} server styled instances of ${COMPONENT_COUNT} components`}
      expected="measure hydration time, main-thread script time and HTML bytes; no color expectations"
    >
      <div data-testid="instances" data-count={INSTANCE_COUNT}>
        {Array.from({ length: INSTANCE_COUNT }, (_, index) => {
          const Component = components[index % COMPONENT_COUNT];

          return <Component key={index}>x</Component>;
        })}
      </div>
    </Scenario>
  );
}
