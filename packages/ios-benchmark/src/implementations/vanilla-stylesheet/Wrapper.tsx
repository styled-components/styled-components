import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

const Wrapper: React.FC<ViewProps> = ({ children, ...rest }) => (
  <View {...rest} style={styles.wrapper}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    width: '100%',
    flex: 1,
  },
});

export default Wrapper;
