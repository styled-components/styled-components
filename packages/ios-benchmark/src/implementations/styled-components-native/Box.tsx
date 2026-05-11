import styled from 'styled-components/native';

const COLORS = ['#14171A', '#AAB8C2', '#E6ECF0', '#FFAD1F', '#F45D22', '#E0245E'];

// $fixed gates an explicit 6×6. Container Boxes (no $fixed) size to content
// — important for Tree, which nests containers around children. The
// ParentRerender case passes $fixed on every child so the 200/1000 boxes
// are individually visible; Tree only sets $fixed on leaves.
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
