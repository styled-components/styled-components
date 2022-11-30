import { css, styled } from 'goober';
import View from './View';

const getColor = color => {
  switch (color) {
    case 0:
      return '#14171A';
    case 1:
      return '#AAB8C2';
    case 2:
      return '#E6ECF0';
    case 3:
      return '#FFAD1F';
    case 4:
      return '#F45D22';
    case 5:
      return '#E0245E';
    default:
      return 'transparent';
  }
};

export default styled(View)`
  align-self: flex-start;
  background-color: ${p => getColor(p.color)};
  flex-direction: ${p => (p.layout === 'column' ? 'column' : 'row')};
  padding: ${p => (p.outer ? '4px' : '0')};
  ${p =>
    p.fixed &&
    css`
      height: 6px;
      width: 6px;
    `}
`;
