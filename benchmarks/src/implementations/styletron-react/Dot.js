/* eslint-disable react/prop-types */
import { styled } from 'styletron-react';

const Dot = styled('div', ({ size, x, y, children, color }) => ({
  ...staticStyle,
  borderBottomColor: color,
  borderRightWidth: `${size / 2}px`,
  borderBottomWidth: `${size / 2}px`,
  borderLeftWidth: `${size / 2}px`,
  marginLeft: `${x}px`,
  marginTop: `${y}px`
}));

const staticStyle = {
  position: 'absolute',
  cursor: 'pointer',
  width: 0,
  height: 0,
  borderColor: 'transparent',
  borderStyle: 'solid',
  borderTopWidth: 0,
  transform: 'translate(50%, 50%)'
};

export default Dot;
