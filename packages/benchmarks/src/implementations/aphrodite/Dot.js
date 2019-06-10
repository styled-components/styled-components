/* eslint-disable react/prop-types */
import { StyleSheet } from 'aphrodite/no-important';
import React from 'react';
import View from './View';

const dotStyles = StyleSheet.create({
  base: {
    position: 'absolute',
    cursor: 'pointer',
    width: 0,
    height: 0,
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 0,
    transform: 'translate(50%, 50%)',
  },
});

export default function Dot({ color, size, x, y, ...props }) {
  return (
    <View
      {...props}
      styles={[dotStyles.base]}
      style={{
        marginLeft: x,
        marginTop: y,
        borderBottomColor: color,
        borderRightWidth: size / 2,
        borderBottomWidth: size / 2,
        borderLeftWidth: size / 2,
      }}
    />
  );
}
