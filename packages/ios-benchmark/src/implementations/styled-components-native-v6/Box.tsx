import styled from 'styled-components-v6/native';

const COLORS = ['#14171A', '#AAB8C2', '#E6ECF0', '#FFAD1F', '#F45D22', '#E0245E'];

const Box = styled.View<{
  $color?: number;
  $layout?: 'column' | 'row';
  $outer?: boolean;
  $fixed?: boolean;
}>`
  align-self: flex-start;
  flex-direction: ${(p) => (p.$layout === 'row' ? 'row' : 'column')};
  padding: ${(p) => (p.$outer ? '4px' : '0px')};
  background-color: ${(p) => COLORS[p.$color ?? 0]};
  ${(p) => p.$fixed && 'width: 6px; height: 6px;'}
`;

export default Box;
