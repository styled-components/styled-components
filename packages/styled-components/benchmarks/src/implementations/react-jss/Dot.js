/* eslint-disable react/prop-types */
import injectSheet from 'react-jss';
import React from 'react';

const Dot = ({ classes, children }) => <div className={classes.root}>{children}</div>;

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
    borderBottomColor: ({ color }) => color,
    borderRightWidth: ({ size }) => size / 2,
    borderBottomWidth: ({ size }) => size / 2,
    borderLeftWidth: ({ size }) => size / 2,
    marginLeft: ({ x }) => x,
    marginTop: ({ y }) => y
  }
};

export default injectSheet(styles)(Dot);
