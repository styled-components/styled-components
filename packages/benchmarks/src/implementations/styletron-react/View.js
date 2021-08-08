/* eslint-disable react/prop-types */
import { styled } from 'styletron-react';

const View = styled('div', ({ style }) => ({
  ...viewStyle,
  style
}));

const viewStyle = {
  alignItems: 'stretch',
  borderWidth: '0px',
  borderStyle: 'solid',
  boxSizing: 'border-box',
  display: 'flex',
  flexBasis: 'auto',
  flexDirection: 'column',
  flexShrink: '0',
  margin: '0px',
  padding: '0px',
  position: 'relative',
  // fix flexbox bugs
  minHeight: '0px',
  minWidth: '0px'
};

export default View;
