/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet, View } from 'react-native';

const Box = ({ color, fixed = false, layout = 'column', outer = false, ...other }) => (
  <View
    {...other}
    style={[
      styles[`color${color}`],
      fixed && styles.fixed,
      layout === 'row' && styles.row,
      outer && styles.outer
    ]}
  />
);

const styles = StyleSheet.create({
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
});

export default Box;
