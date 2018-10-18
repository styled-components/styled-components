/* eslint-disable react/prop-types */
import classnames from 'classnames';
import injectSheet from 'react-jss';
import React from 'react';
import View from './View';

const Box = ({ classes, color, fixed = false, layout = 'column', outer = false, ...other }) => (
  <View
    {...other}
    className={classnames({
      [classes[`color${color}`]]: true,
      [classes.fixed]: fixed,
      [classes.row]: layout === 'row',
      [classes.outer]: outer
    })}
  />
);

const styles = {
  outer: {
    alignSelf: 'flex-start',
    padding: 4
  },
  row: {
    flexDirection: 'row'
  },
  color0: {
    backgroundColor: '#14171A'
  },
  color1: {
    backgroundColor: '#AAB8C2'
  },
  color2: {
    backgroundColor: '#E6ECF0'
  },
  color3: {
    backgroundColor: '#FFAD1F'
  },
  color4: {
    backgroundColor: '#F45D22'
  },
  color5: {
    backgroundColor: '#E0245E'
  },
  fixed: {
    width: 6,
    height: 6
  }
};

export default injectSheet(styles)(Box);
