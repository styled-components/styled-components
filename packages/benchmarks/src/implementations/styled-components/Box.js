import styled, { css } from 'styled-components';
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

export default styled(View).attrs(p => ({ style: { backgroundColor: getColor(p.color) } }))`
  align-self: flex-start;
  flex-direction: ${props => (props.layout === 'column' ? 'column' : 'row')};
  padding: ${props => (props.outer ? '4px' : '0')};
  ${props =>
    props.fixed &&
    css`
      height: 6px;
      width: 6px;
    `}
`;
