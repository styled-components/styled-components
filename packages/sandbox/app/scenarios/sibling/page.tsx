import styled from 'styled-components';
import { BLUE, RED, Scenario } from '../ui';

const Item = styled.li`
  color: red;

  & + & {
    color: blue;
  }

  &:nth-child(3) {
    font-weight: 700;
  }
`;

export default function Page() {
  return (
    <Scenario
      rows="S10"
      title="Server list items with an adjacent-sibling selector on themselves"
      expected="first item red, the rest blue"
    >
      <ul>
        <Item data-testid="item-1" data-expected={RED}>
          one
        </Item>
        <Item data-testid="item-2" data-expected={BLUE}>
          two
        </Item>
        <Item data-testid="item-3" data-expected={BLUE}>
          three
        </Item>
        <Item data-testid="item-4" data-expected={BLUE}>
          four
        </Item>
      </ul>
    </Scenario>
  );
}
