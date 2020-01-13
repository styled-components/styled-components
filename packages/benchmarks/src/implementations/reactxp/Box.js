/* eslint-disable react/prop-types */
import React from 'react';
import { Styles, View } from 'reactxp';

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

const styles = {
  outer: Styles.createViewStyle({
    alignSelf: 'flex-start',
    padding: 4
  }),
  row: Styles.createViewStyle({
    flexDirection: 'row'
  }),
  color0: Styles.createViewStyle({
    backgroundColor: '#14171A'
  }),
  color1: Styles.createViewStyle({
    backgroundColor: '#AAB8C2'
  }),
  color2: Styles.createViewStyle({
    backgroundColor: '#E6ECF0'
  }),
  color3: Styles.createViewStyle({
    backgroundColor: '#FFAD1F'
  }),
  color4: Styles.createViewStyle({
    backgroundColor: '#F45D22'
  }),
  color5: Styles.createViewStyle({
    backgroundColor: '#E0245E'
  }),
  fixed: Styles.createViewStyle({
    width: 6,
    height: 6
  })
};

export default Box;
