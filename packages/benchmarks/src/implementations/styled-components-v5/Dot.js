/* eslint-disable react/prop-types */
import styled from 'styled-components-v5';
import View from './View';

const Dot = styled(View).attrs(p => ({ style: { borderBottomColor: p.color } }))`
  position: absolute;
  cursor: pointer;
  width: 0;
  height: 0;
  border-color: transparent;
  border-style: solid;
  border-top-width: 0;
  transform: translate(50%, 50%);
  margin-left: ${props => `${props.x}px`};
  margin-top: ${props => `${props.y}px`};
  border-right-width: ${props => `${props.size / 2}px`};
  border-bottom-width: ${props => `${props.size / 2}px`};
  border-left-width: ${props => `${props.size / 2}px`};
`;

export default Dot;
