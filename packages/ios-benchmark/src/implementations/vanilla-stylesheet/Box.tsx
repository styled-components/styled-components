import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

interface Props extends ViewProps {
  $color?: number;
  $layout?: 'column' | 'row';
  $outer?: boolean;
  $fixed?: boolean;
  children?: React.ReactNode;
}

const Box: React.FC<Props> = ({ $color = 0, $layout, $outer, $fixed, children, ...rest }) => (
  <View
    {...rest}
    style={[
      styles.base,
      styles[`color${$color}` as keyof typeof styles],
      $layout === 'row' && styles.row,
      $outer && styles.outer,
      $fixed && styles.fixed,
    ]}
  >
    {children}
  </View>
);

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', flexDirection: 'column' },
  row: { flexDirection: 'row' },
  outer: { padding: 4 },
  fixed: { width: 6, height: 6 },
  color0: { backgroundColor: '#14171A' },
  color1: { backgroundColor: '#AAB8C2' },
  color2: { backgroundColor: '#E6ECF0' },
  color3: { backgroundColor: '#FFAD1F' },
  color4: { backgroundColor: '#F45D22' },
  color5: { backgroundColor: '#E0245E' },
});

export default Box;
