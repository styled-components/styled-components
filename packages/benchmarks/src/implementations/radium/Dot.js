/* eslint-disable react/prop-types */
import Radium from 'radium';
import React from 'react';

const styles = {
  root: {
    position: 'absolute',
    cursor: 'pointer',
    width: 0,
    height: 0,
    borderColor: 'transparent',
    borderStyle: 'solid',
    borderTopWidth: 0,
    transform: 'translate(50%, 50%)',
  },
};

export default Radium(({ size, x, y, children, color }) => (
  <div
    style={[
      styles.root,
      {
        borderBottomColor: color,
        borderRightWidth: `${size / 2}px`,
        borderBottomWidth: `${size / 2}px`,
        borderLeftWidth: `${size / 2}px`,
        marginLeft: `${x}px`,
        marginTop: `${y}px`,
      },
    ]}
  >
    {children}
  </div>
));
