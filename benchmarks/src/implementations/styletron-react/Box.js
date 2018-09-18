/* eslint-disable react/prop-types */
import { withStyle } from 'styletron-react';
import View from './View';

const Box = withStyle(
  View,
  ({ color, fixed = false, layout = 'column', outer = false, ...other }) => ({
    ...styles[`color${color}`],
    ...(fixed && styles.fixed),
    ...(layout === 'row' && styles.row),
    ...(outer && styles.outer)
  })
);

const styles = {
  outer: {
    alignSelf: 'flex-start',
    padding: '4px'
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
    width: '6px',
    height: '6px'
  }
};

export default Box;
