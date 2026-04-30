import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

const BoxStatic: React.FC<ViewProps> = ({ children, ...rest }) => (
  <View {...rest} style={styles.box}>
    {children}
  </View>
);

// No fixed dimensions — leaves render as a tiny padding-only square; container
// nodes (with nested children) expand to fit. `flex-direction: row` +
// `flex-wrap: wrap` so a deep static tree spreads 2D instead of collapsing
// into a single vertical column (RN default), matching the visual character
// of the dynamic `Box` which alternates row/column per depth.
const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
    backgroundColor: '#ffad1f',
    borderRadius: 2,
  },
});

export default BoxStatic;
