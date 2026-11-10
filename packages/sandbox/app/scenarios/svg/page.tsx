import styled from 'styled-components';
import { GREEN, RED, Scenario } from '../ui';

const Circle = styled.circle`
  fill: blue;

  &:first-child {
    fill: red;
  }

  & + & {
    fill: green;
  }
`;

export default function Page() {
  return (
    <Scenario
      rows="S9"
      title="Server styled SVG children with child-index and adjacent selectors"
      expected="first circle red, the others green"
    >
      <svg width="240" height="60" viewBox="0 0 240 60" role="img" aria-label="three circles">
        <Circle
          cx="30"
          cy="30"
          r="20"
          data-testid="circle-1"
          data-expected={RED}
          data-expected-property="fill"
        />
        <Circle
          cx="100"
          cy="30"
          r="20"
          data-testid="circle-2"
          data-expected={GREEN}
          data-expected-property="fill"
        />
        <Circle
          cx="170"
          cy="30"
          r="20"
          data-testid="circle-3"
          data-expected={GREEN}
          data-expected-property="fill"
        />
      </svg>
    </Scenario>
  );
}
