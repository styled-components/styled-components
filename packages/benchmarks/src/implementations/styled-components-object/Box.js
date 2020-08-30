import styled from 'styled-components';
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

export default styled(View)(p => ({
  alignSelf: 'flex-start',
  backgroundColor: getColor(p.color),
  flexDirection: p.layout === 'column' ? 'column' : 'row',
  height: p.fixed ? '6px' : 'auto',
  padding: p.outer ? '4px' : 0,
  width: p.fixed ? '6px' : 'auto',
}));
