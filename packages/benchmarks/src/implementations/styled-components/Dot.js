import styled from 'styled-components-next';
import View from './View';

export default styled(View).attrs(p => ({
  style: {
    borderBottomColor: p.color,
    marginLeft: `${p.x}px`,
    marginTop: `${p.y}px`,
    borderRightWidth: `${p.size / 2}px`,
    borderBottomWidth: `${p.size / 2}px`,
    borderLeftWidth: `${p.size / 2}px`,
  },
}))`
  position: absolute;
  cursor: pointer;
  width: 0;
  height: 0;
  border-color: transparent;
  border-style: solid;
  border-top-width: 0;
  transform: translate(50%, 50%);
`;
