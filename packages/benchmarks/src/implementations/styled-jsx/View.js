/* eslint-disable react/prop-types */
import React from 'react';
import css from 'styled-jsx/css';

export const style = css`
  align-items: stretch;
  border-width: 0;
  border-style: solid;
  box-sizing: border-box;
  display: flex;
  flex-basis: auto;
  flex-direction: column;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  position: relative;
  min-height: 0;
  min-width: 0;
`;

export default props => <div {...props} />;
