/* eslint-disable react/prop-types */
import React from 'react';
import { Styles, View } from 'reactxp';

const Dot = ({ size, x, y, children, color }) => (
  <View
    children={children}
    style={[
      styles.root,
      {
        borderBottomColor: color,
        borderRightWidth: `${size / 2}px`,
        borderBottomWidth: `${size / 2}px`,
        borderLeftWidth: `${size / 2}px`,
        marginLeft: `${x}px`,
        marginTop: `${y}px`
      }
    ]}
  />
);

const styles = {
  root: Styles.createViewStyle({
    position: 'absolute',
    cursor: 'pointer',
    width: 0,
    height: 0,
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 0,
    transform: 'translate(50%, 50%)'
  })
};

export default Dot;
