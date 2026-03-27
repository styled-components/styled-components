import { styled } from 'goober';

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

export default styled('div')`
  align-items: stretch;
  border-width: 0;
  border-style: solid;
  box-sizing: border-box;
  display: flex;
  flex-basis: auto;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  position: relative;
  min-height: 0;
  min-width: 0;
  align-self: flex-start;
  background-color: ${p => getColor(p.color)};
  flex-direction: ${p => (p.layout === 'column' ? 'column' : 'row')};
  padding: ${p => (p.outer ? '4px' : '0')};
  height: ${p => (p.fixed ? '6px' : 'auto')};
  width: ${p => (p.fixed ? '6px' : 'auto')};
`;
